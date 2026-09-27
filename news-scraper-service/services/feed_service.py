import asyncio
import re
from typing import List, Optional
import feedparser
import httpx
from bs4 import BeautifulSoup
from config import DEFAULT_USER_AGENT, REQUEST_TIMEOUT, MAX_ARTICLES_PER_FEED
from schemas.news import NewsItemMetadata
from services.sources import FEED_SOURCES
from services.image_helper import get_category_fallback_image, clean_and_resolve_image_url
from services.discovery_service import fetch_discovery_metadata, repair_mojibake

ESPORTS_DENY_TERMS = (
    "casino", "promo code", "referral code", "betting", "betting bonus",
    "sportsbook", "sweepstakes", "free spins", "gambling", "rakeback",
    "prediction market", "kalshi", "roobet",
)

ESPORTS_STORY_TERMS = (
    "esports", "e-sports", "valorant", "counter-strike", " cs2", "dota",
    "league of legends", "overwatch", "rocket league", "fortnite", "pubg",
    "rainbow six", "call of duty", "starcraft", "fgc", "fighting game",
    "vct", "lcs", "lec", "iem", "blast premier", "esl pro", "tournament",
)

ESPORTS_ONLY_SOURCES = {"hltv", "esports insider", "esports news uk"}


def is_esports_story(title: str, summary: str, source_name: str) -> bool:
    combined = f" {title} {summary} ".lower()
    if any(term in combined for term in ESPORTS_DENY_TERMS):
        return False
    if source_name.strip().lower() in ESPORTS_ONLY_SOURCES:
        return True
    return any(term in combined for term in ESPORTS_STORY_TERMS)

def clean_html_text(raw_html: str, preserve_paragraphs: bool = True) -> str:
    """Removes HTML tags while preserving semantic paragraph breaks."""
    if not raw_html:
        return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    for tag in soup(["script", "style", "noscript", "iframe", "svg"]):
        tag.decompose()

    if preserve_paragraphs:
        for block in soup.find_all(["p", "div", "br", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "tr"]):
            block.append("\n\n")
        text = soup.get_text()
        lines = [line.strip() for line in text.splitlines()]
        text = "\n".join(lines)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        return repair_mojibake(text)
    else:
        text = soup.get_text(separator=" ")
        return repair_mojibake(re.sub(r"\s+", " ", text).strip())

def extract_image_from_entry(entry, base_url: str = "") -> str:
    """Extracts high-resolution image URL from feedparser entry."""
    # 1. Media content
    if "media_content" in entry and entry.media_content:
        for media in entry.media_content:
            url = media.get("url")
            if url and (media.get("type", "").startswith("image") or url.endswith((".jpg", ".png", ".webp", ".jpeg", ".avif"))):
                cleaned = clean_and_resolve_image_url(url, base_url)
                if cleaned:
                    return cleaned

    # 2. Media thumbnail
    if "media_thumbnail" in entry and entry.media_thumbnail:
        for thumb in entry.media_thumbnail:
            url = thumb.get("url")
            if url:
                cleaned = clean_and_resolve_image_url(url, base_url)
                if cleaned:
                    return cleaned

    # 3. Enclosures
    if "enclosures" in entry and entry.enclosures:
        for enc in entry.enclosures:
            url = enc.get("href") or enc.get("url")
            if url and (enc.get("type", "").startswith("image") or url.endswith((".jpg", ".png", ".webp", ".jpeg", ".avif"))):
                cleaned = clean_and_resolve_image_url(url, base_url)
                if cleaned:
                    return cleaned

    # 4. Links with image type or rel=enclosure
    if "links" in entry and entry.links:
        for link in entry.links:
            url = link.get("href")
            if url and (link.get("type", "").startswith("image") or link.get("rel") == "enclosure"):
                cleaned = clean_and_resolve_image_url(url, base_url)
                if cleaned:
                    return cleaned

    # 5. Search within description / summary HTML
    raw_desc = entry.get("summary", "") or entry.get("description", "")
    if raw_desc and "<img" in raw_desc:
        soup = BeautifulSoup(raw_desc, "html.parser")
        img_tag = soup.find("img")
        if img_tag:
            src = img_tag.get("src") or img_tag.get("data-src") or img_tag.get("data-original")
            if src:
                cleaned = clean_and_resolve_image_url(src, base_url)
                if cleaned:
                    return cleaned

    return ""

