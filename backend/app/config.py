import secrets
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    infinity_env: str = "development"
    infinity_storage_dir: str = "./storage"
    infinity_max_upload_mb: int = 250
    infinity_allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:4173,https://rdzoagbe.github.io"
    replicate_api_token: str = ""
    anthropic_api_key: str = ""

    # Auth. 'required'  – every request must carry a valid Supabase JWT.
    #       'optional'  – JWTs are verified when present; unauthenticated requests
    #                     fall back to a client-scoped anonymous identity (beta default,
    #                     keeps local-mode users working while still isolating records).
    #       'disabled'  – single shared anonymous user (local development only).
    infinity_auth_mode: str = "optional"
    supabase_jwt_secret: str = ""      # HS256 legacy JWT secret from Supabase settings
    supabase_url: str = ""             # enables JWKS (RS256/ES256) verification when set

    # Signed download URLs. If unset, derived from the JWT secret, or random per
    # boot (dev only — links die on restart).
    infinity_signing_secret: str = ""
    infinity_download_ttl_seconds: int = 7 * 86400

    # Limits & retention
    infinity_max_user_storage_mb: int = 2048
    infinity_rate_limit_per_minute: int = 20
    infinity_file_ttl_days: int = 30

    @property
    def storage_path(self) -> Path:
        path = Path(self.infinity_storage_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.infinity_allowed_origins.split(",") if origin.strip()]

    @property
    def signing_secret(self) -> str:
        if self.infinity_signing_secret:
            return self.infinity_signing_secret
        if self.supabase_jwt_secret:
            return "sign:" + self.supabase_jwt_secret
        return _boot_secret()

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def _boot_secret() -> str:
    return secrets.token_hex(32)


@lru_cache
def get_settings() -> Settings:
    return Settings()
