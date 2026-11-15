from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    full_name: str | None = Field(default=None, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(ORM):
    id: str
    email: str
    full_name: str | None
    role: str


class WebsiteCard(ORM):
    id: str
    sku: str
    slug: str
    title: str
    tagline: str
    category: str
    design_direction: str
    price_cents: int
    currency: str
    quality_score: float
    page_count: int = 0
    listed_at: datetime | None


class WebsiteDetail(WebsiteCard):
    pages: list[dict[str, str]]
    theme: dict[str, Any]
    status: str


class AdminWebsite(WebsiteCard):
    status: str
    qc_report: dict[str, Any]
    created_at: datetime
    generation_job_id: str | None
    owner_id: str | None


class CheckoutIn(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=100)


class CheckoutOut(BaseModel):
    order_id: str
    redirect_url: str
    reserved_until: datetime
    amount_cents: int
    currency: str


class OrderOut(ORM):
    id: str
    website_id: str
    status: str
    amount_cents: int
    currency: str
    created_at: datetime
    paid_at: datetime | None


class CustomerSiteOut(ORM):
    id: str
    website_id: str
    name: str
    revision: int
    updated_at: datetime


class CustomerSiteDetail(CustomerSiteOut):
    spec: dict[str, Any]
    sku: str
    acquired_at: datetime
    license_terms_version: str


class AIEditIn(BaseModel):
    instruction: str = Field(min_length=2, max_length=4000)
    revision: int


class AIEditOut(BaseModel):
    summary: str
    operations: list[dict[str, Any]]
    site: CustomerSiteDetail
    usage: dict[str, int]


class SubscriptionOut(ORM):
    id: str
    plan: str
    status: str
    monthly_allowance: int
    current_period_end: datetime
    used_this_period: int = 0


class GenerateIn(BaseModel):
    category: str | None = None
    design_direction: str | None = None
    count: int = Field(default=1, ge=1, le=20)
    seed: int | None = None


class DecisionIn(BaseModel):
    approve: bool
    notes: str | None = Field(default=None, max_length=2000)
    price_cents: int | None = Field(default=None, ge=0)


TokenOut.model_rebuild()
