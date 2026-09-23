from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central application configuration.

    Values are loaded from environment variables / .env.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "AI Interview Platform"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = True

    # Server
    host: str = "127.0.0.1"
    port: int = 8001

    # Firebase
    firebase_service_account_path: str = ""
    firebase_service_account_json: str = ""

    # CORS
    cors_origins: str = "http://localhost:5173"

    # Upload limits
    max_resume_size_mb: int = 10

    @property
    def cors_origin_list(self) -> list[str]:
        """Convert comma-separated CORS origins into a list."""

        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    """
    Cache settings so the configuration is created only once.
    """

    return Settings()


settings = get_settings()
