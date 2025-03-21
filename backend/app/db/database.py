from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path

# Create database directory if it doesn't exist
db_dir = Path(__file__).parent.parent.parent / "data"
db_dir.mkdir(exist_ok=True)

# Database URL
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_dir}/coinconductor.db"

# Create SQLAlchemy engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

def get_db():
    """
    Dependency for getting DB session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """
    Create all tables in the database
    """
    from app.models import users, categories, transactions
    Base.metadata.create_all(bind=engine)