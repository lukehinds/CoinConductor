from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    budget_amount: float = Field(default=0.0, ge=0)
    month: str  # Format: YYYY-MM

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    budget_amount: Optional[float] = Field(default=None, ge=0)
    month: Optional[str] = None

class CategoryInDB(CategoryBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Category(CategoryInDB):
    pass

class CategoryWithBalance(Category):
    spent: float
    remaining: float