from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application settings
    app_name: str = "OneMonth.dev API"
    environment: str = Field("development", env="ENVIRONMENT")
    debug: bool = True
    secret_key: str = Field(..., env="SECRET_KEY")
    algorithm: str = Field("HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(60 * 24 * 7, env="ACCESS_TOKEN_EXPIRE_MINUTES")  # 7 days
    
    # Supabase
    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_anon_key: str = Field(..., env="SUPABASE_ANON_KEY")
    supabase_service_key: str = Field(..., env="SUPABASE_SERVICE_KEY")
    supabase_jwt_secret: Optional[str] = Field(None, env="SUPABASE_JWT_SECRET")
    
    # API Keys
    openrouter_api_key: str = Field(..., env="OPENROUTER_API_KEY")
    perplexity_api_key: Optional[str] = Field(None, env="PERPLEXITY_API_KEY")
    firecrawl_api_key: Optional[str] = Field(None, env="FIRECRAWL_API_KEY")
    exa_api_key: Optional[str] = Field(None, env="EXA_API_KEY")
    wolfram_alpha_app_id: Optional[str] = Field(None, env="WOLFRAM_ALPHA_APP_ID")
    
    # Email
    resend_api_key: Optional[str] = Field(None, env="RESEND_API_KEY")
    resend_from_email: str = Field("noreply@onemonth.dev", env="RESEND_FROM_EMAIL")
    
    # Redis
    redis_url: str = Field("redis://localhost:6379", env="REDIS_URL")
    
    # Frontend
    frontend_url: str = Field("http://localhost:5173", env="FRONTEND_URL")
    
    # Vector DB (Qdrant)
    qdrant_url: str = Field("http://localhost:6333", env="QDRANT_URL")
    qdrant_api_key: Optional[str] = Field(None, env="QDRANT_API_KEY")
    
    # Search
    typesense_api_key: Optional[str] = Field(None, env="TYPESENSE_API_KEY")
    typesense_host: str = Field("localhost", env="TYPESENSE_HOST")
    typesense_port: str = Field("8108", env="TYPESENSE_PORT")
    typesense_protocol: str = Field("http", env="TYPESENSE_PROTOCOL")
    
    # Analytics
    posthog_api_key: Optional[str] = Field(None, env="POSTHOG_API_KEY")
    posthog_host: str = Field("https://app.posthog.com", env="POSTHOG_HOST")
    
    # Monitoring
    sentry_dsn: Optional[str] = Field(None, env="SENTRY_DSN")
    
    # Payments
    polar_access_token: Optional[str] = Field(None, env="POLAR_ACCESS_TOKEN")
    polar_webhook_secret: Optional[str] = Field(None, env="POLAR_WEBHOOK_SECRET")
    
    # LLM Providers
    gemini_api_key: Optional[str] = Field(None, env="GEMINI_API_KEY")
    
    # CORS
    cors_origins: str = Field("http://localhost:5173,http://localhost:3000", env="CORS_ORIGINS")
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings() 