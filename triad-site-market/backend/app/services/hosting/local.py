"""Development hosting: writes the static site to disk; the API serves it under /hosted/."""

from __future__ import annotations

import shutil
from pathlib import Path

from app.services.hosting.base import Deployment, HostingProvider


class LocalHosting(HostingProvider):
    name = "local"

    def __init__(self, root: str, public_api_url: str):
        self.root = Path(root)
        self.base = public_api_url.rstrip("/")

    def publish(self, project: str, files: dict[str, bytes]) -> Deployment:
        target = self.root / project
        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True)
        for name, content in files.items():
            (target / Path(name).name).write_bytes(content)
        return Deployment(self.name, project, f"{self.base}/hosted/{project}/index.html")

    def unpublish(self, project: str) -> None:
        shutil.rmtree(self.root / project, ignore_errors=True)
