import os
from typing import Optional, Dict, Any, List
import json
from datetime import datetime

# Import AI providers
try:
    import openai
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
    
    def __init__(self, provider: Optional[str] = None, api_key: Optional[str] = None):
        """
        Initialize the AI categorizer with the specified provider

        Args:
            provider: The AI provider to use (openai, anthropic, google, ollama)
            api_key: The API key for the provider (not needed for ollama)
        """
        settings = get_settings()
        self.provider = (provider or settings.DEFAULT_AI_PROVIDER).lower()
        self.api_key = api_key
        self.settings = settings

        # Set up the client based on the provider
        if self.provider == "openai":
            if not OPENAI_AVAILABLE:
                raise ImportError("OpenAI package not installed. Install with 'pip install openai'")
            openai.api_key = self.api_key or settings.OPENAI_API_KEY
            if not openai.api_key:
                raise ValueError("OpenAI API key not provided")

        elif self.provider == "anthropic":
            if not ANTHROPIC_AVAILABLE:
                raise ImportError("Anthropic package not installed. Install with 'pip install anthropic'")
            self.client = anthropic.Anthropic(api_key=self.api_key or settings.ANTHROPIC_API_KEY)

        elif self.provider == "google":
            if not GOOGLE_AVAILABLE:
                raise ImportError("Google Generative AI package not installed. Install with 'pip install google-generativeai'")
            genai.configure(api_key=self.api_key or settings.GOOGLE_API_KEY)

        elif self.provider == "ollama":
            if not OLLAMA_AVAILABLE:
                raise ImportError("Ollama package not installed. Install with 'pip install ollama'")
            # Ollama runs locally, no API key needed

        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    async def categorize_transaction(self, transaction_description: str, amount: float,
                                    available_categories: List[Dict[str, Any]]) -> Optional[int]:
        """
        Categorize a transaction using AI

        Args:
            transaction_description: The description of the transaction
            amount: The amount of the transaction
            available_categories: List of available categories with their names and IDs

        Returns:
            The ID of the most appropriate category, or None if no category could be determined
        """
        # Format the categories for the prompt
        categories_str = ", ".join([f"{cat['name']} (id: {cat['id']})" for cat in available_categories])

        # Create the prompt
        prompt = f"""
        You are a financial assistant that categorizes transactions.

        Transaction: "{transaction_description}"
        Amount: ${amount}

        Available categories: {categories_str}

        Based on the transaction description and amount, which category ID is most appropriate?
        If you cannot determine an appropriate category, respond with 'None'.
        Otherwise respond with only the category ID number.
        """

        # Get the response from the AI provider
        if self.provider == "openai":
            response = await self._categorize_with_openai(prompt)
        elif self.provider == "anthropic":
            response = await self._categorize_with_anthropic(prompt)
        elif self.provider == "google":
            response = await self._categorize_with_google(prompt)
        elif self.provider == "ollama":
            response = await self._categorize_with_ollama(prompt)

        # Extract the category ID from the response
        try:
            response_text = response.strip().lower()
            if response_text == 'none':
                return None
                
            # Try to parse the response as an integer
            category_id = int(response_text)

            # Verify that the category ID exists in available_categories
            if not any(cat['id'] == category_id for cat in available_categories):
                return None

            return category_id
        except (ValueError, TypeError):
            # If parsing fails, return None instead of defaulting to first category
            return None

    async def _categorize_with_openai(self, prompt: str) -> str:
        """Use OpenAI to categorize the transaction"""
        response = await openai.chat.completions.create(
            model=self.settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a financial assistant that categorizes transactions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=10
        )
        return response.choices[0].message.content

    async def _categorize_with_anthropic(self, prompt: str) -> str:
        """Use Anthropic to categorize the transaction"""
        response = await self.client.messages.create(
            model=self.settings.ANTHROPIC_MODEL,
            max_tokens=10,
            temperature=0.1,
            system="You are a financial assistant that categorizes transactions.",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return response.content[0].text

    async def _categorize_with_google(self, prompt: str) -> str:
        """Use Google Generative AI to categorize the transaction"""
        model = genai.GenerativeModel(self.settings.GOOGLE_MODEL)
        response = model.generate_content(prompt)
        return response.text

    async def _categorize_with_ollama(self, prompt: str) -> str:
        """Use Ollama to categorize the transaction"""
        response = ollama.chat(
            model=self.settings.OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": "You are a financial assistant that categorizes transactions."},
                {"role": "user", "content": prompt}
            ]
        )
        return response['message']['content']