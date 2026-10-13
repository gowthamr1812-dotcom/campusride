import json
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "CampusRide"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    # Database
    DATABASE_URL: str = "sqlite:///./campusride_dev.db"
    TEST_DATABASE_URL: str = "sqlite:///./test_campusride.db"

    # Security
    JWT_SECRET: str = "dev_secret_jwt_key_campusride_2026_very_secure_string_min_32_chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # External Security APIs & Breach Auditing
    CHECK_PWNED_PASSWORDS: bool = True
    PWNED_PASSWORDS_TIMEOUT_SECONDS: float = 3.0
    SSL_VERIFY_EXTERNAL_APIS: bool = True

    # Telematics / GPS Simulator
    GPS_SIMULATION_INTERVAL_SECONDS: int = 2
    GPS_UPDATE_BATCH_SIZE: int = 20

    # AI Configuration
    AI_PROVIDER: str = "mock"
    AI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
