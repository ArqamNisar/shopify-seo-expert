import os
from dotenv import load_dotenv

# Load environmental variables from .env if present
load_dotenv()

# Groq API configurations
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL_ANALYZER = os.getenv("GROQ_MODEL_ANALYZER", "llama-3.3-70b-versatile")
GROQ_MODEL_OPTIMIZER = os.getenv("GROQ_MODEL_OPTIMIZER", "llama-3.3-70b-versatile")

# Shopify API configurations
SHOPIFY_SHOP_URL = os.getenv("SHOPIFY_SHOP_URL", "")
SHOPIFY_ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN", "")
