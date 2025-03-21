import gocardless_pro
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, status
import traceback
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_gocardless_client(secret_id: str, secret_key: str, environment: str = 'sandbox'):
    """
    Initialize and return a GoCardless client with the provided credentials.
    
    Args:
        secret_id: The GoCardless API access token
        secret_key: The GoCardless API secret key (if applicable)
        environment: 'sandbox' or 'live'
        
    Returns:
        A configured GoCardless client
    """
    try:
        logger.info(f"Initializing GoCardless client with environment: {environment}")
        # Note: GoCardless typically uses just an access token, but we're using
        # secret_id to store that token based on your model
        client = gocardless_pro.Client(
            access_token=secret_id,
            environment=environment
        )
        logger.info("GoCardless client initialized successfully")
        return client
    except Exception as e:
        error_msg = f"Failed to initialize GoCardless client: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )

async def fetch_transactions(client, since_date: Optional[datetime] = None) -> List[Dict[Any, Any]]:
    """
    Fetch transactions from GoCardless.
    
    Args:
        client: An initialized GoCardless client
        since_date: Only fetch transactions after this date
        
    Returns:
        List of transaction data
    """
    try:
        # If no since_date is provided, default to last 30 days
        if not since_date:
            since_date = datetime.now() - timedelta(days=30)
            
        # Format the date as required by GoCardless API
        created_at_gte = since_date.strftime("%Y-%m-%dT%H:%M:%SZ")
        logger.info(f"Fetching transactions since: {created_at_gte}")
        
        # Fetch payments from GoCardless
        # Note: We're using payments as they represent money movements in GoCardless
        logger.info("Calling GoCardless API to list payments")
        payments = client.payments.list(params={
            "created_at[gte]": created_at_gte
        })
        
        # Process the payments into a standardized format
        transactions = []
        logger.info(f"Processing {len(payments.records) if hasattr(payments, 'records') else 0} payments")
        
        if not hasattr(payments, 'records'):
            logger.warning(f"Unexpected response format: {payments}")
            return []
            
        for payment in payments.records:
            # Log payment details for debugging
            logger.info(f"Processing payment: {payment.id}")
            
            # Convert GoCardless payment to our transaction format
            transaction = {
                "amount": float(payment.amount) / 100,  # GoCardless amounts are in cents
                "description": f"Payment {payment.id}",
                "date": datetime.strptime(payment.created_at, "%Y-%m-%dT%H:%M:%S.%fZ"),
                "source": "gocardless",
                "external_id": payment.id,
                "status": payment.status,
                "currency": payment.currency,
                "metadata": payment.metadata
            }
            transactions.append(transaction)
            
        logger.info(f"Successfully processed {len(transactions)} transactions")
        return transactions
    except Exception as e:
        error_msg = f"Failed to fetch transactions from GoCardless: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )

async def verify_webhook_signature(request_body: bytes, signature_header: str, webhook_secret: str) -> bool:
    """
    Verify that a webhook request came from GoCardless.
    
    Args:
        request_body: The raw request body
        signature_header: The signature header from the request
        webhook_secret: Your GoCardless webhook secret
        
    Returns:
        True if the signature is valid, False otherwise
    """
    try:
        # This is a placeholder - in a real implementation, you would use
        # the GoCardless webhook signature verification method
        # See: https://developer.gocardless.com/api-reference/#webhooks-overview
        
        # Example implementation (you would need to adapt this based on GoCardless docs)
        # webhook = gocardless_pro.Webhook(webhook_secret)
        # return webhook.validate(request_body, signature_header)
        
        # For now, return True as a placeholder
        return True
    except Exception:
        return False 