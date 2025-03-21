from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import logging
import traceback

from app.db.database import get_db
from app.models.users import User
from app.models.categories import Category
from app.models.transactions import Transaction, BankAccount
from app.schemas.transactions import (
    Transaction as TransactionSchema,
    TransactionCreate,
    TransactionUpdate,
    BankAccount as BankAccountSchema,
    BankAccountCreate,
    BankAccountUpdate,
)
from app.utils.auth import get_current_active_user
from app.utils.ai_categorization import AICategorizer
from app.config import get_settings, Settings

router = APIRouter(prefix="/transactions", tags=["Transactions"])

# Create a separate router for bank accounts to avoid path conflicts
bank_router = APIRouter(prefix="/bank-accounts", tags=["Bank Accounts"])

# Bank Account Routes
@bank_router.post("/", response_model=BankAccountSchema)
async def create_bank_account(
    bank_account: BankAccountCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db_bank_account = BankAccount(
        name=bank_account.name,
        account_type=bank_account.account_type,
        provider=bank_account.provider,
        user_id=current_user.id,
        secret_id=bank_account.secret_id,
        secret_key=bank_account.secret_key,
    )
    db.add(db_bank_account)
    db.commit()
    db.refresh(db_bank_account)
    return db_bank_account

@bank_router.get("/", response_model=List[BankAccountSchema])
async def read_bank_accounts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        bank_accounts = db.query(BankAccount).filter(
            BankAccount.user_id == current_user.id
        ).all()

        # Return an empty list if no accounts found
        if not bank_accounts:
            return []

        return bank_accounts
    except Exception as e:
        # Log the error
        print(f"Error fetching bank accounts: {str(e)}")
        # Return an empty list instead of raising an exception
        return []

@bank_router.get("/{bank_account_id}", response_model=BankAccountSchema)
async def read_bank_account(
    bank_account_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    bank_account = db.query(BankAccount).filter(
        BankAccount.id == bank_account_id,
        BankAccount.user_id == current_user.id
    ).first()

    if not bank_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found",
        )

    return bank_account

@bank_router.put("/{bank_account_id}", response_model=BankAccountSchema)
async def update_bank_account(
    bank_account_id: int,
    bank_account_update: BankAccountUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db_bank_account = db.query(BankAccount).filter(
        BankAccount.id == bank_account_id,
        BankAccount.user_id == current_user.id
    ).first()

    if not db_bank_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found",
        )

    # Update bank account fields if provided
    if bank_account_update.name is not None:
        db_bank_account.name = bank_account_update.name

    if bank_account_update.secret_id is not None:
        db_bank_account.secret_id = bank_account_update.secret_id

    if bank_account_update.secret_key is not None:
        db_bank_account.secret_key = bank_account_update.secret_key

    if bank_account_update.last_synced is not None:
        db_bank_account.last_synced = bank_account_update.last_synced

    db.commit()
    db.refresh(db_bank_account)
    return db_bank_account

@bank_router.delete("/{bank_account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bank_account(
    bank_account_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db_bank_account = db.query(BankAccount).filter(
        BankAccount.id == bank_account_id,
        BankAccount.user_id == current_user.id
    ).first()

    if not db_bank_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found",
        )

    db.delete(db_bank_account)
    db.commit()
    return {"detail": "Bank account deleted successfully"}

# Transaction Routes
@router.post("/", response_model=TransactionSchema)
async def create_transaction(
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    # If category_id is provided, verify it exists and belongs to user
    if transaction.category_id is not None:
        category = db.query(Category).filter(
            Category.id == transaction.category_id,
            Category.user_id == current_user.id
        ).first()

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )

    db_transaction = Transaction(
        amount=transaction.amount,
        description=transaction.description,
        date=transaction.date,
        category_id=transaction.category_id,
        user_id=current_user.id,
        source=transaction.source,
        notes=transaction.notes,
        external_id=transaction.external_id,
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    # If no category was provided, try to categorize using AI
    if transaction.category_id is None:
        try:
            # Get user's categories
            categories = db.query(Category).filter(Category.user_id == current_user.id).all()
            if categories:
                # Format categories for AI
                categories_for_ai = [
                    {"id": category.id, "name": category.name}
                    for category in categories
                ]

                # Initialize AI categorizer with default provider (ollama)
                categorizer = AICategorizer()

                # Get category prediction
                category_id = await categorizer.categorize_transaction(
                    transaction_description=transaction.description,
                    amount=transaction.amount,
                    available_categories=categories_for_ai
                )

                # Update transaction if a category was assigned
                if category_id is not None:
                    db_transaction.category_id = category_id
                    db.commit()
                    db.refresh(db_transaction)

        except Exception as e:
            # Log the error but don't fail the transaction creation
            print(f"Error during AI categorization: {str(e)}")

    return db_transaction

@router.get("/", response_model=List[TransactionSchema])
async def read_transactions(
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if category_id:
        query = query.filter(Transaction.category_id == category_id)

    if start_date:
        query = query.filter(Transaction.date >= start_date)

    if end_date:
        query = query.filter(Transaction.date <= end_date)

    transactions = query.order_by(Transaction.date.desc()).all()
    return transactions

@router.get("/{transaction_id}/", response_model=TransactionSchema)
async def read_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    return transaction

@router.put("/{transaction_id}/", response_model=TransactionSchema)
async def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db_transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()

    if not db_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    # Update transaction fields if provided
    if transaction_update.amount is not None:
        db_transaction.amount = transaction_update.amount

    if transaction_update.description is not None:
        db_transaction.description = transaction_update.description

    if transaction_update.date is not None:
        db_transaction.date = transaction_update.date

    if transaction_update.category_id is not None:
        # Verify category exists and belongs to user
        category = db.query(Category).filter(
            Category.id == transaction_update.category_id,
            Category.user_id == current_user.id
        ).first()

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )

        db_transaction.category_id = transaction_update.category_id

    if transaction_update.notes is not None:
        db_transaction.notes = transaction_update.notes

    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.delete("/{transaction_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db_transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()

    if not db_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    db.delete(db_transaction)
    db.commit()
    return {"detail": "Transaction deleted successfully"}
