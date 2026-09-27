"""
Image helper module providing fallback curated high-resolution editorial images,
URL cleanup, and HTML image extraction utilities.
"""
from urllib.parse import urljoin, urlparse

CATEGORY_FALLBACK_IMAGES = {
    "world": "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1200&h=800&fit=crop",
    "politics": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200&h=800&fit=crop",
    "business": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=800&fit=crop",
    "technology": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=800&fit=crop",
    "science": "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=1200&h=800&fit=crop",
    "health": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&h=800&fit=crop",
    "sports": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&h=800&fit=crop",
    "esports": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=800&fit=crop",
    "entertainment": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=800&fit=crop",
    "lifestyle": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&h=800&fit=crop",
    "in": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&h=800&fit=crop",
    "default": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=800&fit=crop"
}

def get_category_fallback_image(category: str = "", sub_category: str = "", country: str = "") -> str:
    """Returns guaranteed high-resolution fallback image URL matching category or region."""
    cat = (category or "").lower().strip()
    sub = (sub_category or "").lower().strip()
    c = (country or "").lower().strip()

    if sub == "esports":
        return CATEGORY_FALLBACK_IMAGES["esports"]
    if c == "in" and cat in ["world", "general", "politics", ""]:
        return CATEGORY_FALLBACK_IMAGES["in"]
    if cat in CATEGORY_FALLBACK_IMAGES:
        return CATEGORY_FALLBACK_IMAGES[cat]
    
    return CATEGORY_FALLBACK_IMAGES["default"]

def is_valid_image_url(url: str) -> bool:
    """Filters out tracking pixels, empty strings, and spacer GIFs."""
    if not url or not isinstance(url, str):
        return False
    clean = url.lower().strip()
    if not (clean.startswith("http://") or clean.startswith("https://")):
        return False
    # Filter 1x1 tracking pixels or ad gifs
    bad_markers = ["1x1", "spacer", "tracking", "pixel", "blank.gif", "avatar", "icon-", "logo-small"]
    for b in bad_markers:
        if b in clean:
            return False
    return True

def clean_and_resolve_image_url(image_url: str, base_url: str = "") -> str:
    """Resolves relative image URLs and ensures valid scheme."""
    if not image_url or not isinstance(image_url, str):
        return ""
    img = image_url.strip()
    if img.startswith("//"):
        img = "https:" + img
    elif img.startswith("/") and base_url:
        img = urljoin(base_url, img)
    
    return img if is_valid_image_url(img) else ""