async def fetch_single_feed(client: httpx.AsyncClient, feed_meta: dict) -> List[NewsItemMetadata]:
    """Fetches and parses a single RSS feed asynchronously."""
    articles: List[NewsItemMetadata] = []
    try:
        response = await client.get(
            feed_meta["url"],
            headers={"User-Agent": DEFAULT_USER_AGENT},
            timeout=REQUEST_TIMEOUT
        )
        if response.status_code != 200:
            return articles

        parsed = feedparser.parse(response.text)
        entries = parsed.entries[:MAX_ARTICLES_PER_FEED]

        for entry in entries:
            title = clean_html_text(entry.get("title", ""), preserve_paragraphs=False)
            if not title or len(title) < 10:
                continue

            summary = clean_html_text(entry.get("summary", "") or entry.get("description", ""), preserve_paragraphs=True)
            if feed_meta.get("subCategory", "").lower() == "esports" and not is_esports_story(
                title,
                summary,
                feed_meta.get("sourceName", "")
            ):
                continue
            link = entry.get("link", "")
            if not link:
                continue

            # Check if feed provides full content in content:encoded
            raw_content = ""
            if "content" in entry and entry.content:
                for c in entry.content:
                    if "value" in c and len(c["value"]) > len(raw_content):
                        raw_content = c["value"]

            full_text = clean_html_text(raw_content) if raw_content else ""
            is_full = len(full_text) > 300

            image_url = extract_image_from_entry(entry, link)
            if not image_url and raw_content and "<img" in raw_content:
                soup_img = BeautifulSoup(raw_content, "html.parser").find("img")
                if soup_img:
                    src = soup_img.get("src") or soup_img.get("data-src")
                    if src:
                        image_url = clean_and_resolve_image_url(src, link)

            # If no real image was provided by the feed or content, keep image_url empty
            if not image_url or "unsplash.com" in image_url:
                image_url = ""

            published = entry.get("published", "") or entry.get("updated", "")

            # Word count for read time
            effective_text = full_text if is_full else summary
            word_count = len(effective_text.split())
            read_time = max(1, round(word_count / 180))

            articles.append(NewsItemMetadata(
                title=title,
                summary=summary[:300] if summary else title,
                content=full_text if is_full else (summary or title),
                isFullContentFetched=is_full,
                category=feed_meta["category"],
                subCategory=feed_meta.get("subCategory", "general"),
                country=feed_meta.get("country", "global"),
                language=feed_meta.get("language", "en"),
                sourceName=feed_meta["sourceName"],
                sourceUrl=link,
                imageUrl=image_url,
                mediaUrls=[image_url] if image_url else [],
                isFeaturedOnHome=feed_meta.get("isFeaturedOnHome", True),
                publishedAt=published,
                readTime=read_time,
                region=feed_meta.get("region", ""),
                city=feed_meta.get("city", "")
            ))
    except Exception as e:
        # Ignore individual feed network failures gracefully
        pass

    return articles

async def fetch_filtered_metadata(
    category: Optional[str] = None,
    sub_category: Optional[str] = None,
    country: Optional[str] = None,
    language: Optional[str] = None,
    is_featured_on_home: Optional[bool] = None,
    query: Optional[str] = None,
    city: Optional[str] = None,
    region: Optional[str] = None,
    include_discovery: bool = True,
    limit: int = 30
) -> List[NewsItemMetadata]:
    """Fetches metadata from curated feeds and broad discovery providers."""
    # Filter sources based on parameters
    matched_sources = []
    for src in FEED_SOURCES:
        if category and category.lower() != "all" and src["category"].lower() != category.lower():
            continue
        if sub_category and src.get("subCategory", "").lower() != sub_category.lower():
            continue
        if country and country.lower() != "all" and src.get("country", "").lower() != country.lower():
            continue
        if language and src.get("language", "").lower() != language.lower():
            continue
        matched_sources.append(src)

    if not matched_sources:
        # A filtered request must never silently return unrelated categories.
        # With no filters, the full catalog remains the intended default.
        has_filter = any([category, sub_category, country, language, is_featured_on_home is not None])
        is_live_discovery = bool(query or city or region)
        known_discovery_filter = (
            (category or "").lower() in {
                "world", "politics", "business", "technology", "science",
                "health", "sports", "entertainment", "lifestyle"
            }
            or (sub_category or "").lower() == "esports"
            or bool(country)
        )
        if has_filter and not is_live_discovery and not known_discovery_filter:
            return []
        if not has_filter:
            matched_sources = FEED_SOURCES

    # Query/location discovery is handled by search indexes rather than by
    # downloading every curated feed and accidentally returning unrelated
    # recent headlines. Scheduled category syncs still use both layers.
    curated_sources = [] if (query or city or region) else matched_sources

    async with httpx.AsyncClient(
        follow_redirects=True,
        headers={"User-Agent": DEFAULT_USER_AGENT}
    ) as client:
        feed_task = asyncio.gather(*(fetch_single_feed(client, src) for src in curated_sources))
        discovery_task = fetch_discovery_metadata(
            client,
            query=query,
            category=category,
            sub_category=sub_category,
            country=country,
            language=language,
            city=city,
            region=region,
            limit=min(max(limit, 1), 30)
        ) if include_discovery else asyncio.sleep(0, result={})
        feed_results, discovery_results = await asyncio.gather(feed_task, discovery_task)

    # Treat each publisher feed and each discovery provider as a separate
    # bucket. Round-robin below prevents one provider from monopolizing output.
    results = [*feed_results, *discovery_results.values()]

    # Flatten and deduplicate by URL & normalized title
    all_articles: List[NewsItemMetadata] = []
    seen_urls = set()
    seen_titles = set()

    # Round-robin sources so a high-volume first feed cannot crowd every other
    # publisher out of a category's quota.
    max_feed_size = max((len(feed_articles) for feed_articles in results), default=0)
    for article_index in range(max_feed_size):
        for feed_articles in results:
            if article_index >= len(feed_articles):
                continue
            article = feed_articles[article_index]
            norm_title = re.sub(r"[\W_]", "", article.title.lower(), flags=re.UNICODE)
            if article.sourceUrl in seen_urls or norm_title in seen_titles:
                continue

            # Check home visibility filter if requested
            if is_featured_on_home is not None and article.isFeaturedOnHome != is_featured_on_home:
                continue

            seen_urls.add(article.sourceUrl)
            seen_titles.add(norm_title)
            all_articles.append(article)

            if len(all_articles) >= limit:
                return all_articles

    return all_articles[:limit]
