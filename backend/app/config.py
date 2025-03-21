from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    # Database settings
    DATABASE_URL: str = "sqlite:///./app.db"
    
    # AI Provider settings
    DEFAULT_AI_PROVIDER: str = "openai"  # Supported: openai, anthropic, google, ollama
    
    # API Keys
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    
    # Model settings
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    ANTHROPIC_MODEL: str = "claude-3-haiku-20240307"
    GOOGLE_MODEL: str = "gemini-pro"
    OLLAMA_MODEL: str = "llama3"
    
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