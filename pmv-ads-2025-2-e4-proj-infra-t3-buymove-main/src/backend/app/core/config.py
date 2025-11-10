from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List
from urllib.parse import urlparse, urlunparse

from pydantic import Field
from pydantic import SecretStr
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
SRC_DIR = BACKEND_DIR.parent
REPO_ROOT = SRC_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=tuple(
            str(path)
            for path in (
                Path(".env"),
                BACKEND_DIR / ".env",
                SRC_DIR / ".env",
                REPO_ROOT / ".env",
            )
        ),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = Field(default="buyMove API")
    environment: str = Field(default="development")
    mongodb_uri: str = Field(default="mongodb://localhost:27017", alias="MONGODB_URI")
    mongodb_db: str = Field(default="buymove", alias="MONGODB_DB")
    jwt_secret: SecretStr = Field(default=SecretStr("change-me"), alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=60 * 24, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    cors_origins: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:4173",
            "http://127.0.0.1:5173",
            "http://localhost:19006",
        ],
        alias="CORS_ORIGINS",
    )

    @model_validator(mode="before")
    @classmethod
    def _split_cors_origins(cls, values: dict) -> dict:
        raw_origins = values.get("cors_origins") or values.get("CORS_ORIGINS")
        if isinstance(raw_origins, str):
            values["cors_origins"] = [
                origin.strip()
                for origin in raw_origins.split(",")
                if origin and origin.strip()
            ]
        return values

    @model_validator(mode="after")
    def _expand_localhost_aliases(self) -> "Settings":
        expanded: list[str] = []
        seen = set()

        for origin in self.cors_origins:
            if origin not in seen:
                expanded.append(origin)
                seen.add(origin)

            parsed = urlparse(origin)
            hostname = parsed.hostname or ""

            replacements = []
            if hostname == "localhost":
                replacements.append("127.0.0.1")
            elif hostname == "127.0.0.1":
                replacements.append("localhost")

            for host in replacements:
                netloc = host
                if parsed.port:
                    netloc = f"{host}:{parsed.port}"
                if parsed.username:
                    auth = parsed.username
                    if parsed.password:
                        auth = f"{auth}:{parsed.password}"
                    netloc = f"{auth}@{netloc}"

                alternate = urlunparse(parsed._replace(netloc=netloc))
                if alternate not in seen:
                    expanded.append(alternate)
                    seen.add(alternate)

        object.__setattr__(self, "cors_origins", expanded)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
