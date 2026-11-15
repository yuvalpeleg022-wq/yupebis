"""Development-only helpers to simulate the payment provider. Disabled in production."""

import json
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.commerce import ensure_dev
from app.config import get_settings
from app.db import get_db
from app.models import Order, Subscription
from app.services.payments.mock import SIG_HEADER, sign_webhook

router = APIRouter(prefix="/api/dev", dependencies=[Depends(ensure_dev)])


def mock_event(type_: str, ref: str, amount_cents: int | None = None) -> tuple[bytes, dict[str, str]]:
    body = json.dumps({"id": f"evt_{secrets.token_hex(8)}", "type": type_, "ref": ref,
                       "amount_cents": amount_cents}).encode()
    return body, {SIG_HEADER: sign_webhook(get_settings().payment_webhook_secret, body),
                  "content-type": "application/json"}


@router.post("/simulate-payment/{order_id}")
def simulate_payment(order_id: str, succeed: bool = True, db: Session = Depends(get_db)):
    """Returns a signed webhook the frontend's mock checkout page posts to /api/webhooks/payments/mock."""
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404)
    body, headers = mock_event("payment.succeeded" if succeed else "payment.failed", o.provider_ref, o.amount_cents)
    return {"body": body.decode(), "headers": headers}


@router.post("/simulate-subscription/{subscription_id}")
def simulate_subscription(subscription_id: str, db: Session = Depends(get_db)):
    s = db.get(Subscription, subscription_id)
    if not s:
        raise HTTPException(404)
    body, headers = mock_event("subscription.activated", s.provider_ref)
    return {"body": body.decode(), "headers": headers}
