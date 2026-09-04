from fastapi import APIRouter, Query

from ..services import reports as service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/overview")
def get_overview(days: int = Query(30, ge=1, le=365)):
    """Headline KPIs for the CMS dashboard."""
    return service.overview(days)


@router.get("/revenue")
def get_revenue(days: int = Query(30, ge=1, le=365)):
    """Zero-filled daily revenue series."""
    return {"days": days, "series": service.revenue_series(days)}


@router.get("/top-products")
def get_top_products(limit: int = Query(10, ge=1, le=50), days: int = Query(30, ge=1, le=365)):
    return {"days": days, "items": service.top_products(limit, days)}


@router.get("/rarity-mix")
def get_rarity_mix(days: int = Query(30, ge=1, le=365)):
    return {"days": days, "items": service.rarity_mix(days)}


@router.post("/rebuild")
def post_rebuild():
    """Recompute the daily rollup table from raw facts."""
    return service.rebuild_rollup()
