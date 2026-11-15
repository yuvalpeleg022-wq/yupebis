import itertools

from app.generation.catalog import CATEGORIES, DIRECTIONS
from app.generation.pipeline import generate
from app.generation.qc import run_qc
from app.generation.renderer import render_page
from app.generation.similarity import fingerprint, similarity
from app.generation.spec import SiteSpec
from app.models import GenerationStatus, ReviewRecord, WebsiteStatus


def test_generates_every_category_and_direction_passing_qc(db):
    for i, (c, d) in enumerate(itertools.product(CATEGORIES, DIRECTIONS)):
        job, site = generate(db, category=c, direction=d, seed=500 + i)
        assert job.status == GenerationStatus.succeeded, job.error
        assert site.status == WebsiteStatus.in_review, site.qc_report
        assert [s["step"] for s in job.steps] == list(range(1, 12))
        spec = SiteSpec.model_validate(site.spec)
        for p in spec.pages:
            html = render_page(spec, p.slug)
            assert 'name="viewport"' in html and "<script" not in html


def test_new_sites_are_never_public_before_approval(db, client):
    _, site = generate(db, seed=1)
    assert site.status == WebsiteStatus.in_review
    assert client.get("/api/websites").json()["total"] == 0
    assert client.get(f"/api/websites/{site.slug}").status_code == 404
    assert client.get(f"/api/preview/website/{site.id}/index.html").status_code == 404
    assert db.query(ReviewRecord).filter_by(website_id=site.id).one().decision.value == "pending"


def test_designs_vary_structurally_not_just_color(db):
    sites = [generate(db, category="restaurant", direction="luxury", seed=s)[1] for s in range(6)]
    structures = {tuple(x for x in s.fingerprint["structure"]) for s in sites}
    assert len(structures) >= 5


def test_duplicate_design_is_blocked_by_similarity(db):
    _, a = generate(db, category="law_firm", direction="corporate", seed=42)
    a.title = "something else"  # allow the same name to be generated again
    db.commit()
    _, b = generate(db, category="law_firm", direction="corporate", seed=42)
    assert b.status == WebsiteStatus.rejected
    review = db.query(ReviewRecord).filter_by(website_id=b.id).one()
    assert review.similarity["blocked"] and review.similarity["score"] >= 0.82


def test_qc_catches_bad_contrast(db):
    _, site = generate(db, seed=7)
    spec = SiteSpec.model_validate(site.spec)
    spec.theme.palette.text = spec.theme.palette.background
    rep = run_qc(spec)
    assert not rep.passed and any(c.name == "contrast_text" for c in rep.errors)




def test_html_escaping(db):
    _, site = generate(db, seed=9)
    spec = SiteSpec.model_validate(site.spec)
    spec.pages[0].sections[1].heading = '<script>alert("x")</script>'
    html = render_page(spec, "index")
    assert "<script>alert" not in html and "&lt;script&gt;" in html
    fp = fingerprint(spec)
    assert similarity(fp, fp) == 1.0
