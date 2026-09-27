import re
import json
from typing import Optional, List
import httpx
import trafilatura
from bs4 import BeautifulSoup
from config import DEFAULT_USER_AGENT, REQUEST_TIMEOUT
from schemas.news import FullContentResult
from services.image_helper import get_category_fallback_image, clean_and_resolve_image_url, is_valid_image_url

ARTICLE_SELECTORS = [
    'article',
    'main',
    '[itemprop="articleBody"]',
    '.story-body',
    '.article-content',
    '.article-body',
    '.entry-content',
    '.post-content',
    '.content__article-body',
    '#main-content',
    '#article-body',
    '.story-content',
    '.caas-body'
]

NOISE_PATTERNS = [
    r'sign up for our newsletter',
    r'follow us on (twitter|facebook|instagram|x|threads|linkedin)',
    r'advertisement',
    r'read more:',
    r'also read:',
    r'related (stories|articles):',
    r'more from',
    r'listen to this article',
    r'unlock ai briefing',
    r'copyright \d{4}',
    r'all rights reserved',
    r'terms of (service|use)',
    r'privacy policy',
    r'click here to',
    r'subscribe to',
    r'trending now',
    r'sponsored content',
    r'share this (story|article)',
    r'leave a comment',
    r'download the app'
]

NOISE_SELECTORS = [
    "script", "style", "nav", "footer", "aside", "form", "noscript",
    "figcaption",
    '[class*="related"]', '[class*="recommend"]', '[class*="read-more"]', '[class*="more-stories"]',
    '[class*="topic"]', '[class*="tag-cloud"]', '[class*="tags"]', '[class*="breadcrumb"]',
    '[class*="newsletter"]', '[class*="subscribe"]', '[class*="social"]', '[class*="share"]',
    '[class*="podcast"]', '[class*="audio-player"]', '[class*="listen-"]',
    '[class*="outbrain"]', '[class*="taboola"]', '[class*="advert"]', '[class*="ad-"]', '[class*="sponsored"]',
    '[class*="caption"]', '[class*="credit"]', '[class*="byline"]', '[class*="author-bio"]'
]

def is_noise_paragraph(text: str) -> bool:
    """Checks if a paragraph is boilerplate noise or social junk."""
    lowered = text.lower().strip()
    if len(lowered) < 30:
        return True
    for pat in NOISE_PATTERNS:
        if re.search(pat, lowered):
            return True
    return False

