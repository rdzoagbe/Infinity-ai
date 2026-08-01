"""Durable storage: unit tests for RemoteStorage and a redeploy-survival flow.

A fake Supabase Storage backend (httpx.MockTransport over an in-memory dict)
stands in for the real service — the sandbox cannot reach supabase.co, and
these tests must run offline in CI anyway.
"""

import json
from pathlib import Path

import httpx
import pytest

from app import remote_storage
from app.remote_storage import RemoteStorage


class FakeBucket:
    """In-memory Supabase Storage: objects + the REST routes we use."""

    def __init__(self):
        self.objects: dict[str, bytes] = {}

    def handler(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if request.method == "POST" and path.startswith("/storage/v1/object/list/"):
            prefix = json.loads(request.content or b"{}").get("prefix", "")
            names = set()
            for key in self.objects:
                if key.startswith(prefix.rstrip("/") + "/") if prefix else True:
                    rest = key[len(prefix.rstrip("/")) + 1:] if prefix else key
                    names.add(rest.split("/")[0])
            return httpx.Response(200, json=[{"name": n} for n in sorted(names)])
        if request.method == "DELETE" and path.startswith("/storage/v1/object/"):
            for p in json.loads(request.content or b"{}").get("prefixes", []):
                self.objects.pop(p, None)
            return httpx.Response(200, json={"message": "ok"})
        if path.startswith("/storage/v1/object/"):
            key = path[len("/storage/v1/object/"):].split("/", 1)[1]
            if request.method == "POST":
                self.objects[key] = request.content
                return httpx.Response(200, json={"Key": key})
            if request.method == "GET":
                if key in self.objects:
                    return httpx.Response(200, content=self.objects[key])
                return httpx.Response(404, json={"error": "not found"})
        return httpx.Response(400, json={"error": f"unhandled {request.method} {path}"})


class FakeSettings:
    supabase_url = "https://fake-project.supabase.co"
    supabase_service_key = "service-key-for-tests"
    infinity_storage_bucket = "infinity-audio"


@pytest.fixture()
def bucket(monkeypatch):
    fake = FakeBucket()
    monkeypatch.setattr(remote_storage, "_transport_override", httpx.MockTransport(fake.handler))
    return fake


@pytest.fixture()
def remote(bucket):
    return RemoteStorage(settings=FakeSettings())


def test_disabled_without_credentials(tmp_path):
    class Empty:
        supabase_url = ""
        supabase_service_key = ""
        infinity_storage_bucket = "infinity-audio"

    r = RemoteStorage(settings=Empty())
    assert not r.enabled
    assert r.upload("a/b.wav", tmp_path / "missing.wav") is False
    assert r.download("a/b.wav", tmp_path / "out.wav") is False
    assert r.sync_workspace("f1", tmp_path) == 0


def test_upload_download_roundtrip(remote, bucket, tmp_path):
    src = tmp_path / "take.wav"
    src.write_bytes(b"RIFF-fake-audio-data")
    assert remote.upload("file_x/original/take.wav", src)
    assert "file_x/original/take.wav" in bucket.objects

    dest = tmp_path / "restored" / "take.wav"
    assert remote.download("file_x/original/take.wav", dest)
    assert dest.read_bytes() == b"RIFF-fake-audio-data"
    assert remote.download("file_x/missing.wav", tmp_path / "nope.wav") is False


def test_sync_workspace_uploads_once(remote, bucket, tmp_path):
    ws = tmp_path / "ws"
    (ws / "original").mkdir(parents=True)
    (ws / "renders").mkdir()
    (ws / "original" / "original.wav").write_bytes(b"o" * 100)
    (ws / "renders" / "mastered.wav").write_bytes(b"m" * 100)

    assert remote.sync_workspace("file_y", ws) == 2
    assert "file_y/original/original.wav" in bucket.objects
    assert "file_y/renders/mastered.wav" in bucket.objects
    # Unchanged files are not re-uploaded
    assert remote.sync_workspace("file_y", ws) == 0
    # A new render syncs incrementally
    (ws / "renders" / "mastered.mp3").write_bytes(b"3" * 50)
    assert remote.sync_workspace("file_y", ws) == 1


def test_restore_file_skips_existing(remote, bucket, tmp_path):
    bucket.objects["file_z/renders/mastered.wav"] = b"master-bytes"
    ws = tmp_path / "ws2"
    assert remote.restore_file("file_z", ws, "renders/mastered.wav")
    assert (ws / "renders" / "mastered.wav").read_bytes() == b"master-bytes"
    # Existing local file short-circuits without a network call
    bucket.objects.clear()
    assert remote.restore_file("file_z", ws, "renders/mastered.wav")


def test_delete_prefix(remote, bucket, tmp_path):
    for key in ("file_d/original/original.wav", "file_d/renders/mastered.wav", "other/original/keep.wav"):
        bucket.objects[key] = b"x"
    remote.delete_prefix("file_d")
    assert "file_d/original/original.wav" not in bucket.objects
    assert "file_d/renders/mastered.wav" not in bucket.objects
    assert "other/original/keep.wav" in bucket.objects


def test_redeploy_survival_flow(remote, bucket, tmp_path):
    """Simulate: render on host A → disk wiped → host B restores and serves."""
    # Host A: workspace with an original and a master, synced up
    ws_a = tmp_path / "hostA" / "file_r"
    (ws_a / "original").mkdir(parents=True)
    (ws_a / "renders").mkdir()
    (ws_a / "original" / "original.wav").write_bytes(b"the-artists-song")
    (ws_a / "renders" / "mastered.wav").write_bytes(b"the-finished-master")
    remote.sync_workspace("file_r", ws_a)

    # Redeploy: fresh host, empty disk
    ws_b = tmp_path / "hostB" / "file_r"
    assert not (ws_b / "renders" / "mastered.wav").exists()

    # Download request path: restore-on-miss brings the master back
    assert remote.restore_file("file_r", ws_b, "renders/mastered.wav")
    assert (ws_b / "renders" / "mastered.wav").read_bytes() == b"the-finished-master"
    # Processing path: the original comes back for re-rendering
    assert remote.restore_file("file_r", ws_b, "original/original.wav")
    assert (ws_b / "original" / "original.wav").read_bytes() == b"the-artists-song"
