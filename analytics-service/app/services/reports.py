"""Read-side queries over ana_sales_facts and ana_daily_rollup."""

from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import text

from ..database import SessionLocal


def _num(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def record_order(order_id: str, user_id: str, items: list[dict], occurred_at: datetime | None = None) -> int:
    """Idempotently write one fact row per order line and refresh the daily rollup."""
    occurred = occurred_at or datetime.utcnow()
    written = 0

    with SessionLocal() as session:
        for item in items:
            quantity = int(item["quantity"])
            unit_price = float(item["unitPrice"])
            result = session.execute(
                text(
                    """
                    INSERT IGNORE INTO ana_sales_facts
                        (order_id, user_id, product_id, sku, quantity, unit_price, line_total, occurred_at)
                    VALUES (:order_id, :user_id, :product_id, :sku, :quantity, :unit_price, :line_total, :occurred_at)
                    """
                ),
                {
                    "order_id": order_id,
                    "user_id": user_id,
                    "product_id": int(item["productId"]),
                    "sku": item["sku"],
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "line_total": round(unit_price * quantity, 2),
                    "occurred_at": occurred,
                },
            )
            written += result.rowcount or 0

        if written:
            session.execute(
                text(
                    """
                    INSERT INTO ana_daily_rollup (day, orders_count, items_sold, revenue)
                    SELECT DATE(:day), 1, :items, :revenue
                    ON DUPLICATE KEY UPDATE
                        orders_count = orders_count + 1,
                        items_sold   = items_sold + VALUES(items_sold),
                        revenue      = revenue + VALUES(revenue)
                    """
                ),
                {
                    "day": occurred.date(),
                    "items": sum(int(i["quantity"]) for i in items),
                    "revenue": round(sum(float(i["unitPrice"]) * int(i["quantity"]) for i in items), 2),
                },
            )
        session.commit()

    return written


def remove_order(order_id: str) -> int:
    """Compensation: drop the facts of a cancelled order."""
    with SessionLocal() as session:
        result = session.execute(
            text("DELETE FROM ana_sales_facts WHERE order_id = :order_id"), {"order_id": order_id}
        )
        session.commit()
        return result.rowcount or 0


def overview(days: int = 30) -> dict:
    since = date.today() - timedelta(days=days)
    with SessionLocal() as session:
        totals = session.execute(
            text(
                """
                SELECT COUNT(DISTINCT order_id) AS orders,
                       COALESCE(SUM(quantity), 0) AS items,
                       COALESCE(SUM(line_total), 0) AS revenue,
                       COUNT(DISTINCT user_id) AS customers
                  FROM ana_sales_facts
                 WHERE occurred_at >= :since
                """
            ),
            {"since": since},
        ).mappings().one()

        catalog = session.execute(
            text(
                """
                SELECT COUNT(*) AS products,
                       COALESCE(SUM(s.on_hand - s.reserved), 0) AS units_available,
                       SUM(CASE WHEN (s.on_hand - s.reserved) <= 5 THEN 1 ELSE 0 END) AS low_stock
                  FROM cat_products p
                  LEFT JOIN inv_stock s ON s.product_id = p.id
                 WHERE p.status = 'published'
                """
            )
        ).mappings().one()

        pending = session.execute(
            text("SELECT COUNT(*) AS c FROM cat_orders WHERE status IN ('pending','reserved')")
        ).scalar_one()

    orders = int(totals["orders"] or 0)
    revenue = _num(totals["revenue"])
    return {
        "windowDays": days,
        "orders": orders,
        "itemsSold": int(totals["items"] or 0),
        "revenue": round(revenue, 2),
        "customers": int(totals["customers"] or 0),
        "averageOrderValue": round(revenue / orders, 2) if orders else 0.0,
        "publishedProducts": int(catalog["products"] or 0),
        "unitsAvailable": int(catalog["units_available"] or 0),
        "lowStockProducts": int(catalog["low_stock"] or 0),
        "ordersInFlight": int(pending or 0),
    }


def revenue_series(days: int = 30) -> list[dict]:
    """Dense daily series - missing days are zero-filled for charting."""
    since = date.today() - timedelta(days=days - 1)
    with SessionLocal() as session:
        rows = session.execute(
            text(
                """
                SELECT DATE(occurred_at) AS day,
                       COUNT(DISTINCT order_id) AS orders,
                       COALESCE(SUM(line_total), 0) AS revenue
                  FROM ana_sales_facts
                 WHERE occurred_at >= :since
                 GROUP BY DATE(occurred_at)
                """
            ),
            {"since": since},
        ).mappings().all()

    by_day = {str(r["day"]): r for r in rows}
    series = []
    for offset in range(days):
        day = str(since + timedelta(days=offset))
        row = by_day.get(day)
        series.append({
            "day": day,
            "orders": int(row["orders"]) if row else 0,
            "revenue": round(_num(row["revenue"]), 2) if row else 0.0,
        })
    return series


def top_products(limit: int = 10, days: int = 30) -> list[dict]:
    since = date.today() - timedelta(days=days)
    with SessionLocal() as session:
        rows = session.execute(
            text(
                """
                SELECT f.product_id, f.sku, p.name, p.rarity,
                       SUM(f.quantity) AS units, SUM(f.line_total) AS revenue
                  FROM ana_sales_facts f
                  LEFT JOIN cat_products p ON p.id = f.product_id
                 WHERE f.occurred_at >= :since
                 GROUP BY f.product_id, f.sku, p.name, p.rarity
                 ORDER BY revenue DESC
                 LIMIT :limit
                """
            ),
            {"since": since, "limit": limit},
        ).mappings().all()

    return [
        {
            "productId": r["product_id"],
            "sku": r["sku"],
            "name": r["name"] or r["sku"],
            "rarity": r["rarity"],
            "units": int(r["units"] or 0),
            "revenue": round(_num(r["revenue"]), 2),
        }
        for r in rows
    ]


def rarity_mix(days: int = 30) -> list[dict]:
    since = date.today() - timedelta(days=days)
    with SessionLocal() as session:
        rows = session.execute(
            text(
                """
                SELECT COALESCE(p.rarity, 'unknown') AS rarity,
                       SUM(f.quantity) AS units,
                       SUM(f.line_total) AS revenue
                  FROM ana_sales_facts f
                  LEFT JOIN cat_products p ON p.id = f.product_id
                 WHERE f.occurred_at >= :since
                 GROUP BY COALESCE(p.rarity, 'unknown')
                 ORDER BY revenue DESC
                """
            ),
            {"since": since},
        ).mappings().all()

    return [
        {"rarity": r["rarity"], "units": int(r["units"] or 0), "revenue": round(_num(r["revenue"]), 2)}
        for r in rows
    ]


def rebuild_rollup() -> dict:
    """Recompute ana_daily_rollup from the fact table (repair job)."""
    with SessionLocal() as session:
        session.execute(text("DELETE FROM ana_daily_rollup"))
        result = session.execute(
            text(
                """
                INSERT INTO ana_daily_rollup (day, orders_count, items_sold, revenue)
                SELECT DATE(occurred_at), COUNT(DISTINCT order_id), SUM(quantity), SUM(line_total)
                  FROM ana_sales_facts
                 GROUP BY DATE(occurred_at)
                """
            )
        )
        session.commit()
        return {"ok": True, "daysRebuilt": result.rowcount or 0}
