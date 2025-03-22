from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
import calendar

from app.db.database import get_db
from app.models.users import User
from app.models.categories import Category
from app.models.transactions import Transaction
from app.models.budget import BudgetPeriod, EnvelopeAllocation
from app.schemas.budget import (
    BudgetPeriod as BudgetPeriodSchema,
    BudgetPeriodCreate,
    BudgetPeriodUpdate,
    BudgetPeriodWithAllocations,
    EnvelopeAllocation as EnvelopeAllocationSchema,
    EnvelopeAllocationCreate,
    EnvelopeAllocationUpdate,
)
from app.utils.auth import get_current_active_user

router = APIRouter(prefix="/budget", tags=["Budget"])

# Budget Period Routes
@router.post("/periods/", response_model=BudgetPeriodSchema)
async def create_budget_period(
    budget_period: BudgetPeriodCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db_budget_period = BudgetPeriod(
        name=budget_period.name,
        start_date=budget_period.start_date,
        end_date=budget_period.end_date,
        total_income=budget_period.total_income,
        user_id=current_user.id,
    )
    db.add(db_budget_period)
    db.commit()
    db.refresh(db_budget_period)
    return db_budget_period

@router.get("/periods/", response_model=List[BudgetPeriodSchema])
async def read_budget_periods(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    budget_periods = db.query(BudgetPeriod).filter(
        BudgetPeriod.user_id == current_user.id
    ).order_by(BudgetPeriod.start_date.desc()).all()
    
    return budget_periods

@router.get("/periods/current/", response_model=BudgetPeriodWithAllocations)
async def read_current_budget_period(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Find the budget period that includes today's date
    today = datetime.now().date()
    budget_period = db.query(BudgetPeriod).filter(
        BudgetPeriod.user_id == current_user.id,
        BudgetPeriod.start_date <= today,
        BudgetPeriod.end_date >= today
    ).first()
    
    if not budget_period:
        # If no current period exists, automatically create one for the current month
        year = today.year
        month = today.month
        
        # Get the first and last day of the month
        first_day = datetime(year, month, 1)
        last_day = datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59)
        
        # Create a name for the budget period (e.g., "March 2025")
        name = first_day.strftime("%B %Y")
        
        # Check if there are any recurring incomes for this user
        # For now, we'll set a default income of 0
        total_income = 0.0
        
        # Create the budget period
        budget_period = BudgetPeriod(
            name=name,
            start_date=first_day,
            end_date=last_day,
            total_income=total_income,
            user_id=current_user.id,
        )
        
        db.add(budget_period)
        db.commit()
        db.refresh(budget_period)
    
    return await get_budget_period_with_allocations(budget_period.id, current_user, db)

@router.get("/periods/{budget_period_id}/", response_model=BudgetPeriodWithAllocations)
async def read_budget_period(
    budget_period_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return await get_budget_period_with_allocations(budget_period_id, current_user, db)

@router.put("/periods/{budget_period_id}/", response_model=BudgetPeriodSchema)
async def update_budget_period(
    budget_period_id: int,
    budget_period_update: BudgetPeriodUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db_budget_period = db.query(BudgetPeriod).filter(
        BudgetPeriod.id == budget_period_id,
        BudgetPeriod.user_id == current_user.id
    ).first()

    if not db_budget_period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget period not found",
        )

    # Update budget period fields if provided
    if budget_period_update.name is not None:
        db_budget_period.name = budget_period_update.name

    if budget_period_update.start_date is not None:
        db_budget_period.start_date = budget_period_update.start_date

    if budget_period_update.end_date is not None:
        db_budget_period.end_date = budget_period_update.end_date

    if budget_period_update.total_income is not None:
        db_budget_period.total_income = budget_period_update.total_income

    db.commit()
    db.refresh(db_budget_period)
    return db_budget_period

@router.delete("/periods/{budget_period_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget_period(
    budget_period_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db_budget_period = db.query(BudgetPeriod).filter(
        BudgetPeriod.id == budget_period_id,
        BudgetPeriod.user_id == current_user.id
    ).first()

    if not db_budget_period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget period not found",
        )

    db.delete(db_budget_period)
    db.commit()
    return {"detail": "Budget period deleted successfully"}

# Helper function to create a monthly budget period
@router.post("/periods/create-monthly/", response_model=BudgetPeriodSchema)
async def create_monthly_budget_period(
    year: int = Query(..., description="Year for the budget period"),
    month: int = Query(..., description="Month for the budget period (1-12)"),
    total_income: float = Query(0.0, description="Total income for the period"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Validate month
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12",
        )
    
    # Get the first and last day of the month
    first_day = datetime(year, month, 1)
    last_day = datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59)
    
    # Create a name for the budget period (e.g., "March 2025")
    name = first_day.strftime("%B %Y")
    
    # Create the budget period
    db_budget_period = BudgetPeriod(
        name=name,
        start_date=first_day,
        end_date=last_day,
        total_income=total_income,
        user_id=current_user.id,
    )
    
    db.add(db_budget_period)
    db.commit()
    db.refresh(db_budget_period)
    
    return db_budget_period

# Envelope Allocation Routes
@router.post("/allocations/", response_model=EnvelopeAllocationSchema)
async def create_envelope_allocation(
    allocation: EnvelopeAllocationCreate,
    budget_period_id: int = Query(..., description="Budget period ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Verify budget period exists and belongs to user
    budget_period = db.query(BudgetPeriod).filter(
        BudgetPeriod.id == budget_period_id,
        BudgetPeriod.user_id == current_user.id
    ).first()

    if not budget_period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget period not found",
        )

    # Verify category exists and belongs to user
    category = db.query(Category).filter(
        Category.id == allocation.category_id,
        Category.user_id == current_user.id
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # Check if allocation already exists for this category and budget period
    existing_allocation = db.query(EnvelopeAllocation).filter(
        EnvelopeAllocation.category_id == allocation.category_id,
        EnvelopeAllocation.budget_period_id == budget_period_id
    ).first()

    if existing_allocation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Allocation already exists for this category in this budget period",
        )

    db_allocation = EnvelopeAllocation(
        allocated_amount=allocation.allocated_amount,
        category_id=allocation.category_id,
        budget_period_id=budget_period_id,
    )
    db.add(db_allocation)
    db.commit()
    db.refresh(db_allocation)
    
    # Get category name and spending for response
    category_name = category.name
    spent = db.query(func.sum(Transaction.amount)).filter(
        Transaction.category_id == allocation.category_id,
        Transaction.budget_period_id == budget_period_id,
        Transaction.user_id == current_user.id
    ).scalar() or 0.0
    
    # Create response with additional fields
    response = {
        **db_allocation.__dict__,
        "category_name": category_name,
        "spent": spent,
        "remaining": db_allocation.allocated_amount - spent
    }
    
    return response

@router.put("/allocations/{allocation_id}/", response_model=EnvelopeAllocationSchema)
async def update_envelope_allocation(
    allocation_id: int,
    allocation_update: EnvelopeAllocationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Get the allocation and verify it belongs to the user
    db_allocation = db.query(EnvelopeAllocation).join(
        BudgetPeriod, EnvelopeAllocation.budget_period_id == BudgetPeriod.id
    ).filter(
        EnvelopeAllocation.id == allocation_id,
        BudgetPeriod.user_id == current_user.id
    ).first()

    if not db_allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Allocation not found",
        )

    # Update allocation fields if provided
    if allocation_update.allocated_amount is not None:
        db_allocation.allocated_amount = allocation_update.allocated_amount

    db.commit()
    db.refresh(db_allocation)
    
    # Get category and spending for response
    category = db.query(Category).filter(Category.id == db_allocation.category_id).first()
    category_name = category.name if category else "Unknown"
    
    spent = db.query(func.sum(Transaction.amount)).filter(
        Transaction.category_id == db_allocation.category_id,
        Transaction.budget_period_id == db_allocation.budget_period_id,
        Transaction.user_id == current_user.id
    ).scalar() or 0.0
    
    # Create response with additional fields
    response = {
        **db_allocation.__dict__,
        "category_name": category_name,
        "spent": spent,
        "remaining": db_allocation.allocated_amount - spent
    }
    
    return response

@router.delete("/allocations/{allocation_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_envelope_allocation(
    allocation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Get the allocation and verify it belongs to the user
    db_allocation = db.query(EnvelopeAllocation).join(
        BudgetPeriod, EnvelopeAllocation.budget_period_id == BudgetPeriod.id
    ).filter(
        EnvelopeAllocation.id == allocation_id,
        BudgetPeriod.user_id == current_user.id
    ).first()

    if not db_allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Allocation not found",
        )

    db.delete(db_allocation)
    db.commit()
    return {"detail": "Allocation deleted successfully"}

# Helper function to get budget period with allocations
async def get_budget_period_with_allocations(
    budget_period_id: int,
    current_user: User,
    db: Session
):
    # Get the budget period
    budget_period = db.query(BudgetPeriod).filter(
        BudgetPeriod.id == budget_period_id,
        BudgetPeriod.user_id == current_user.id
    ).first()

    if not budget_period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget period not found",
        )

    # Get allocations for this budget period
    allocations = db.query(EnvelopeAllocation).filter(
        EnvelopeAllocation.budget_period_id == budget_period_id
    ).all()

    # Calculate totals and prepare response
    total_allocated = 0.0
    total_spent = 0.0
    allocations_with_details = []

    for allocation in allocations:
        # Get category name
        category = db.query(Category).filter(Category.id == allocation.category_id).first()
        category_name = category.name if category else "Unknown"

        # Calculate spent amount for this category in this budget period
        spent = db.query(func.sum(Transaction.amount)).filter(
            Transaction.category_id == allocation.category_id,
            Transaction.budget_period_id == budget_period_id,
            Transaction.user_id == current_user.id
        ).scalar() or 0.0

        # Calculate remaining amount
        remaining = allocation.allocated_amount - spent

        # Add to totals
        total_allocated += allocation.allocated_amount
        total_spent += spent

        # Create allocation with details
        allocation_with_details = {
            **allocation.__dict__,
            "category_name": category_name,
            "spent": spent,
            "remaining": remaining
        }
        allocations_with_details.append(allocation_with_details)

    # Calculate unallocated amount
    unallocated = budget_period.total_income - total_allocated

    # Create response
    response = {
        **budget_period.__dict__,
        "allocations": allocations_with_details,
        "total_allocated": total_allocated,
        "total_spent": total_spent,
        "total_remaining": total_allocated - total_spent,
        "unallocated": unallocated
    }

    return response
