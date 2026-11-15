import base64
import json

import httpx

from app.services.hosting.cloudflare import CloudflarePagesHosting, asset_hash
from app.services.hosting.registry import get_hosting
from tests.conftest import auth, listed_site, make_user
from tests.test_marketplace import pay


def test_cloudflare_pages_direct_upload_flow():
    calls = []
    files = {"index.html": b"<h1>hi</h1>", "contact.html": b"<h1>contact</h1>"}

    def handler(req: httpx.Request):
        path = req.url.path.replace("/client/v4", "")
        auth_h = req.headers["authorization"]
        calls.append((req.method, path))
        ok = lambda result: httpx.Response(200, json={"success": True, "errors": [], "result": result})  # noqa: E731
        if req.method == "GET" and path == "/accounts/acc/pages/projects/triad-x":
            return httpx.Response(404, json={"success": False, "errors": [{"code": 8000007}]})
        if req.method == "POST" and path == "/accounts/acc/pages/projects":
            assert json.loads(req.content) == {"name": "triad-x", "production_branch": "main"}
            return ok({"name": "triad-x", "subdomain": "triad-x.pages.dev"})
        if path.endswith("/upload-token"):
            assert auth_h == "Bearer api-token"
            return ok({"jwt": "upload-jwt"})
        if path == "/pages/assets/check-missing":
            assert auth_h == "Bearer upload-jwt"  # asset endpoints use the upload JWT, not the API token
            hashes = json.loads(req.content)["hashes"]
            return ok(hashes[:1])
        if path == "/pages/assets/upload":
            assert auth_h == "Bearer upload-jwt"
            body = json.loads(req.content)
            assert len(body) == 1 and body[0]["base64"] and body[0]["metadata"]["contentType"] == "text/html"
            assert base64.b64decode(body[0]["value"]) in files.values()
            return ok(None)
        if path == "/pages/assets/upsert-hashes":
            assert len(json.loads(req.content)["hashes"]) == 2
            return ok(None)
        if path == "/accounts/acc/pages/projects/triad-x/deployments":
            assert auth_h == "Bearer api-token" and b'name="manifest"' in req.content
            assert asset_hash(files["index.html"], "index.html").encode() in req.content
            return ok({"id": "dep_1"})
        raise AssertionError(f"unexpected call {req.method} {path}")

    h = CloudflarePagesHosting("api-token", "acc", transport=httpx.MockTransport(handler))
    dep = h.publish("triad-x", files)
    assert dep.url == "https://triad-x.pages.dev" and dep.deployment_ref == "dep_1"
    assert [c[1].split("/")[-1] for c in calls] == [
        "triad-x", "projects", "upload-token", "check-missing", "upload", "upsert-hashes", "deployments"]


def test_asset_hash_is_stable_and_extension_sensitive():
    assert len(asset_hash(b"x", "a.html")) == 32
    assert asset_hash(b"x", "a.html") == asset_hash(b"x", "b.html") != asset_hash(b"x", "a.css")


def test_owner_can_publish_and_strangers_cannot(db, client, tmp_path, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "local_hosting_dir", str(tmp_path))
    get_hosting.cache_clear()
    site = listed_site(db)
    buyer = make_user(db)
    oid = client.post(f"/api/websites/{site.id}/checkout", json={"idempotency_key": "pub-0000001"},
                      headers=auth(buyer)).json()["order_id"]
    pay(client, oid)
    sid = client.get("/api/me/sites", headers=auth(buyer)).json()[0]["id"]
    assert client.post(f"/api/me/sites/{sid}/publish", headers=auth(make_user(db))).status_code == 404
    r = client.post(f"/api/me/sites/{sid}/publish", headers=auth(buyer))
    assert r.status_code == 200, r.text
    assert r.json()["url"].endswith(f"/hosted/triad-{site.sku.lower()}/index.html")
    assert (tmp_path / f"triad-{site.sku.lower()}" / "index.html").read_text().startswith("<!doctype html>")
    assert len(client.get(f"/api/me/sites/{sid}/deployments", headers=auth(buyer)).json()) == 1
    get_hosting.cache_clear()
