import os
from dotenv import load_dotenv

# Load environmental variables from .env if present
load_dotenv()

# Groq API configurations
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL_ANALYZER = os.getenv("GROQ_MODEL_ANALYZER", "llama3-70b-8192")
GROQ_MODEL_OPTIMIZER = os.getenv("GROQ_MODEL_OPTIMIZER", "llama3-70b-8192")

# Shopify API configurations
SHOPIFY_SHOP_URL = os.getenv("SHOPIFY_SHOP_URL", "")
SHOPIFY_ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN", "")
