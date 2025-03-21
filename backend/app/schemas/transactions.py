from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TransactionBase(BaseModel):
    amount: float
    description: str
    date: datetime
    category_id: Optional[int] = None
    source: str = "manual"
    notes: Optional[str] = None
    external_id: Optional[str] = None  # For storing external IDs like GoCardless payment IDs

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    category_id: Optional[int] = None
    notes: Optional[str] = None

class TransactionInDB(TransactionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Transaction(TransactionInDB):
    pass

class BankAccountBase(BaseModel):
    name: str
    account_type: str
    provider: str

class BankAccountCreate(BankAccountBase):
    secret_id: Optional[str] = None
    secret_key: Optional[str] = None

class BankAccountUpdate(BaseModel):
    name: Optional[str] = None
    secret_id: Optional[str] = None
    secret_key: Optional[str] = None
    last_synced: Optional[datetime] = None

class BankAccountInDB(BankAccountBase):
    id: int
    user_id: int
    last_synced: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BankAccount(BankAccountInDB):
    pass
