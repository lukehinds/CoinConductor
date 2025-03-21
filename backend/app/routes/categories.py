from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.db.database import get_db
from app.models.users import User
from app.models.categories import Category
from app.models.transactions import Transaction
from app.schemas.categories import (
    Category as CategorySchema,
    CategoryCreate,
    CategoryUpdate,
    CategoryWithBalance,
)
from app.utils.auth import get_current_active_user

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.post("/", response_model=CategorySchema)
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db_category = Category(
        name=category.name,
        budget_amount=category.budget_amount,
        month=category.month,
        user_id=current_user.id,
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/", response_model=List[CategoryWithBalance])
async def read_categories(
    month: Optional[str] = Query(None, description="Filter by month (YYYY-MM)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(Category).filter(Category.user_id == current_user.id)

    if month:
        query = query.filter(Category.month == month)

    categories = query.all()

    # Calculate spent amount for each category
    result = []
    for category in categories:
        # Sum transactions for this category
        spent = db.query(func.sum(Transaction.amount)).filter(
            Transaction.category_id == category.id,
            Transaction.user_id == current_user.id
        ).scalar() or 0.0

        # Create response with balance info
        category_with_balance = CategoryWithBalance(
            id=category.id,
            name=category.name,
            budget_amount=category.budget_amount,
            month=category.month,
            user_id=category.user_id,
            created_at=category.created_at,
            updated_at=category.updated_at,
            spent=spent,
            remaining=category.budget_amount - spent
        )
        result.append(category_with_balance)

    return result

@router.get("/{category_id}/", response_model=CategoryWithBalance)
async def read_category(
    category_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Calculate spent amount
    spent = db.query(func.sum(Transaction.amount)).filter(
        Transaction.category_id == category.id,
        Transaction.user_id == current_user.id
    ).scalar() or 0.0

    # Create response with balance info
    category_with_balance = CategoryWithBalance(
        id=category.id,
        name=category.name,
        budget_amount=category.budget_amount,
        month=category.month,
        user_id=category.user_id,
        created_at=category.created_at,
        updated_at=category.updated_at,
        spent=spent,
        remaining=category.budget_amount - spent
    )

    return category_with_balance

@router.put("/{category_id}/", response_model=CategorySchema)
async def update_category(
    category_id: int,
    category_update: CategoryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db_category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()

    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Update category fields if provided
    if category_update.name is not None:
        db_category.name = category_update.name

    if category_update.budget_amount is not None:
        db_category.budget_amount = category_update.budget_amount

    if category_update.month is not None:
        db_category.month = category_update.month

    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/{category_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db_category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()

    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    db.delete(db_category)
    db.commit()
    return {"detail": "Category deleted successfully"}