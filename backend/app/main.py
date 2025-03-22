from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging

from app.db.database import create_tables
from app.db.migrations import run_migrations
from app.routes import users, categories, transactions, auth, ai
from app.routes.transactions import bank_router
from app.utils.scheduler import setup_scheduler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CoinConductor API",
    description="API for CoinConductor personal budget application",
    version="0.1.0",
)

# Store scheduler instance
scheduler = None

# Configure CORS - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(categories.router, prefix="/api", tags=["Categories"])
app.include_router(transactions.router, prefix="/api", tags=["Transactions"])
app.include_router(bank_router, prefix="/api", tags=["Bank Accounts"])
app.include_router(ai.router, prefix="/api", tags=["AI"])

@app.on_event("startup")
async def startup_event():
    global scheduler
    create_tables()
    run_migrations()

    # Set up and start the scheduler
    scheduler = setup_scheduler()
    scheduler.start()
    logger.info("Started background scheduler")

@app.on_event("shutdown")
async def shutdown_event():
    global scheduler
    # Shut down the scheduler gracefully if it exists
    if scheduler:
        scheduler.shutdown()
        logger.info("Shut down background scheduler")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)