from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. All secrets come from the environment, never from code."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="TRIAD_", extra="ignore")

    env: str = "development"
    database_url: str = "sqlite:///./triad_dev.db"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-only-change-me-not-for-production-use"
    jwt_ttl_minutes: int = 60 * 24

    # Marketplace
    reservation_minutes: int = 15
    default_currency: str = "ILS"
    similarity_threshold: float = 0.82

    # AI
    ai_mode: str = "mock"  # mock | live
    claude_model: str = "claude-opus-5-5"
    claude_effort: str = "high"
    lmstudio_base_url: str = "http://localhost:1234/v1"
    lmstudio_model: str = "local-model"
    ai_request_timeout_s: float = 120.0
    # Google Gemini (optional). Key is read from the environment only: TRIAD_GEMINI_API_KEY
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"

    # Payments
    payment_provider: str = "mock"
    payment_webhook_secret: str = "dev-webhook-secret"
    public_base_url: str = "http://localhost:3000"

    # Subscription
    ai_plan_monthly_edits: int = 200


@lru_cache
def get_settings() -> Settings:
    return Settings()
