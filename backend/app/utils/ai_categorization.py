import os
import asyncio
from typing import Optional, Dict, Any, List
import json
from datetime import datetime
import logging
import traceback
import openai

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import AI providers
try:
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    import google.generativeai as genai
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

from app.config import get_settings

class AICategorizer:

    def __init__(self, provider: Optional[str] = None, api_key: Optional[str] = None, db: Optional[Any] = None):
        """
        Initialize the AI categorizer with the specified provider

        Args:
            provider: The AI provider to use (openai, anthropic, google, ollama)
            api_key: The API key for the provider (not needed for ollama)
            db: SQLAlchemy database session for saving changes
        """
        settings = get_settings()
        self.provider = (provider or settings.DEFAULT_AI_PROVIDER).lower()
        self.api_key = api_key
        self.settings = settings
        self.db = db

        logger.info(f"Initializing AICategorizer with provider: {self.provider}")

        # Set up the client based on the provider
        if self.provider == "openai":
            if not OPENAI_AVAILABLE:
                logger.error("OpenAI package not installed")
                raise ImportError("OpenAI package not installed. Install with 'pip install openai'")
            try:
                api_key = self.api_key or settings.OPENAI_API_KEY
                if not api_key:
                    logger.error("OpenAI API key not provided")
                    raise ValueError("OpenAI API key not provided")

                # Use the native openai package
                logger.info("OpenAI client initialized successfully")
            except Exception as e:
                logger.error(f"Error initializing OpenAI client: {str(e)}")
                logger.error(traceback.format_exc())
                raise

        elif self.provider == "anthropic":
            if not ANTHROPIC_AVAILABLE:
                logger.error("Anthropic package not installed")
                raise ImportError("Anthropic package not installed. Install with 'pip install anthropic'")
            try:
                self.client = anthropic.Anthropic(api_key=self.api_key or settings.ANTHROPIC_API_KEY)
                logger.info("Anthropic client initialized successfully")
            except Exception as e:
                logger.error(f"Error initializing Anthropic client: {str(e)}")
                logger.error(traceback.format_exc())
                raise

        elif self.provider == "google":
            if not GOOGLE_AVAILABLE:
                logger.error("Google Generative AI package not installed")
                raise ImportError("Google Generative AI package not installed. Install with 'pip install google-generativeai'")
            try:
                genai.configure(api_key=self.api_key or settings.GOOGLE_API_KEY)
                logger.info("Google AI client initialized successfully")
            except Exception as e:
                logger.error(f"Error initializing Google AI client: {str(e)}")
                logger.error(traceback.format_exc())
                raise

        elif self.provider == "ollama":
            if not OLLAMA_AVAILABLE:
                logger.error("Ollama package not installed")
                raise ImportError("Ollama package not installed. Install with 'pip install ollama'")
            logger.info("Using Ollama via OpenAI API wrapper (no separate client initialization needed)")
        else:
            logger.error(f"Unsupported AI provider: {self.provider}")
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    async def categorize_transaction(self, transaction_description: str, amount: float,
                                     available_categories: List[Dict[str, Any]], 
                                     transaction_id: Optional[int] = None) -> Optional[int]:
        """
        Categorize a transaction using AI

        Args:
            transaction_description: The description of the transaction
            amount: The amount of the transaction
            available_categories: List of available categories with their names and IDs
            transaction_id: Optional ID of the transaction to update in the database

        Returns:
            The ID of the most appropriate category, or None if no category could be determined
        """
        try:
            # Format the categories for the prompt
            categories_str = ", ".join([f"{cat['name']} (id: {cat['id']})" for cat in available_categories])

            # Create the prompt
            prompt = f"""
            You are a financial assistant that categorizes transactions.

            Transaction: "{transaction_description}"
            Amount: ${amount}

            Available categories: {categories_str}

            Based on the transaction description and amount, which category ID is most appropriate?
            RESPOND WITH ONLY THE NUMBER. Do not include any other text, just the category ID number.
            If you cannot determine an appropriate category, respond with 'None'.
            """

            logger.info(f"Categorizing transaction: {transaction_description} (${amount})")
            logger.info(f"Available categories: {categories_str}")

            # Get the response from the AI provider
            if self.provider == "openai":
                response = await self._categorize_with_openai(prompt)
            elif self.provider == "anthropic":
                response = await self._categorize_with_anthropic(prompt)
            elif self.provider == "google":
                response = await self._categorize_with_google(prompt)
            elif self.provider == "ollama":
                response = await self._categorize_with_ollama(prompt)

            logger.info(f"Raw AI response: {response}")

            # Extract the category ID from the response
            try:
                response_text = response.strip().lower()
                
                # Remove any extra text, just keep numbers or 'none'
                response_text = ''.join(c for c in response_text if c.isdigit() or c == 'n')
                
                if response_text.startswith('n') or not response_text:
                    logger.info("AI returned 'None' - no suitable category found")
                    return None

                # Try to parse the response as an integer
                category_id = int(response_text)

                # Verify that the category ID exists in available_categories
                if not any(cat['id'] == category_id for cat in available_categories):
                    logger.warning(f"AI returned category ID {category_id} which is not in available categories")
                    return None

                # If we have a db session and transaction_id, update the transaction
                if self.db is not None and transaction_id is not None:
                    from app.models.transactions import Transaction
                    transaction = self.db.query(Transaction).filter(Transaction.id == transaction_id).first()
                    if transaction:
                        try:
                            transaction.category_id = category_id
                            self.db.add(transaction)  # Explicitly mark for update
                            self.db.commit()
                            self.db.refresh(transaction)  # Refresh to ensure changes are loaded
                            logger.info(f"Updated transaction {transaction_id} with category {category_id}")
                            logger.info(f"Verified category_id after update: {transaction.category_id}")
                        except Exception as e:
                            logger.error(f"Error saving category: {str(e)}")
                            self.db.rollback()
                            raise

                logger.info(f"Successfully categorized as category ID: {category_id}")
                return category_id
            except (ValueError, TypeError) as e:
                logger.warning(f"Failed to parse AI response '{response}': {str(e)}")
                return None

        except Exception as e:
            logger.error(f"Error during transaction categorization: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    async def _categorize_with_openai(self, prompt: str) -> str:
        """Use OpenAI to categorize the transaction"""
        try:
            logger.info("Sending request to OpenAI")
            client = openai.AsyncOpenAI(api_key=self.api_key or self.settings.OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model=self.settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a financial assistant that categorizes transactions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=10
            )
            logger.info(f"OpenAI response: {response}")
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    async def _categorize_with_anthropic(self, prompt: str) -> str:
        """Use Anthropic to categorize the transaction"""
        try:
            logger.info("Sending request to Anthropic")
            response = await self.client.messages.create(
                model=self.settings.ANTHROPIC_MODEL,
                max_tokens=10,
                temperature=0.1,
                system="You are a financial assistant that categorizes transactions.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            logger.info(f"Anthropic response: {response}")
            return response.content[0].text
        except Exception as e:
            logger.error(f"Error calling Anthropic API: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    async def _categorize_with_google(self, prompt: str) -> str:
        """Use Google Generative AI to categorize the transaction"""
        try:
            logger.info("Sending request to Google AI")
            model = genai.GenerativeModel(self.settings.GOOGLE_MODEL)
            response = model.generate_content(prompt)
            logger.info(f"Google AI response: {response}")
            return response.text
        except Exception as e:
            logger.error(f"Error calling Google AI API: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    async def _categorize_with_ollama(self, prompt: str) -> str:
        """
        Use Ollama to categorize the transaction by leveraging OpenAI's native API
        with a custom API base (Ollama host). This assumes your Ollama instance is
        compatible with the OpenAI API.
        """
        logger.info(f"Sending request to Ollama using native OpenAI API wrapper with model: {self.settings.OLLAMA_MODEL}")
        logger.info(f"Prompt: {prompt}")

        try:
            # Backup the original API base
            original_api_base = getattr(openai, "api_base", None)
            # Switch API base to Ollama host (e.g., "http://localhost:11434")
            # TODO: The 'openai.api_base' option isn't read in the client API. You will need to pass it when you instantiate the client, e.g. 'OpenAI(base_url=self.settings.OLLAMA_HOST or "http://localhost:11434")'
            # openai.api_base = self.settings.OLLAMA_HOST or "http://localhost:11434"

            response = await asyncio.to_thread(
                openai.ChatCompletion.create,
                model=self.settings.OLLAMA_MODEL,
                messages=[
                    {"role": "system", "content": "You are a financial assistant that categorizes transactions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=10
            )

            # Restore the original API base
            if original_api_base is not None:
                pass  # TODO: Update this when implementing OpenAI client properly
            else:
                delattr(openai, "api_base")

            logger.info(f"Ollama response: {response}")
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error calling Ollama: {str(e)}")
            logger.error(traceback.format_exc())
            raise
