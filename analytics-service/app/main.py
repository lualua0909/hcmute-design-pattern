import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import settings
from .database import ping
from .messaging import start_consumer
from .routers import reports

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("analytics")


@asynccontextmanager
async def lifespan(app: FastAPI):
    connection = None
    try:
        connection = await start_consumer()
    except Exception as exc:  # noqa: BLE001 - reporting must stay available without the broker
        log.error("rabbitmq unavailable, reports still served: %s", exc)
    yield
    if connection is not None:
        await connection.close()


app = FastAPI(
    title="PokeShop Analytics Service",
    description="Statistics and reporting for the PokeShop microservices project.",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(reports.router)


@app.get("/health", tags=["ops"])
def health():
    mysql_up = ping()
    return {
        "service": settings.service_name,
        "status": "ok" if mysql_up else "degraded",
        "mysql": "up" if mysql_up else "down",
    }
