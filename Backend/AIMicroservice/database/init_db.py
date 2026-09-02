import logging

from database.connection import Base, engine

logger = logging.getLogger(__name__)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("AI database tables initialised.")


async def close_db() -> None:
    await engine.dispose()
    logger.info("AI database connection pool closed.")
