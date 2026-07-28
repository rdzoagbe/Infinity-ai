"""Authentication, ownership and signed-download helpers.

Identity model
--------------
Every stored record (project, file, job, sound asset) carries a ``user_id``.
Three ways a request resolves to a user:

1. A valid Supabase JWT in ``Authorization: Bearer <token>`` → ``user_id`` is the
   token's ``sub`` claim. Verified with the project's HS256 JWT secret and/or the
   project JWKS endpoint (RS256/ES256).
2. No token, auth mode ``optional`` → the ``X-Infinity-Client`` header (a random
   id the frontend persists per browser) maps to ``anon:<client-id>``. This keeps
   pre-Supabase local users working while still preventing one visitor from
   reading another's records by guessing ids. It is NOT strong auth — set
   ``INFINITY_AUTH_MODE=required`` once all beta users are on Supabase accounts.
3. Auth mode ``disabled`` → the single user ``anonymous`` (local development).

Cross-user access always yields 404 (not 403) so record ids don't act as an
existence oracle.
"""

import hashlib
import hmac
import logging
import re
import threading
import time
from dataclasses import dataclass
from functools import lru_cache

from fastapi import Depends, HTTPException, Request

from .config import get_settings

logger = logging.getLogger("infinity.auth")

_ANON_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")


@dataclass(frozen=True)
class CurrentUser:
    user_id: str
    kind: str  # 'jwt' | 'anonymous' | 'disabled'

    @property
    def is_authenticated(self) -> bool:
        return self.kind == "jwt"


def _decode_supabase_jwt(token: str) -> dict:
    import jwt as pyjwt

    settings = get_settings()
    last_error: Exception | None = None

    header = pyjwt.get_unverified_header(token)
    alg = header.get("alg", "HS256")

    if alg.startswith("HS") and settings.supabase_jwt_secret:
        try:
            return pyjwt.decode(
                token, settings.supabase_jwt_secret, algorithms=["HS256"],
                audience="authenticated", options={"verify_aud": False},
            )
        except Exception as exc:  # try JWKS next if configured
            last_error = exc

    if settings.supabase_url:
        try:
            client = _jwks_client(settings.supabase_url)
            key = client.get_signing_key_from_jwt(token).key
            return pyjwt.decode(
                token, key, algorithms=["RS256", "ES256"],
                audience="authenticated", options={"verify_aud": False},
            )
        except Exception as exc:
            last_error = exc

    raise last_error or RuntimeError("No JWT verification method configured")


@lru_cache
def _jwks_client(supabase_url: str):
    import jwt as pyjwt

    return pyjwt.PyJWKClient(f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json", lifespan=3600)


def current_user(request: Request) -> CurrentUser:
    settings = get_settings()
    mode = settings.infinity_auth_mode.lower()

    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        if token:
            try:
                claims = _decode_supabase_jwt(token)
                sub = claims.get("sub")
                if sub:
                    return CurrentUser(user_id=sub, kind="jwt")
            except Exception as exc:
                logger.warning("JWT rejected: %s", exc)
                raise HTTPException(status_code=401, detail="Invalid or expired token")

    if mode == "required":
        raise HTTPException(status_code=401, detail="Authentication required")

    if mode == "disabled":
        return CurrentUser(user_id="anonymous", kind="disabled")

    client_id = request.headers.get("x-infinity-client", "").strip()
    if client_id and _ANON_RE.match(client_id):
        return CurrentUser(user_id=f"anon:{client_id}", kind="anonymous")
    return CurrentUser(user_id="anonymous", kind="anonymous")


def owns(record: dict | None, user: CurrentUser) -> bool:
    """True when the record belongs to the user.

    Records created before user scoping (no ``user_id`` key) are only reachable
    while auth mode is 'disabled' — they are throwaway MVP data.
    """
    if record is None:
        return False
    owner = record.get("user_id")
    if owner is None:
        return get_settings().infinity_auth_mode.lower() == "disabled"
    return owner == user.user_id


# ── Signed download URLs ────────────────────────────────────────────────────

def sign_path(path: str, ttl_seconds: int | None = None) -> str:
    settings = get_settings()
    exp = int(time.time()) + (ttl_seconds or settings.infinity_download_ttl_seconds)
    sig = hmac.new(settings.signing_secret.encode(), f"{path}|{exp}".encode(), hashlib.sha256).hexdigest()[:32]
    return f"{path}?exp={exp}&sig={sig}"


def verify_signed_path(path: str, exp: str | None, sig: str | None) -> bool:
    if not exp or not sig:
        return False
    try:
        if int(exp) < time.time():
            return False
    except ValueError:
        return False
    expected = hmac.new(get_settings().signing_secret.encode(), f"{path}|{exp}".encode(), hashlib.sha256).hexdigest()[:32]
    return hmac.compare_digest(expected, sig)


# ── Simple per-user rate limiting for processing endpoints ─────────────────

_rate_lock = threading.Lock()
_rate_buckets: dict[str, list[float]] = {}


def rate_limit(user: CurrentUser = Depends(current_user)) -> CurrentUser:
    settings = get_settings()
    limit = settings.infinity_rate_limit_per_minute
    now = time.time()
    with _rate_lock:
        bucket = _rate_buckets.setdefault(user.user_id, [])
        cutoff = now - 60
        bucket[:] = [t for t in bucket if t > cutoff]
        if len(bucket) >= limit:
            raise HTTPException(status_code=429, detail="Rate limit exceeded — wait a minute and try again")
        bucket.append(now)
    return user
