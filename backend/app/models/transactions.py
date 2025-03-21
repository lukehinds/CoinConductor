from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    description = Column(String)
    date = Column(DateTime)
    category_id = Column(Integer, ForeignKey("categories.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    source = Column(String)  # manual, import, api
    notes = Column(Text, nullable=True)
    external_id = Column(String, nullable=True)  # For storing external IDs like GoCardless payment IDs
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    category = relationship("Category", back_populates="transactions")
    user = relationship("User", back_populates="transactions")

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    account_type = Column(String)  # checking, savings, credit
    provider = Column(String)  # gocardless, coinconductor
    user_id = Column(Integer, ForeignKey("users.id"))
    secret_id = Column(String, nullable=True)
    secret_key = Column(String, nullable=True)
    last_synced = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="bank_accounts")