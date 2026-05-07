from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    infinity_env: str = "development"
    infinity_storage_dir: str = "./storage"
    infinity_max_upload_mb: int = 250
    infinity_allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:4173,https://rdzoagbe.github.io"

    @property
    def storage_path(self) -> Path:
        path = Path(self.infinity_storage_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.infinity_allowed_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()