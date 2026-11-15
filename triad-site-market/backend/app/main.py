import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, commerce, dev, public
from app.bootstrap import init_db
from app.config import get_settings
from app.db import engine

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db(engine)
    yield


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title="TRIAD SITE MARKET API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[s.public_base_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        resp = await call_next(request)
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        return resp

    app.include_router(public.router)
    app.include_router(commerce.router)
    app.include_router(admin.router)
    if s.env != "production":
        app.include_router(dev.router)

    if s.hosting_provider == "local":
        import os

        from fastapi.staticfiles import StaticFiles

        os.makedirs(s.local_hosting_dir, exist_ok=True)
        app.mount("/hosted", StaticFiles(directory=s.local_hosting_dir, html=True), name="hosted")

    @app.get("/healthz")
    def health():
        return {"ok": True}

    return app


app = create_app()
