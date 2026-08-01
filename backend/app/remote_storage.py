"""Durable file storage on Supabase Storage.

The processing host's disk (Railway) is ephemeral — every redeploy wipes it.
This module makes Supabase Storage the durable store while local disk stays a
processing cache:

- after an upload or render completes, the workspace is synced up
- before processing or serving a download, missing files are restored down
- deletions remove the remote prefix as well

Activated when SUPABASE_URL and SUPABASE_SERVICE_KEY are configured; without
them every call is a cheap no-op and the app behaves exactly as before
(local-only, ephemeral). The bucket ("infinity-audio" by default) is accessed
with the service-role key — object paths are namespaced by backend file id,
which is itself owned by a user record, so ownership stays enforced by the
API layer.
"""

import json
import logging
from functools import lru_cache
from pathlib import Path

import httpx

from .config import get_settings

logger = logging.getLogger("infinity.remote_storage")

# Tests inject an httpx.MockTransport here.
_transport_override = None

_SYNC_MANIFEST = ".sync-manifest.json"


class RemoteStorage:
    def __init__(self, settings=None):
        self.settings = settings or get_settings()

    @property
    def enabled(self) -> bool:
        return bool(self.settings.supabase_url and self.settings.supabase_service_key)

    def _client(self) -> httpx.Client:
        return httpx.Client(
            base_url=f"{self.settings.supabase_url.rstrip('/')}/storage/v1",
            headers={
                "Authorization": f"Bearer {self.settings.supabase_service_key}",
                "apikey": self.settings.supabase_service_key,
            },
            timeout=120,
            transport=_transport_override,
        )

    # ── primitives ──────────────────────────────────────────────────────────

    def upload(self, remote_path: str, local_path: Path) -> bool:
        if not self.enabled:
            return False
        try:
            data = Path(local_path).read_bytes()
            with self._client() as client:
                r = client.post(
                    f"/object/{self.settings.infinity_storage_bucket}/{remote_path}",
                    content=data,
                    headers={"Content-Type": "application/octet-stream", "x-upsert": "true"},
                )
            if r.status_code in (200, 201):
                return True
            logger.warning("remote upload failed %s: %s %s", remote_path, r.status_code, r.text[:200])
            return False
        except Exception as exc:
            logger.warning("remote upload error %s: %s", remote_path, exc)
            return False

    def download(self, remote_path: str, local_path: Path) -> bool:
        if not self.enabled:
            return False
        try:
            with self._client() as client:
                r = client.get(f"/object/{self.settings.infinity_storage_bucket}/{remote_path}")
            if r.status_code != 200:
                return False
            local_path = Path(local_path)
            local_path.parent.mkdir(parents=True, exist_ok=True)
            local_path.write_bytes(r.content)
            return True
        except Exception as exc:
            logger.warning("remote download error %s: %s", remote_path, exc)
            return False

    def list_prefix(self, prefix: str) -> list[str]:
        if not self.enabled:
            return []
        names: list[str] = []
        try:
            with self._client() as client:
                r = client.post(
                    f"/object/list/{self.settings.infinity_storage_bucket}",
                    json={"prefix": prefix, "limit": 1000, "offset": 0},
                )
            if r.status_code == 200:
                for item in r.json():
                    name = item.get("name")
                    if name:
                        names.append(f"{prefix.rstrip('/')}/{name}" if prefix else name)
        except Exception as exc:
            logger.warning("remote list error %s: %s", prefix, exc)
        return names

    def delete_paths(self, paths: list[str]) -> None:
        if not self.enabled or not paths:
            return
        try:
            with self._client() as client:
                client.request(
                    "DELETE",
                    f"/object/{self.settings.infinity_storage_bucket}",
                    json={"prefixes": paths},
                )
        except Exception as exc:
            logger.warning("remote delete error: %s", exc)

    def delete_prefix(self, prefix: str) -> None:
        """Delete every object under a workspace prefix (recurses one level per folder)."""
        if not self.enabled:
            return
        paths = []
        for folder in ("", "original", "analysis", "renders", "stems", "exports"):
            sub = f"{prefix}/{folder}".rstrip("/")
            paths.extend(self.list_prefix(sub))
        self.delete_paths([p for p in paths if p])

    # ── workspace sync ──────────────────────────────────────────────────────

    def sync_workspace(self, file_id: str, workspace: Path) -> int:
        """Upload new/changed workspace files. Returns the number uploaded.

        A local manifest records size+mtime of what was already pushed so
        originals aren't re-uploaded after every render.
        """
        if not self.enabled:
            return 0
        workspace = Path(workspace)
        if not workspace.exists():
            return 0
        manifest_path = workspace / _SYNC_MANIFEST
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
        except Exception:
            manifest = {}

        uploaded = 0
        for path in workspace.rglob("*"):
            if not path.is_file() or path.name == _SYNC_MANIFEST:
                continue
            rel = path.relative_to(workspace).as_posix()
            stamp = f"{path.stat().st_size}:{int(path.stat().st_mtime)}"
            if manifest.get(rel) == stamp:
                continue
            if self.upload(f"{file_id}/{rel}", path):
                manifest[rel] = stamp
                uploaded += 1
        try:
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        except Exception:
            pass
        if uploaded:
            logger.info("synced %d file(s) for %s to durable storage", uploaded, file_id)
        return uploaded

    def restore_file(self, file_id: str, workspace: Path, rel: str) -> bool:
        """Restore one workspace file from durable storage if it is missing locally."""
        local = Path(workspace) / rel
        if local.exists():
            return True
        return self.download(f"{file_id}/{rel}", local)


@lru_cache
def get_remote() -> RemoteStorage:
    return RemoteStorage()
