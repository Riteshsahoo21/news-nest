"""
Curated catalog of high-credibility news RSS feeds with country, category,
language, and home-visibility configurations.
"""

FEED_SOURCES = [
    # --- WORLD NEWS ---
    {
        "sourceName": "BBC News World",
        "url": "http://feeds.bbci.co.uk/news/world/rss.xml",
        "category": "world",
        "subCategory": "general",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "Al Jazeera English",
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "category": "world",
        "subCategory": "general",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },

    # --- POLITICS ---
    {
        "sourceName": "Politico",
        "url": "https://rss.politico.com/politics-news.xml",
        "category": "politics",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "The Hill",
        "url": "https://thehill.com/feed/",
        "category": "politics",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },

    # --- BUSINESS ---
    {
        "sourceName": "CNBC Finance",
        "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html",
        "category": "business",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "MarketWatch",
        "url": "https://feeds.content.dowjones.io/public/rss/mw_topstories",
        "category": "business",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },

    # --- TECHNOLOGY ---
    {
        "sourceName": "TechCrunch",
        "url": "https://techcrunch.com/feed/",
        "category": "technology",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "The Verge",
        "url": "https://www.theverge.com/rss/index.xml",
        "category": "technology",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "Wired",
        "url": "https://www.wired.com/feed/rss",
        "category": "technology",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },

    # --- SCIENCE ---
    {
        "sourceName": "Phys.org",
        "url": "https://phys.org/rss-feed/",
        "category": "science",
        "subCategory": "general",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "Scientific American",
        "url": "http://rss.sciam.com/ScientificAmerican-Global",
        "category": "science",
        "subCategory": "general",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },

    # --- HEALTH ---
    {
        "sourceName": "NYT Health",
        "url": "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml",
        "category": "health",
        "subCategory": "general",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "Harvard Health",
        "url": "https://www.health.harvard.edu/blog/feed",
        "category": "health",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "Medical News Today",
        "url": "https://www.medicalnewstoday.com/feed",
        "category": "health",
        "subCategory": "general",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": False
    },
    {
        "sourceName": "ScienceDaily Health",
        "url": "https://www.sciencedaily.com/rss/top/health.xml",
        "category": "health",
        "subCategory": "general",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "Medical Xpress",
        "url": "https://medicalxpress.com/rss-feed/",
        "category": "health",
        "subCategory": "general",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "NIH Research Matters",
        "url": "https://www.nih.gov/nih-research-matters/feed.xml",
        "category": "health",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },

    # --- SPORTS (Traditional) ---
    {
        "sourceName": "ESPN News",
        "url": "https://www.espn.com/espn/rss/news",
        "category": "sports",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "BBC Sport",
        "url": "http://feeds.bbci.co.uk/sport/rss.xml",
        "category": "sports",
        "subCategory": "general",
        "country": "gb",
        "language": "en",
        "isFeaturedOnHome": True
    },

    # --- FOOTBALL (Soccer) ---
    {
        "sourceName": "BBC Sport Football",
        "url": "http://feeds.bbci.co.uk/sport/football/rss.xml",
        "category": "sports",
        "subCategory": "football",
        "country": "gb",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "ESPN FC",
        "url": "https://www.espn.com/espn/rss/soccer/news",
        "category": "sports",
        "subCategory": "football",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "Sky Sports Football",
        "url": "https://www.skysports.com/rss/12040",
        "category": "sports",
        "subCategory": "football",
        "country": "gb",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "The Guardian Football",
        "url": "https://www.theguardian.com/football/rss",
        "category": "sports",
        "subCategory": "football",
        "country": "gb",
        "language": "en",
        "isFeaturedOnHome": True
    },

    # --- ESPORTS & COMPETITIVE GAMING ---
    {
        "sourceName": "Dot Esports",
        "url": "https://dotesports.com/feed",
        "category": "sports",
        "subCategory": "esports",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "Esports Insider",
        "url": "https://esportsinsider.com/feed",
        "category": "sports",
        "subCategory": "esports",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "Dexerto Esports",
        "url": "https://www.dexerto.com/esports/feed/",
        "category": "sports",
        "subCategory": "esports",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": False
    },
    {
        "sourceName": "Esports News UK",
        "url": "https://esports-news.co.uk/feed/",
        "category": "sports",
        "subCategory": "esports",
        "country": "gb",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "Esports.net",
        "url": "https://www.esports.net/feed/",
        "category": "sports",
        "subCategory": "esports",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "ESTNN",
        "url": "https://estnn.com/feed/",
        "category": "sports",
        "subCategory": "esports",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": False
    },
    {
        "sourceName": "HLTV",
        "url": "https://www.hltv.org/rss/news",
        "category": "sports",
        "subCategory": "esports",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "esports.gg",
        "url": "https://esports.gg/feed/",
        "category": "sports",
        "subCategory": "esports",
        "country": "global",
        "language": "en",
        "isFeaturedOnHome": True
    },

    # --- ENTERTAINMENT ---
    {
        "sourceName": "Deadline",
        "url": "https://deadline.com/feed/",
        "category": "entertainment",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "Variety",
        "url": "https://variety.com/feed/",
        "category": "entertainment",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "The Hollywood Reporter",
        "url": "https://www.hollywoodreporter.com/feed/",
        "category": "entertainment",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },

    # --- LIFESTYLE ---
    {
        "sourceName": "Architectural Digest",
        "url": "https://www.architecturaldigest.com/feed/rss",
        "category": "lifestyle",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "GQ Magazine",
        "url": "https://www.gq.com/feed/rss",
        "category": "lifestyle",
        "subCategory": "general",
        "country": "us",
        "language": "en",
        "isFeaturedOnHome": True
    },

    # --- INDIA & REGIONAL (English & Hindi) ---
    {
        "sourceName": "The Hindu",
        "url": "https://www.thehindu.com/news/national/feeder/default.rss",
        "category": "world",
        "subCategory": "national",
        "country": "in",
        "language": "en",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "BBC News Hindi",
        "url": "http://feeds.bbci.co.uk/hindi/rss.xml",
        "category": "world",
        "subCategory": "regional",
        "country": "in",
        "language": "hi",
        "isFeaturedOnHome": True
    },
    {
        "sourceName": "NDTV India",
        "url": "https://feeds.feedburner.com/ndtvkhabar",
        "category": "world",
        "subCategory": "regional",
        "country": "in",
        "language": "hi",
        "isFeaturedOnHome": False
    },
    {
        "sourceName": "Aaj Tak",
        "url": "https://aajtak.in/rssfeed.xml",
        "category": "world",
        "subCategory": "regional",
        "country": "in",
        "language": "hi",
        "isFeaturedOnHome": False
    },
]
