from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# EnvelopeAllocation Schemas
class EnvelopeAllocationBase(BaseModel):
    allocated_amount: float = Field(default=0.0, ge=0)
    category_id: int

class EnvelopeAllocationCreate(EnvelopeAllocationBase):
    pass

class EnvelopeAllocationUpdate(BaseModel):
    allocated_amount: Optional[float] = Field(default=None, ge=0)

class EnvelopeAllocationInDB(EnvelopeAllocationBase):
    id: int
    budget_period_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EnvelopeAllocation(EnvelopeAllocationInDB):
    category_name: Optional[str] = None
    spent: float = 0.0
    remaining: float = 0.0

# BudgetPeriod Schemas
class BudgetPeriodBase(BaseModel):
    name: str
    start_date: datetime
    end_date: datetime
    total_income: float = Field(default=0.0, ge=0)

class BudgetPeriodCreate(BudgetPeriodBase):
    pass

class BudgetPeriodUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    total_income: Optional[float] = Field(default=None, ge=0)

class BudgetPeriodInDB(BudgetPeriodBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BudgetPeriod(BudgetPeriodInDB):
    pass

class BudgetPeriodWithAllocations(BudgetPeriod):
    allocations: List[EnvelopeAllocation] = []
    total_allocated: float = 0.0
    total_spent: float = 0.0
    total_remaining: float = 0.0
    unallocated: float = 0.0
