#!/usr/bin/env python3
"""
Test script for GoCardless integration
"""
import sys
import logging
from app.utils.gocardless import get_gocardless_client, fetch_transactions
from datetime import datetime, timedelta

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

async def test_gocardless():
    """
    Test GoCardless integration
    """
    # Replace with your actual GoCardless API token
    access_token = "sandbox_abc123"  # This is a mock token for testing

    try:
        # Test client initialization
        logger.info("Testing GoCardless client initialization...")
        client = get_gocardless_client(
            secret_id=access_token,
            secret_key="",
            environment="sandbox"
        )
        logger.info("GoCardless client initialized successfully")

        # Test fetching transactions
        logger.info("Testing fetching transactions...")
        since_date = datetime.now() - timedelta(days=30)
        transactions = await fetch_transactions(client, since_date)
        logger.info(f"Fetched {len(transactions)} transactions")

        # Print the first transaction if available
        if transactions:
            logger.info(f"First transaction: {transactions[0]}")

        logger.info("All tests passed!")
        return True
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    import asyncio
    success = asyncio.run(test_gocardless())
    sys.exit(0 if success else 1)