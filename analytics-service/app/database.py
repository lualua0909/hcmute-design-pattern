from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from .config import settings

# Aiven requires TLS; the managed cert chain is trusted at the network level,
# so verification is relaxed the same way the other services do it.
connect_args = {"ssl": {"ssl_mode": "REQUIRED"}} if settings.mysql_ssl else {}

engine = create_engine(
    settings.sqlalchemy_url,
    pool_pre_ping=True,
    pool_recycle=280,
    pool_size=5,
    max_overflow=5,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def ping() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:  # noqa: BLE001 - health probe must never raise
        return False
