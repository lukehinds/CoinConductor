from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.db.database import get_db
from app.models.users import User
from app.models.categories import Category
from app.models.transactions import Transaction
from app.utils.auth import get_current_active_user
from app.utils.ai_categorization import AICategorizer
from app.config import get_settings, Settings

router = APIRouter(prefix="/ai", tags=["AI"])

class AIProviderConfig(BaseModel):
    provider: str
    api_key: Optional[str] = None

class TransactionToCategorize(BaseModel):
    description: str
    amount: float

class CategoryPrediction(BaseModel):
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    confidence: float = 1.0

@router.post("/categorize/", response_model=CategoryPrediction)
async def categorize_transaction(
    transaction: TransactionToCategorize,
    provider: Optional[str] = Query(None, description="AI provider (openai, anthropic, google, ollama)"),
    api_key: Optional[str] = Query(None, description="API key for the provider"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    # Get user's categories
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()

    if not categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No categories found. Please create categories first.",
        )

    # Format categories for AI
    categories_for_ai = [
        {"id": category.id, "name": category.name}
        for category in categories
    ]

    try:
        # Initialize AI categorizer
        categorizer = AICategorizer(provider=provider, api_key=api_key)

        # Get category prediction
        category_id = await categorizer.categorize_transaction(
            transaction_description=transaction.description,
            amount=transaction.amount,
            available_categories=categories_for_ai
        )

        # Get category name if a category was assigned
        category_name = None
        if category_id is not None:
            category_name = next(
                (cat["name"] for cat in categories_for_ai if cat["id"] == category_id),
                None
            )

        return CategoryPrediction(
            category_id=category_id,
            category_name=category_name
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error categorizing transaction: {str(e)}",
        )

@router.post("/bulk-categorize/", response_model=List[Dict[str, Any]])
async def bulk_categorize_transactions(
    provider: Optional[str] = Query(None, description="AI provider (openai, anthropic, google, ollama)"),
    api_key: Optional[str] = Query(None, description="API key for the provider"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    # Get uncategorized transactions (category_id is None or 0)
    uncategorized_transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        (Transaction.category_id == None) | (Transaction.category_id == 0)
    ).all()

    if not uncategorized_transactions:
        return []

    # Get user's categories
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()

    if not categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No categories found. Please create categories first.",
        )

    # Format categories for AI
    categories_for_ai = [
        {"id": category.id, "name": category.name}
        for category in categories
    ]

    try:
        # Initialize AI categorizer
        categorizer = AICategorizer(provider=provider, api_key=api_key, db=db)

        results = []
        for transaction in uncategorized_transactions:
            # Get category prediction
            category_id = await categorizer.categorize_transaction(
                transaction_description=transaction.description,
                amount=transaction.amount,
                available_categories=categories_for_ai,
                transaction_id=transaction.id
            )

            # Get category name if a category was assigned
            category_name = None
            if category_id is not None:
                category_name = next(
                    (cat["name"] for cat in categories_for_ai if cat["id"] == category_id),
                    None
                )

            results.append({
                "transaction_id": transaction.id,
                "description": transaction.description,
                "amount": transaction.amount,
                "category_id": category_id,
                "category_name": category_name
            })

        # Commit changes
        db.commit()
        
        # Refresh all transactions to ensure they have the latest data
        for transaction in uncategorized_transactions:
            db.refresh(transaction)

        return results

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error categorizing transactions: {str(e)}",
        )