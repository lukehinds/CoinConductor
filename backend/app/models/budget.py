from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class BudgetPeriod(Base):
    __tablename__ = "budget_periods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)  # e.g., "March 2025"
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    total_income = Column(Float, default=0.0)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="budget_periods")
    allocations = relationship("EnvelopeAllocation", back_populates="budget_period", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="budget_period")

class EnvelopeAllocation(Base):
    __tablename__ = "envelope_allocations"

    id = Column(Integer, primary_key=True, index=True)
    allocated_amount = Column(Float, default=0.0)
    category_id = Column(Integer, ForeignKey("categories.id"))
    budget_period_id = Column(Integer, ForeignKey("budget_periods.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    category = relationship("Category", back_populates="allocations")
    budget_period = relationship("BudgetPeriod", back_populates="allocations")
