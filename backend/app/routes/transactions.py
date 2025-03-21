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
from app.utils.gocardless import get_gocardless_client, fetch_transactions, verify_webhook_signature

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

@bank_router.post("/{bank_account_id}/sync", response_model=BankAccountSchema)
async def sync_bank_account(
    bank_account_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    logger = logging.getLogger(__name__)

    logger.info(f"Starting sync for bank account {bank_account_id}")

    db_bank_account = db.query(BankAccount).filter(
        BankAccount.id == bank_account_id,
        BankAccount.user_id == current_user.id
    ).first()

    if not db_bank_account:
        logger.warning(f"Bank account {bank_account_id} not found for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found",
        )

    # Check if this is a GoCardless account
    if db_bank_account.provider.lower() != "gocardless":
        logger.warning(f"Bank account {bank_account_id} is not a GoCardless account")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint only supports GoCardless accounts",
        )

    # Check if we have the required credentials
    if not db_bank_account.secret_id:
        logger.warning(f"Bank account {bank_account_id} is missing GoCardless API credentials")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GoCardless API credentials are missing",
        )

    try:
        logger.info(f"Initializing GoCardless client for bank account {bank_account_id}")
        # Initialize GoCardless client
        client = get_gocardless_client(
            secret_id=db_bank_account.secret_id,
            secret_key=db_bank_account.secret_key or "",
            environment="live"  # You might want to make this configurable
        )

        # Fetch transactions since last sync
        since_date = db_bank_account.last_synced
        logger.info(f"Fetching transactions since {since_date}")
        transactions_data = await fetch_transactions(client, since_date)
        logger.info(f"Fetched {len(transactions_data)} transactions")

        # Find or create a default "Uncategorized" category for the user
        logger.info("Finding or creating Uncategorized category")
        uncategorized_category = db.query(Category).filter(
            Category.name == "Uncategorized",
            Category.user_id == current_user.id
        ).first()

        if not uncategorized_category:
            logger.info("Creating new Uncategorized category")
            uncategorized_category = Category(
                name="Uncategorized",
                user_id=current_user.id,
                color="#808080"  # Default gray color
            )
            db.add(uncategorized_category)
            db.commit()
            db.refresh(uncategorized_category)

        # Process and save transactions
        new_transactions_count = 0
        for transaction_data in transactions_data:
            # Check if transaction already exists by external_id
            existing_transaction = db.query(Transaction).filter(
                Transaction.external_id == transaction_data["external_id"],
                Transaction.user_id == current_user.id
            ).first()

            if not existing_transaction:
                logger.info(f"Creating new transaction for payment {transaction_data['external_id']}")
                # Create new transaction
                new_transaction = Transaction(
                    amount=transaction_data["amount"],
                    description=transaction_data["description"],
                    date=transaction_data["date"],
                    category_id=uncategorized_category.id,  # Default to uncategorized
                    user_id=current_user.id,
                    source="gocardless",
                    external_id=transaction_data["external_id"],
                    notes=f"Status: {transaction_data['status']}, Currency: {transaction_data['currency']}"
                )
                db.add(new_transaction)
                new_transactions_count += 1

        # Update last_synced timestamp
        logger.info(f"Sync completed. Created {new_transactions_count} new transactions")
        db_bank_account.last_synced = datetime.now()
        db.commit()
        db.refresh(db_bank_account)

        return db_bank_account
    except Exception as e:
        error_msg = f"Failed to sync with GoCardless: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg,
        )

@bank_router.post("/webhook", status_code=status.HTTP_200_OK)
async def gocardless_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Handle webhook events from GoCardless.

    This endpoint receives webhook notifications from GoCardless when events occur,
    such as payments being created, confirmed, or failed.
    """
    try:
        # Get the raw request body for signature verification
        body = await request.body()

        # Get the signature header
        signature_header = request.headers.get("Webhook-Signature", "")

        # In a production environment, you should store this secret securely
        # and retrieve it from your configuration or environment variables
        webhook_secret = "your_webhook_secret"  # Replace with your actual secret

        # Verify the webhook signature
        is_valid = await verify_webhook_signature(body, signature_header, webhook_secret)

        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature",
            )

        # Parse the webhook payload
        payload = await request.json()

        # Process the events
        for event in payload.get("events", []):
            event_type = event.get("resource_type")
            action = event.get("action")

            # Handle payment events
            if event_type == "payments":
                payment_id = event.get("links", {}).get("payment")

                # Find the transaction by external_id
                transaction = db.query(Transaction).filter(
                    Transaction.external_id == payment_id
                ).first()

                if transaction:
                    # Update transaction notes with the new status
                    if action == "confirmed":
                        transaction.notes = f"{transaction.notes or ''}\nPayment confirmed on {datetime.now()}"
                    elif action == "failed":
                        transaction.notes = f"{transaction.notes or ''}\nPayment failed on {datetime.now()}"
                    elif action == "cancelled":
                        transaction.notes = f"{transaction.notes or ''}\nPayment cancelled on {datetime.now()}"

                    db.commit()

        return {"status": "success"}
    except Exception as e:
        # Log the error but return a 200 response to acknowledge receipt
        # GoCardless will retry if it doesn't receive a 200 response
        print(f"Error processing webhook: {str(e)}")
        return {"status": "error", "message": str(e)}

# Transaction Routes
@router.post("/", response_model=TransactionSchema)
async def create_transaction(
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
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
        category_id=transaction.category_id,  # This can now be None
        user_id=current_user.id,
        source=transaction.source,
        notes=transaction.notes,
        external_id=transaction.external_id,
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
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
