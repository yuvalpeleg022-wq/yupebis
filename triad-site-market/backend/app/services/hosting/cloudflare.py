"""Cloudflare Pages hosting via the Direct Upload API (the flow Wrangler uses).

Each customer website gets its own Pages project -> its own isolated origin
(``<project>.pages.dev``), to which a custom domain can be attached later.

Flow: ensure project -> short-lived upload JWT -> upload missing assets (content-addressed
by BLAKE3) -> register hashes -> create a deployment from the path->hash manifest.
"""

from __future__ import annotations

import base64
import json
import mimetypes
from pathlib import PurePosixPath

import httpx

from app.services.hosting.base import Deployment, HostingError, HostingProvider

API = "https://api.cloudflare.com/client/v4"


def asset_hash(content: bytes, path: str) -> str:
    from blake3 import blake3

    ext = PurePosixPath(path).suffix.lstrip(".")
    return blake3(base64.b64encode(content) + ext.encode()).hexdigest()[:32]


class CloudflarePagesHosting(HostingProvider):
    name = "cloudflare"

    def __init__(self, api_token: str, account_id: str, transport: httpx.BaseTransport | None = None,
                 timeout: float = 60.0):
        if not api_token or not account_id:
            raise HostingError("Cloudflare hosting needs TRIAD_CLOUDFLARE_API_TOKEN and TRIAD_CLOUDFLARE_ACCOUNT_ID")
        self.account = account_id
        self._token = api_token
        self.http = httpx.Client(timeout=timeout, transport=transport)

    # ------------------------------------------------------------ helpers
    def _call(self, method: str, path: str, *, token: str | None = None, **kw) -> dict:
        headers = {"Authorization": f"Bearer {token or self._token}", **kw.pop("headers", {})}
        try:
            r = self.http.request(method, f"{API}{path}", headers=headers, **kw)
        except httpx.HTTPError as e:
            raise HostingError(f"cloudflare unreachable: {e}") from e
        try:
            body = r.json()
        except ValueError as e:
            raise HostingError(f"cloudflare HTTP {r.status_code}: non-JSON response") from e
        if not body.get("success"):
            raise HostingError(f"cloudflare {method} {path} failed ({r.status_code}): {body.get('errors')}")
        return body

    def _acc(self, path: str) -> str:
        return f"/accounts/{self.account}{path}"

    def _ensure_project(self, project: str) -> dict:
        try:
            return self._call("GET", self._acc(f"/pages/projects/{project}"))["result"]
        except HostingError:
            return self._call("POST", self._acc("/pages/projects"),
                              json={"name": project, "production_branch": "main"})["result"]

    # ------------------------------------------------------------ API
    def publish(self, project: str, files: dict[str, bytes]) -> Deployment:
        info = self._ensure_project(project)
        jwt = self._call("GET", self._acc(f"/pages/projects/{project}/upload-token"))["result"]["jwt"]

        manifest = {"/" + name.lstrip("/"): asset_hash(content, name) for name, content in files.items()}
        by_hash = {manifest["/" + n.lstrip("/")]: (n, c) for n, c in files.items()}
        hashes = list(by_hash)

        missing = self._call("POST", "/pages/assets/check-missing", token=jwt, json={"hashes": hashes})["result"]
        if missing:
            payload = [{
                "key": h,
                "value": base64.b64encode(by_hash[h][1]).decode(),
                "metadata": {"contentType": mimetypes.guess_type(by_hash[h][0])[0] or "application/octet-stream"},
                "base64": True,
            } for h in missing]
            self._call("POST", "/pages/assets/upload", token=jwt, json=payload)
        self._call("POST", "/pages/assets/upsert-hashes", token=jwt, json={"hashes": hashes})

        dep = self._call("POST", self._acc(f"/pages/projects/{project}/deployments"),
                         files={"manifest": (None, json.dumps(manifest)), "branch": (None, "main")})["result"]
        sub = info.get("subdomain") or f"{project}.pages.dev"
        return Deployment(self.name, project, f"https://{sub}", dep.get("id"))

    def unpublish(self, project: str) -> None:
        self._call("DELETE", self._acc(f"/pages/projects/{project}"))