def clean_extracted_text(text: str) -> str:
    """Cleans up raw extracted text, stripping topic clouds, audio player prompts, and noise."""
    if not text:
        return ""

    # 1. Remove trailing or inline Topic: blocks (e.g. ABC news topic clouds)
    text = re.sub(r'(\bTopic:[^\n]+\s*)+$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'(?:^|\n)Topic:[^\n]+(?:\n|$)', '\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'\bTopic:[A-Za-z0-9&/-]+(?:\s+Topic:[A-Za-z0-9&/-]+)*', '', text, flags=re.IGNORECASE)

    # 2. Remove audio player / paywall announcements
    text = re.sub(r'Listen to this article in summarized format\s*Unlock AI Briefing and Premium Content', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Listen to this article(?:\s*\(.*?\))?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Unlock AI Briefing(?:\s*and Premium Content)?', '', text, flags=re.IGNORECASE)

    # 3. Remove photo/image credits e.g. (Image - iStock), (AP: Richard Drew)
    text = re.sub(r'\((?:Image|Photo|AP|Reuters|AFP|Getty Images|iStock)[^)]*\)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\[(?:Image|Photo|AP|Reuters|AFP|Getty Images|iStock)[^\]]*\]', '', text, flags=re.IGNORECASE)

    # 4. Split into paragraphs and filter
    raw_paras = [p.strip() for p in text.splitlines() if p.strip()]
    cleaned_paras = []
    for p in raw_paras:
        if is_noise_paragraph(p):
            continue
        p_clean = re.sub(r'[ \t]+', ' ', p).strip()
        cleaned_paras.append(p_clean)

    # 5. Group into cohesive, readable editorial paragraphs
    final_paras = []
    current_para = ""
    for p in cleaned_paras:
        # If it looks like a headline/subhead, keep as its own block
        if len(p) < 80 and not p.endswith((".", "!", "?", '\"', "\'")):
            if current_para:
                final_paras.append(current_para)
                current_para = ""
            final_paras.append(p)
        else:
            if current_para:
                current_para += " " + p
            else:
                current_para = p
            if len(current_para) >= 220 or current_para.endswith((".", "!", "?", '\"', "\'")):
                final_paras.append(current_para)
                current_para = ""

    if current_para:
        final_paras.append(current_para)

    joined = "\n\n".join(final_paras)
    return re.sub(r"\n{3,}", "\n\n", joined).strip()

import urllib.request
import asyncio

def is_valid_article_media(url: str) -> bool:
    """Filters out icons, tracking pixels, logos, and author avatars."""
    if not url or not url.startswith('http'):
        return False
    lowered = url.lower()
    bad_tokens = ['avatar', 'badge', 'logo', 'icon', '32x32', '64x64', '1x1', 'pixel', 'advert', 'tracker', 'sponsor', 'button']
    return not any(b in lowered for b in bad_tokens)

def iter_json_objects(value):
    """Yields dictionaries from nested JSON-LD arrays and @graph blocks."""
    if isinstance(value, list):
        for item in value:
            yield from iter_json_objects(item)
    elif isinstance(value, dict):
        yield value
        if "@graph" in value:
            yield from iter_json_objects(value["@graph"])

def extract_meta_tags(html: str, base_url: str = "") -> dict:
    """Extracts OpenGraph, Twitter, JSON-LD, in-article media, and standard metadata from HTML."""
    soup = BeautifulSoup(html, "html.parser")
    meta_info = {
        "title": "",
        "author": "",
        "image": "",
        "media_urls": [],
        "tags": [],
        "description": "",
        "article_body": "",
        "published_at": None
    }

    # 1. Title
    og_title = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "twitter:title"})
    if og_title and og_title.get("content"):
        meta_info["title"] = og_title["content"].strip()
    elif soup.title and soup.title.string:
        meta_info["title"] = soup.title.string.strip()

    # 2. Image (OpenGraph & Twitter tags)
    og_image = (
        soup.find("meta", property="og:image") or 
        soup.find("meta", attrs={"name": "twitter:image"}) or
        soup.find("meta", attrs={"name": "twitter:image:src"}) or
        soup.find("meta", attrs={"itemprop": "image"}) or
        soup.find("meta", attrs={"name": "thumbnail"})
    )
    if og_image and og_image.get("content"):
        meta_info["image"] = clean_and_resolve_image_url(og_image["content"].strip(), base_url)

    # 3. Image (link rel=image_src)
    if not meta_info["image"]:
        link_img = soup.find("link", rel=re.compile(r"image_src", re.I))
        if link_img and link_img.get("href"):
            meta_info["image"] = clean_and_resolve_image_url(link_img["href"].strip(), base_url)

    # 4. Image (JSON-LD structured data)
    if not meta_info["image"]:
        for ld in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(ld.string or "")
                items = data if isinstance(data, list) else [data]
                for item in items:
                    sub_items = item.get("@graph", [item]) if isinstance(item, dict) and "@graph" in item else [item]
                    for obj in sub_items:
                        if not isinstance(obj, dict):
                            continue
                        img = obj.get("image") or obj.get("thumbnailUrl")
                        found_url = ""
                        if isinstance(img, str) and img:
                            found_url = img
                        elif isinstance(img, list) and img and isinstance(img[0], str):
                            found_url = img[0]
                        elif isinstance(img, dict) and img.get("url"):
                            found_url = img["url"]
                        
                        if found_url:
                            cleaned = clean_and_resolve_image_url(found_url, base_url)
                            if cleaned:
                                meta_info["image"] = cleaned
                                break
                    if meta_info["image"]:
                        break
            except Exception:
                pass

    # Extract structured article fields independently of whether an OpenGraph
    # image was present. Many modern publishers put their complete body only in
    # NewsArticle JSON-LD.
    for ld in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(ld.string or "")
            for obj in iter_json_objects(data):
                obj_type = obj.get("@type", "")
                type_values = obj_type if isinstance(obj_type, list) else [obj_type]
                is_article = any("article" in str(value).lower() for value in type_values)
                if not is_article:
                    continue

                body = obj.get("articleBody") or ""
                if isinstance(body, str) and len(body) > len(meta_info["article_body"]):
                    meta_info["article_body"] = body

                if not meta_info["published_at"]:
                    meta_info["published_at"] = obj.get("datePublished") or obj.get("dateCreated")

                if not meta_info["author"]:
                    author = obj.get("author")
                    if isinstance(author, str):
                        meta_info["author"] = author.strip()
                    elif isinstance(author, dict):
                        meta_info["author"] = str(author.get("name", "")).strip()
                    elif isinstance(author, list):
                        names = [str(item.get("name", "")).strip() for item in author if isinstance(item, dict)]
                        meta_info["author"] = ", ".join(filter(None, names))

                keywords = obj.get("keywords")
                if not meta_info["tags"] and keywords:
                    raw_keywords = keywords if isinstance(keywords, list) else str(keywords).split(",")
                    meta_info["tags"] = [str(keyword).strip() for keyword in raw_keywords if str(keyword).strip()][:8]
        except Exception:
            pass

    # 5. Extract all in-article media photos (figures & content body images)
    article_container = (
        soup.find('article') or 
        soup.find('main') or 
        soup.find(attrs={'itemprop': 'articleBody'}) or
        soup.find(class_=re.compile(r'story-body|article-body|entry-content|post-content', re.I))
    )
    search_root = article_container or soup
    collected_media = []

    for img in search_root.find_all("img"):
        raw_src = img.get("src") or img.get("data-src") or img.get("data-lazy-src") or img.get("data-original")
        if raw_src:
            resolved = clean_and_resolve_image_url(raw_src, base_url)
            if resolved and is_valid_article_media(resolved) and resolved not in collected_media:
                collected_media.append(resolved)

    meta_info["media_urls"] = collected_media

    # If primary image not set, use first in-article media image
    if not meta_info["image"] and collected_media:
        meta_info["image"] = collected_media[0]

    # Author
    author_meta = (
        soup.find("meta", attrs={"name": "author"}) or
        soup.find("meta", property="article:author") or
        soup.find("meta", attrs={"name": "twitter:creator"})
    )
    if author_meta and author_meta.get("content"):
        meta_info["author"] = author_meta["content"].strip()

    description_meta = (
        soup.find("meta", property="og:description") or
        soup.find("meta", attrs={"name": "description"}) or
        soup.find("meta", attrs={"name": "twitter:description"})
    )
    if description_meta and description_meta.get("content"):
        meta_info["description"] = description_meta["content"].strip()

    if not meta_info["published_at"]:
        date_meta = (
            soup.find("meta", property="article:published_time") or
            soup.find("meta", attrs={"name": "date"}) or
            soup.find("meta", attrs={"name": "datePublished"})
        )
        if date_meta and date_meta.get("content"):
            meta_info["published_at"] = date_meta["content"].strip()

    # Tags / Keywords
    keywords_meta = soup.find("meta", attrs={"name": "keywords"}) or soup.find("meta", property="article:tag")
    if keywords_meta and keywords_meta.get("content"):
        raw_keywords = keywords_meta["content"].split(",")
        meta_info["tags"] = [k.strip() for k in raw_keywords if k.strip()][:5]

    return meta_info

