"""Hosting provider abstraction: publish an owned website to its own isolated deployment."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


class HostingError(RuntimeError):
    pass


@dataclass
class Deployment:
    provider: str
    project: str
    url: str
    deployment_ref: str | None = None


class HostingProvider(ABC):
    name: str

    @abstractmethod
    def publish(self, project: str, files: dict[str, bytes]) -> Deployment:
        """Create the project if needed and deploy ``files`` (path -> content) to it."""

    @abstractmethod
    def unpublish(self, project: str) -> None: ...
