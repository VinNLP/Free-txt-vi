from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic_settings import BaseSettings


class AppEnvTypes(Enum):
    PROD: str = "prod"
    DEV: str = "dev"
    TEST: str = "test"


class BaseAppSettings(BaseSettings):
    app_env: AppEnvTypes = AppEnvTypes.DEV

    class Config:
        env_file = ".env"
        extra = "ignore"


class AppSettings(BaseAppSettings):
    debug: bool = False
    docs_url: str = "/docs"
    openapi_prefix: str = ""
    project_name: str = "Free-txt-vi"
    openapi_url: str = "/openapi.json"
    redoc_url: str = "/redoc"
    version: str = "0.0.0"
    allowed_hosts: List[str] = ["*"]

    class Config:
        validate_assignment = True

    @property
    def fastapi_kwargs(self) -> Dict[str, Any]:
        return {
            "debug": self.debug,
            "docs_url": self.docs_url,
            "openapi_prefix": self.openapi_prefix,
            "openapi_url": self.openapi_url,
            "redoc_url": self.redoc_url,
            "title": f"{self.project_name} application",
            "version": self.version,
        }


settings = AppSettings()
