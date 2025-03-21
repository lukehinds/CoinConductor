from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.transactions import Transaction
from app.models.categories import Category
from app.utils.ai_categorization import AICategorizer
import logging

logger = logging.getLogger(__name__)

async def categorize_uncategorized_transactions():
    """
    Background task to categorize all uncategorized transactions using AI
    """
    db = SessionLocal()
    try:
        # Get all uncategorized transactions grouped by user
        uncategorized = (
            db.query(Transaction)
            .filter((Transaction.category_id == None) | (Transaction.category_id == 0))
            .all()
        )

        if not uncategorized:
            logger.info("No uncategorized transactions found")
            return

        # Group transactions by user_id
        transactions_by_user = {}
        for transaction in uncategorized:
            if transaction.user_id not in transactions_by_user:
                transactions_by_user[transaction.user_id] = []
            transactions_by_user[transaction.user_id].append(transaction)

        # Process each user's transactions
        for user_id, transactions in transactions_by_user.items():
            # Get user's categories
            categories = db.query(Category).filter(Category.user_id == user_id).all()
            if not categories:
                logger.warning(f"No categories found for user {user_id}")
                continue

            # Format categories for AI
            categories_for_ai = [
                {"id": category.id, "name": category.name}
                for category in categories
            ]

            # Initialize AI categorizer
            categorizer = AICategorizer()

            # Process each transaction
            for transaction in transactions:
                try:
                    category_id = await categorizer.categorize_transaction(
                        transaction_description=transaction.description,
                        amount=transaction.amount,
                        available_categories=categories_for_ai
                    )

                    if category_id is not None:
                        transaction.category_id = category_id
                        logger.info(
                            f"Categorized transaction {transaction.id} "
                            f"('{transaction.description}') as category {category_id}"
                        )

                except Exception as e:
                    logger.error(
                        f"Error categorizing transaction {transaction.id}: {str(e)}"
                    )

            # Commit changes for this user's transactions
            try:
                db.commit()
            except Exception as e:
                logger.error(f"Error committing changes for user {user_id}: {str(e)}")
                db.rollback()

    except Exception as e:
        logger.error(f"Error in categorize_uncategorized_transactions: {str(e)}")
        db.rollback()
    finally:
        db.close()

def setup_scheduler():
    """
    Set up the scheduler with all scheduled tasks
    """
    scheduler = AsyncIOScheduler()

    # Schedule the categorization task to run every 12 hours
    scheduler.add_job(
        categorize_uncategorized_transactions,
        CronTrigger(hour="*/12"),  # Run every 12 hours
        id="categorize_transactions",
        name="Categorize uncategorized transactions",
        replace_existing=True
    )

    return scheduler 