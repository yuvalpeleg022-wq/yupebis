import json

from app import showcase


def test_static_showcase_export(tmp_path, monkeypatch):
    monkeypatch.setattr(showcase, "LINEUP", showcase.LINEUP[:3])
    out = tmp_path / "site"
    assert showcase.export(str(out)) == 3
    catalog = json.loads((out / "catalog.json").read_text())
    index = (out / "index.html").read_text()
    for s in catalog:
        assert f's/{s["slug"]}.html' in index
        assert (out / "s" / f'{s["slug"]}.html').exists()
        pages = sorted(p.name for p in (out / "sites" / s["slug"]).iterdir())
        assert "index.html" in pages and "contact.html" in pages and len(pages) == s["pages"]
    assert "Demo catalog" in index and "Purchasing opens soon" in (out / "s" / f'{catalog[0]["slug"]}.html').read_text()
