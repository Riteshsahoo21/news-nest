import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# Request timeout in seconds per feed
REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "7.0"))

# Max articles per feed
MAX_ARTICLES_PER_FEED = int(os.getenv("MAX_ARTICLES_PER_FEED", "10"))

# Gemini API Key (optional for AI summary)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

DEFAULT_USER_AGENT = os.getenv(
    "NEWS_APP_USER_AGENT",
    "NewsNests/1.0 (+http://localhost:5174) Mozilla/5.0 Chrome/124 Safari/537.36"
)
