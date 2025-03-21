from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    # Database settings
    DATABASE_URL: str = "sqlite:///./data/simplefin.db"

    # JWT Settings
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"

    # AI Provider settings
    DEFAULT_AI_PROVIDER: str = "ollama"  # Supported: openai, anthropic, google, ollama

    # API Keys
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None

    # Model settings
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    ANTHROPIC_MODEL: str = "claude-3-haiku-20240307"
    GOOGLE_MODEL: str = "gemini-pro"
    OLLAMA_MODEL: str = "gemma3:1b"
    OLLAMA_HOST: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Using lru_cache to avoid loading the environment variables multiple times.
    """
    return Settings()