def extract_via_selectors(html: str) -> str:
    """Extracts article paragraphs by scanning known news article container classes."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove noise elements from the DOM
    for sel in NOISE_SELECTORS:
        for tag in soup.select(sel):
            tag.decompose()

    for selector in ARTICLE_SELECTORS:
        container = soup.select_one(selector)
        if container:
            paragraphs = []
            for p in container.find_all("p"):
                text = p.get_text().strip()
                if not is_noise_paragraph(text):
                    paragraphs.append(text)
            if len(paragraphs) >= 2:
                joined = "\n\n".join(paragraphs)
                if len(joined) >= 300:
                    return joined

    # Fallback: all clean <p> tags across the whole document
    paragraphs = []
    for p in soup.find_all("p"):
        text = p.get_text().strip()
        if not is_noise_paragraph(text):
            paragraphs.append(text)
    
    if len(paragraphs) >= 2:
        return "\n\n".join(paragraphs)

    return ""

def _fetch_with_urllib(url: str, headers: dict, timeout: float = 12.0) -> str:
    """Synchronous urllib request with modern browser headers for fallback."""
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status == 200:
                return response.read().decode('utf-8', errors='ignore')
    except Exception:
        pass
    return ""

async def extract_full_article(
    url: str,
    fallback_title: Optional[str] = None,
    fallback_content: Optional[str] = None,
    fallback_image: Optional[str] = None,
    category: Optional[str] = None,
    sub_category: Optional[str] = None,
    country: Optional[str] = None
) -> FullContentResult:
    """
    Multi-stage deep article extractor:
    1. Modern browser-emulated HTTP request (httpx with urllib fallback)
    2. Trafilatura full extraction
    3. Targeted container selector parsing (BS4)
    4. Document paragraph aggregation
    5. In-article media images extraction
    Guarantees clean, detailed multi-paragraph text >= 500 characters when possible.
    Guarantees non-empty high-resolution imageUrl and mediaUrls.
    """
    html = ""
    browser_headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
    }

    # Step 1: Attempt httpx
    try:
        async with httpx.AsyncClient(follow_redirects=True, headers=browser_headers) as client:
            response = await client.get(url, timeout=9.0)
            if response.status_code == 200:
                candidate_html = response.text
                if "Just a moment..." not in candidate_html and "Attention Required!" not in candidate_html:
                    html = candidate_html
    except Exception:
        pass

    # Step 2: Fallback to urllib if httpx failed or received anti-bot challenge
    if not html:
        html = await asyncio.to_thread(_fetch_with_urllib, url, browser_headers, 6.0)

    meta_info = {
        "title": "", "author": "", "image": "", "media_urls": [],
        "tags": [], "description": "", "article_body": "", "published_at": None
    }
    candidate_content = ""

    if html:
        meta_info = extract_meta_tags(html, base_url=url)

        # Stage 1: Trafilatura with precision settings
        trafilatura_raw = trafilatura.extract(
            html,
            include_comments=False,
            include_tables=True,
            include_images=False,
            include_links=False,
            favor_recall=True,
            deduplicate=True
        ) or ""

        trafilatura_clean = clean_extracted_text(trafilatura_raw)

        # Stage 2: Target container selectors
        selector_raw = extract_via_selectors(html)
        selector_clean = clean_extracted_text(selector_raw)

        structured_clean = clean_extracted_text(meta_info.get("article_body", ""))

        # Prefer the richest cleaned extraction. Previously a barely 400-char
        # Trafilatura result could hide a much longer selector/JSON-LD body.
        candidate_content = max(
            [trafilatura_clean, selector_clean, structured_clean],
            key=len,
            default=""
        )

    # Stage 3: Fallback content check if web extraction yielded short text
    fallback_candidates = [candidate_content]
    if fallback_content:
        fallback_candidates.append(clean_extracted_text(fallback_content.strip()))
    if meta_info.get("description"):
        fallback_candidates.append(clean_extracted_text(meta_info["description"]))
    candidate_content = max(fallback_candidates, key=len, default="")

    final_content = candidate_content if len(candidate_content) >= 50 else (fallback_content or fallback_title or "Full report details.")

    # Guaranteed non-empty image: Page meta -> Fallback image -> In-article media -> Category fallback
    final_image = meta_info.get("image", "")
    if not final_image and fallback_image:
        final_image = clean_and_resolve_image_url(fallback_image, url)
    if not final_image and meta_info.get("media_urls"):
        final_image = meta_info["media_urls"][0]
    if not final_image:
        final_image = get_category_fallback_image(category or "", sub_category or "", country or "")

    media_urls = meta_info.get("media_urls", [])
    if final_image and final_image not in media_urls:
        media_urls.insert(0, final_image)

    # Calculate word count & reading time
    words = len(final_content.split())
    read_time = max(1, round(words / 200))

    title = meta_info["title"] or fallback_title or "News Article"
    author = meta_info["author"] or "News Desk"
    tags = meta_info["tags"]
    if not tags and fallback_title:
        tags = [w for w in fallback_title.split() if len(w) > 4 and w.isalpha()][:4]

    return FullContentResult(
        title=title,
        content=final_content,
        author=author,
        readTime=read_time,
        tags=tags,
        imageUrl=final_image,
        mediaUrls=media_urls,
        sourceUrl=url,
        aiSummary="",
        keyTakeaways=[],
        publishedAt=meta_info.get("published_at")
    )
