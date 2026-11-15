from functools import lru_cache

from app.config import get_settings
from app.services.hosting.base import HostingProvider


@lru_cache
def get_hosting(name: str | None = None) -> HostingProvider:
    s = get_settings()
    name = name or s.hosting_provider
    if name == "cloudflare":
        from app.services.hosting.cloudflare import CloudflarePagesHosting

        return CloudflarePagesHosting(s.cloudflare_api_token or "", s.cloudflare_account_id or "")
    if name == "local":
        from app.services.hosting.local import LocalHosting

        return LocalHosting(s.local_hosting_dir, s.public_api_url)
    raise RuntimeError(f"hosting provider '{name}' is not configured")
