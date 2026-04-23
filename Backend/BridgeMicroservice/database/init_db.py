import logging

from database.connection import Base, engine

logger = logging.getLogger(__name__)


async def init_db() -> None:
    """Create all tables if they don't exist yet."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Bridge database tables initialised.")


async def close_db() -> None:
    """Dispose of the connection pool."""
    await engine.dispose()
    logger.info("Bridge database connection pool closed.")
