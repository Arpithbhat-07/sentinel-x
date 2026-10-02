import os
from typing import List

class Settings:
    PROJECT_NAME: str = "SENTINEL-X"
    PROJECT_DESCRIPTION: str = "Multi-Domain Decision Training Platform for Degraded Communication Environments"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    # Render and PostgreSQL URL normalization (postgres:// -> postgresql://)
    raw_db_url: str = os.getenv("DATABASE_URL", "sqlite:///./sentinel_x.db")
    if raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
    DATABASE_URL: str = raw_db_url
    
    # AI Provider configuration
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "mock")  # "gemini", "openai", or "mock"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    
    # CORS Origins resolution
    @property
    def cors_origins(self) -> List[str]:
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000"
        ]
        custom_origins = os.getenv("CORS_ORIGINS", "")
        if custom_origins:
            for item in custom_origins.split(","):
                cleaned = item.strip()
                if cleaned and cleaned not in origins:
                    origins.append(cleaned)
                    
        frontend_url = os.getenv("FRONTEND_URL", "")
        if frontend_url:
            cleaned = frontend_url.strip().rstrip("/")
            if cleaned and cleaned not in origins:
                origins.append(cleaned)
                
        return origins
    
    # Demonstration defaults
    DEMO_MODE_DEFAULT_CODE: str = "SNTL-4821"

settings = Settings()
