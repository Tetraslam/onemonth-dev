from typing import Any, List, Optional

from pydantic import Field, field_validator
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
    supabase_cron_secret: Optional[str] = Field(None, env="SUPABASE_CRON_SECRET")
    
    # API Keys
    openrouter_api_key: Optional[str] = Field(None, env="OPENROUTER_API_KEY")
    perplexity_api_key: Optional[str] = Field(None, env="PERPLEXITY_API_KEY")
    firecrawl_api_key: Optional[str] = Field(None, env="FIRECRAWL_API_KEY")
    exa_api_key: Optional[str] = Field(None, env="EXA_API_KEY")
    wolfram_alpha_app_id: Optional[str] = Field(None, env="WOLFRAM_ALPHA_APP_ID")
    
    # Email
    resend_api_key: Optional[str] = Field(None, env="RESEND_API_KEY")
    resend_from_email: str = Field("noreply@onemonth.dev", env="RESEND_FROM_EMAIL")
    
    # Redis
    redis_url: str = Field("redis://localhost:6379/0", env="REDIS_URL")
    
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
    polar_product_id: Optional[str] = Field(None, env="POLAR_PRODUCT_ID")
    
    # LLM Providers
    gemini_api_key: Optional[str] = Field(None, env="GEMINI_API_KEY")
    
    # CORS - store as string from env, parse into list
    cors_origins_env_str: str = Field("https://onemonth.dev,http://localhost:5173,http://127.0.0.1:5173", alias="CORS_ORIGINS")
    cors_origins_list: List[str] = []

    @field_validator("cors_origins_list", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any, values) -> List[str]:
        # Access the aliased field correctly from values.data
        cors_str = values.data.get('cors_origins_env_str') # Use the new name here
        if isinstance(cors_str, str):
            return [origin.strip() for origin in cors_str.split(",") if origin.strip()]
        # Fallback if cors_origins_env_str wasn't in .env or was invalid type
        # This uses the default value of cors_origins_env_str if it was not overridden by env
        default_cors_str = cls.model_fields['cors_origins_env_str'].default
        if isinstance(default_cors_str, str):
             return [origin.strip() for origin in default_cors_str.split(",") if origin.strip()]
        return ["http://localhost:5173", "http://127.0.0.1:5173"] # Absolute fallback

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore",
        populate_by_name=True # Important for alias to work with environment variables
    )


settings = Settings() 