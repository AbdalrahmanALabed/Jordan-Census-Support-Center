"""JCOCC Application Configuration."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    secret_key: str = "dev-secret-key-change-in-production"
    database_url: str = "sqlite:///./jcocc.db"
    debug: bool = True
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    app_name: str = "Jordan Census Operations Control Center"
    app_name_ar: str = "مركز عمليات التعداد الوطني"
    default_locale: str = "ar"
    access_token_expire_minutes: int = 480
    algorithm: str = "HS256"


@lru_cache
def get_settings() -> Settings:
    return Settings()
