import asyncio
from typing import Callable

from fastapi import FastAPI
from loguru import logger
from starlette.middleware.cors import CORSMiddleware
import uvicorn

from core.settings import settings
from tools.uts_scheduler import scheduler
from internal.handler.free_txt import FreeTxtHandler
from internal.controller.free_txt import FreeTxtController
from internal.routes.free_txt import FreeTxtRoute


class App:
    application: FastAPI

    def on_init_app(self) -> Callable:
        async def start_app() -> None:
            # Controller
            free_txt_controller = FreeTxtController()

            free_txt_handler = FreeTxtHandler(free_txt_controller)

            free_txt_router = FreeTxtRoute(free_txt_handler)

            prefix = "/api/v1"
            self.application.include_router(
                free_txt_router.router, prefix=prefix + "/free_txt", tags=["Free-txt"]
            )

            scheduler.start()

        return start_app

    def on_terminate_app(self) -> Callable:
        @logger.catch
        async def stop_app() -> None:
            pass

        return stop_app

    def __init__(self):
        self.application = FastAPI(**settings.fastapi_kwargs)
        self.application.add_middleware(
            CORSMiddleware,
            allow_origins=settings.allowed_hosts,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        self.application.add_event_handler("startup", self.on_init_app())
        self.application.add_event_handler("shutdown", self.on_terminate_app())


app = App().application

if __name__ == "__main__":
    uvicorn.run("runner.main:app", host="0.0.0.0", port=8080, reload=True)
