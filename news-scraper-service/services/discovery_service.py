import asyncio
import base64
import html
import ipaddress
import json
import re
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
from urllib.parse import parse_qs, parse_qsl, unquote, urlencode, urlparse

import feedparser
import httpx
from bs4 import BeautifulSoup

from config import DEFAULT_USER_AGENT
from schemas.news import NewsItemMetadata
from services.image_helper import get_category_fallback_image


DISCOVERY_PROVIDERS = [
    {
        "id": "gdelt",
        "name": "GDELT DOC 2.0",
        "kind": "global-index",
        "requiresKey": False,
    },
    {
        "id": "google-news-rss",
        "name": "Google News RSS",
        "kind": "search-rss",
        "requiresKey": False,
    },
    {
        "id": "bing-news-rss",
        "name": "Bing News RSS",
        "kind": "search-rss",
        "requiresKey": False,
    },
]

KNOWN_CATEGORIES = {
    "world",
    "politics",
    "business",
    "technology",
    "science",
    "health",
    "sports",
    "entertainment",
    "lifestyle",
}

CATEGORY_QUERIES = {
    "world": '("world news" OR international OR diplomacy OR conflict)',
    "politics": '(politics OR election OR parliament OR government)',
    "business": '(business OR economy OR markets OR companies)',
    "technology": '(technology OR software OR artificial intelligence OR cybersecurity)',
    "science": '(science OR research OR discovery OR space)',
    "health": '(health OR medicine OR healthcare OR disease)',
    "sports": '(sports OR tournament OR league OR championship)',
    "entertainment": '(entertainment OR film OR television OR music)',
    "lifestyle": '(lifestyle OR travel OR food OR fashion OR culture)',
    "esports": '(esports OR "e-sports" OR valorant OR "counter-strike" OR dota OR "league of legends")',
}

COUNTRY_SETTINGS = {
    "in": {"name": "India", "hl": "en-IN", "gl": "IN", "ceid": "IN:en", "mkt": "en-IN"},
    "us": {"name": "United States", "hl": "en-US", "gl": "US", "ceid": "US:en", "mkt": "en-US"},
    "gb": {"name": "United Kingdom", "hl": "en-GB", "gl": "GB", "ceid": "GB:en", "mkt": "en-GB"},
    "au": {"name": "Australia", "hl": "en-AU", "gl": "AU", "ceid": "AU:en", "mkt": "en-AU"},
    "ca": {"name": "Canada", "hl": "en-CA", "gl": "CA", "ceid": "CA:en", "mkt": "en-CA"},
}

COUNTRY_NAME_TO_CODE = {
    settings["name"].lower(): code for code, settings in COUNTRY_SETTINGS.items()
}

CATEGORY_HINTS = {
    "politics": ("election", "minister", "president", "parliament", "government", "politic"),
    "business": ("market", "stock", "economy", "company", "business", "finance", "bank"),
    "technology": ("technology", "software", "ai ", "artificial intelligence", "cyber", "startup", "device"),
    "science": ("science", "research", "space", "nasa", "discovery", "study"),
    "health": ("health", "medical", "medicine", "hospital", "disease", "vaccine"),
    "sports": ("match", "league", "tournament", "championship", "football", "cricket", "sport"),
    "entertainment": ("film", "movie", "television", "actor", "music", "entertainment"),
    "lifestyle": ("travel", "food", "fashion", "lifestyle", "culture", "recipe"),
}

_CACHE_TTL_SECONDS = 300
_CACHE_MAX_ENTRIES = 200
_cache: Dict[str, tuple] = {}
_gdelt_lock = asyncio.Lock()
_last_gdelt_request = 0.0
_gdelt_blocked_until = 0.0


def _clean_query_part(value: Optional[str], max_length: int = 160) -> str:
    if not value:
        return ""
    value = html.unescape(str(value))
    value = re.sub(r"[^\w\s.\-'’]", " ", value, flags=re.UNICODE)
    return re.sub(r"\s+", " ", value).strip()[:max_length]


def _quoted(value: str) -> str:
    cleaned = _clean_query_part(value, 100)
    if not cleaned:
        return ""
    return f'"{cleaned}"'


def build_discovery_query(
    query: Optional[str] = None,
    category: Optional[str] = None,
    sub_category: Optional[str] = None,
    city: Optional[str] = None,
    region: Optional[str] = None,
    country: Optional[str] = None,
) -> str:
    """Build a provider-safe query with topical and regional context."""
    parts: List[str] = []
    clean_query = _clean_query_part(query)
    if clean_query:
        parts.append(clean_query)

    normalized_subcategory = (sub_category or "").strip().lower()
    normalized_category = (category or "").strip().lower()
    topic_key = "esports" if normalized_subcategory == "esports" else normalized_category
    if topic_key in CATEGORY_QUERIES and not clean_query:
        parts.append(CATEGORY_QUERIES[topic_key])

    locations = [_quoted(value) for value in (city, region) if _clean_query_part(value, 100)]
    locations = list(dict.fromkeys(filter(None, locations)))
    if len(locations) == 1:
        parts.append(locations[0])
    elif locations:
        parts.append(f"({' OR '.join(locations)})")

    if not locations and not clean_query and country and country.lower() != "global":
        country_name = _country_settings(country)["name"]
        if country_name:
            parts.append(_quoted(country_name))

    if not parts and normalized_category in KNOWN_CATEGORIES:
        parts.append(CATEGORY_QUERIES[normalized_category])
    if not parts and normalized_subcategory == "esports":
        parts.append(CATEGORY_QUERIES["esports"])

    return " ".join(parts).strip()


def _country_settings(country: Optional[str]) -> dict:
    code = (country or "").strip().lower()
    return COUNTRY_SETTINGS.get(
        code,
        {"name": "India", "hl": "en-IN", "gl": "IN", "ceid": "IN:en", "mkt": "en-IN"},
    )


def _cache_get(key: str):
    cached = _cache.get(key)
    if not cached:
        return None
    created_at, value = cached
    if time.monotonic() - created_at > _CACHE_TTL_SECONDS:
        _cache.pop(key, None)
        return None
    return value


def _cache_set(key: str, value):
    if len(_cache) >= _CACHE_MAX_ENTRIES:
        oldest_key = min(_cache, key=lambda item: _cache[item][0])
        _cache.pop(oldest_key, None)
    _cache[key] = (time.monotonic(), value)


def _is_public_http_url(value: str) -> bool:
    try:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return False
        hostname = parsed.hostname.lower().rstrip(".")
        if hostname in {"localhost", "localhost.localdomain"} or hostname.endswith(".local"):
            return False
        try:
            address = ipaddress.ip_address(hostname)
            return not (
                address.is_private
                or address.is_loopback
                or address.is_link_local
                or address.is_reserved
                or address.is_multicast
            )
        except ValueError:
            return True
    except Exception:
        return False


def _normalize_url(value: str) -> str:
    if not _is_public_http_url(value):
        return ""
    parsed = urlparse(value)
    tracking_keys = {
        "gclid", "fbclid", "mc_cid", "mc_eid", "oc", "ref", "referrer",
        "source", "campaign", "cmpid",
    }
    clean_query = urlencode([
        (key, item)
        for key, item in parse_qsl(parsed.query, keep_blank_values=True)
        if not key.lower().startswith("utm_") and key.lower() not in tracking_keys
    ])
    return parsed._replace(
        scheme=parsed.scheme.lower(),
        netloc=parsed.netloc.lower(),
        query=clean_query,
        fragment="",
    ).geturl()


def _publisher_from_url(value: str) -> str:
    hostname = (urlparse(value).hostname or "").lower()
    if hostname.startswith("www."):
        hostname = hostname[4:]
    return hostname or "News publisher"


def repair_mojibake(value: str) -> str:
    repaired = str(value or "")
    markers = ("Ã", "Â", "â")
    for _ in range(3):
        if not any(marker in repaired for marker in markers):
            break
        try:
            candidate = repaired.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            break
        current_score = sum(repaired.count(marker) for marker in markers)
        candidate_score = sum(candidate.count(marker) for marker in markers)
        if candidate_score >= current_score:
            break
        repaired = candidate
    return repaired


def _clean_text(value: str, max_length: int = 500) -> str:
    if not value:
        return ""
    raw_value = repair_mojibake(value)
    soup = BeautifulSoup(raw_value, "html.parser")
    text = html.unescape(soup.get_text(" "))
    return re.sub(r"\s+", " ", text).strip()[:max_length]


def _clean_title(title: str, source_name: str) -> str:
    clean = _clean_text(title, 300)
    suffix = f" - {source_name}" if source_name else ""
    if suffix and clean.lower().endswith(suffix.lower()):
        clean = clean[:-len(suffix)].strip()
    return clean


def _classify_category(title: str, requested_category: Optional[str], sub_category: Optional[str]) -> str:
    normalized = (requested_category or "").strip().lower()
    if normalized in KNOWN_CATEGORIES:
        return normalized
    if (sub_category or "").strip().lower() == "esports":
        return "sports"
    lowered = f" {title.lower()} "
    for category, hints in CATEGORY_HINTS.items():
        if any(hint in lowered for hint in hints):
            return category
    return "world"


def _gdelt_date(value: str) -> Optional[str]:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc).isoformat()
    except ValueError:
        return value


def _metadata(
    *,
    title: str,
    summary: str,
    source_url: str,
    source_name: str,
    published_at: Optional[str],
    provider: str,
    requested_category: Optional[str],
    sub_category: Optional[str],
    country: Optional[str],
    language: Optional[str],
    city: Optional[str],
    region: Optional[str],
    image_url: str = "",
) -> Optional[NewsItemMetadata]:
    source_url = _normalize_url(source_url)
    source_name = _clean_text(source_name, 120) or _publisher_from_url(source_url)
    title = _clean_title(title, source_name)
    if not source_url or len(title) < 10 or not published_at:
        return None

    normalized_subcategory = (sub_category or "general").strip().lower() or "general"
    resolved_category = _classify_category(title, requested_category, normalized_subcategory)
    normalized_country = (country or "global").strip().lower() or "global"
    image_url = _normalize_url(image_url) if image_url else ""
    if not image_url:
        image_url = get_category_fallback_image(resolved_category, normalized_subcategory, normalized_country)

    clean_summary = _clean_text(summary, 500) or title
    return NewsItemMetadata(
        title=title,
        summary=clean_summary,
        content=clean_summary,
        isFullContentFetched=False,
        category=resolved_category,
        subCategory=normalized_subcategory,
        country=normalized_country,
        language={"english": "en", "hindi": "hi"}.get(
            (language or "en").strip().lower(),
            (language or "en").strip().lower() or "en"
        ),
        sourceName=source_name,
        sourceUrl=source_url,
        imageUrl=image_url,
        mediaUrls=[image_url] if image_url else [],
        isFeaturedOnHome=not bool(city or region),
        publishedAt=str(published_at),
        readTime=1,
        region=_clean_query_part(region, 100),
        city=_clean_query_part(city, 100),
        discoveryProvider=provider,
    )


async def fetch_gdelt_metadata(
    client: httpx.AsyncClient,
    provider_query: str,
    *,
    category: Optional[str],
    sub_category: Optional[str],
    country: Optional[str],
    language: Optional[str],
    city: Optional[str],
    region: Optional[str],
    limit: int,
) -> List[NewsItemMetadata]:
    if not provider_query:
        return []

    settings = _country_settings(country)
    gdelt_query = provider_query
    if settings["name"] and (country or "").lower() != "global":
        gdelt_query = f"{gdelt_query} sourcecountry:{settings['name']}"
    if language and language.lower() == "en":
        gdelt_query = f"{gdelt_query} sourcelang:english"

    cache_key = f"gdelt:{gdelt_query}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    params = {
        "query": gdelt_query,
        "mode": "artlist",
        "format": "json",
        "maxrecords": min(max(limit * 2, 10), 100),
        "sort": "datedesc",
        "timespan": "1week",
    }

    global _last_gdelt_request, _gdelt_blocked_until
    if time.monotonic() < _gdelt_blocked_until:
        return []
    try:
        async with _gdelt_lock:
            wait_seconds = max(0.0, 2.0 - (time.monotonic() - _last_gdelt_request))
            if wait_seconds:
                await asyncio.sleep(wait_seconds)
            response = await client.get(
                "https://api.gdeltproject.org/api/v2/doc/doc",
                params=params,
                timeout=15.0,
            )
            _last_gdelt_request = time.monotonic()
        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After", "60")
            try:
                cooldown = min(max(float(retry_after), 30.0), 300.0)
            except ValueError:
                cooldown = 60.0
            _gdelt_blocked_until = time.monotonic() + cooldown
            return []
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return []

    results: List[NewsItemMetadata] = []
    for item in payload.get("articles", []):
        item_country = COUNTRY_NAME_TO_CODE.get(str(item.get("sourcecountry", "")).lower(), "")
        article = _metadata(
            title=item.get("title", ""),
            summary=item.get("title", ""),
            source_url=item.get("url", ""),
            source_name=item.get("domain", ""),
            published_at=_gdelt_date(item.get("seendate", "")),
            provider="gdelt",
            requested_category=category,
            sub_category=sub_category,
            country=country or item_country or "global",
            language=language or item.get("language", "en"),
            city=city,
            region=region,
            image_url=item.get("socialimage", ""),
        )
        if article:
            results.append(article)
        if len(results) >= limit:
            break

    _cache_set(cache_key, results)
    return results


def _extract_google_article_id(value: str) -> str:
    parsed = urlparse(value)
    if parsed.hostname != "news.google.com":
        return ""
    match = re.search(r"/(?:rss/)?(?:articles|read)/([^/?]+)", parsed.path)
    return match.group(1) if match else ""


def _decode_legacy_google_id(article_id: str) -> str:
    try:
        padded = article_id + "=" * (-len(article_id) % 4)
        decoded = base64.urlsafe_b64decode(padded).decode("utf-8", errors="ignore")
        match = re.search(r"https?://[^\x00-\x20]+", decoded)
        return _normalize_url(match.group(0)) if match else ""
    except Exception:
        return ""


async def decode_google_news_url(client: httpx.AsyncClient, value: str) -> str:
    article_id = _extract_google_article_id(value)
    if not article_id:
        return _normalize_url(value)

    legacy_url = _decode_legacy_google_id(article_id)
    if legacy_url:
        return legacy_url

    cache_key = f"google-url:{article_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        page = await client.get(
            f"https://news.google.com/rss/articles/{article_id}",
            headers={"Accept": "text/html,application/xhtml+xml"},
            cookies={"CONSENT": "PENDING+987"},
            timeout=10.0,
        )
        page.raise_for_status()
        signature_match = re.search(r'data-n-a-sg="([^"]+)"', page.text)
        timestamp_match = re.search(r'data-n-a-ts="([^"]+)"', page.text)
        if not signature_match or not timestamp_match:
            return ""

        inner = [
            "garturlreq",
            [
                ["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1, None, None, None, None, None, 0, 1],
                "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0,
            ],
            article_id,
            int(timestamp_match.group(1)),
            signature_match.group(1),
        ]
        envelope = [[['Fbv4je', json.dumps(inner, separators=(",", ":"))]]]
        response = await client.post(
            "https://news.google.com/_/DotsSplashUi/data/batchexecute",
            data={"f.req": json.dumps(envelope, separators=(",", ":"))},
            headers={
                "Accept": "*/*",
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                "Origin": "https://news.google.com",
                "Referer": "https://news.google.com/",
                "X-Same-Domain": "1",
            },
            timeout=10.0,
        )
        response.raise_for_status()

        decoded_url = ""
        for line in response.text.splitlines():
            line = line.strip()
            if not line.startswith("[["):
                continue
            try:
                chunks = json.loads(line)
            except json.JSONDecodeError:
                continue
            for chunk in chunks:
                if not isinstance(chunk, list) or len(chunk) < 3 or chunk[1] != "Fbv4je":
                    continue
                inner_payload = json.loads(chunk[2])
                if isinstance(inner_payload, list) and len(inner_payload) > 1:
                    decoded_url = _normalize_url(inner_payload[1])
                    break
            if decoded_url:
                break

        if decoded_url and urlparse(decoded_url).hostname != "news.google.com":
            _cache_set(cache_key, decoded_url)
            return decoded_url
    except Exception:
        return ""
    return ""


async def fetch_google_news_metadata(
    client: httpx.AsyncClient,
    provider_query: str,
    *,
    category: Optional[str],
    sub_category: Optional[str],
    country: Optional[str],
    language: Optional[str],
    city: Optional[str],
    region: Optional[str],
    limit: int,
) -> List[NewsItemMetadata]:
    if not provider_query:
        return []
    settings = _country_settings(country)
    cache_key = f"google-feed:{provider_query}:{settings['ceid']}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    # Query both targeted region and complementary region if global/unspecified
    regions_to_fetch = [settings]
    if not country or country.lower() in ("all", "global"):
        regions_to_fetch = [
            COUNTRY_SETTINGS["in"],
            COUNTRY_SETTINGS["us"]
        ]

    entries = []
    seen_links = set()

    for s in regions_to_fetch:
        try:
            response = await client.get(
                "https://news.google.com/rss/search",
                params={"q": provider_query, "hl": s["hl"], "gl": s["gl"], "ceid": s["ceid"]},
                timeout=7.0,
            )
            if response.status_code == 200:
                parsed = feedparser.parse(response.content)
                for entry in parsed.entries[: min(max(limit * 2, 8), 30)]:
                    link = entry.get("link", "")
                    if link and link not in seen_links:
                        seen_links.add(link)
                        entries.append((entry, s))
        except Exception:
            pass

    results: List[NewsItemMetadata] = []
    for entry, s in entries:
        raw_link = entry.get("link", "")
        # Fast non-blocking URL unwrap: check legacy base64 or keep valid RSS redirect link
        article_id = _extract_google_article_id(raw_link)
        legacy_url = _decode_legacy_google_id(article_id) if article_id else ""
        source_url = legacy_url or _normalize_url(raw_link)
        if not source_url:
            continue

        source = entry.get("source") or {}
        source_name = source.get("title", "") if isinstance(source, dict) else str(source)
        article = _metadata(
            title=entry.get("title", ""),
            summary=entry.get("summary", "") or entry.get("description", ""),
            source_url=source_url,
            source_name=source_name,
            published_at=entry.get("published", "") or entry.get("updated", ""),
            provider="google-news-rss",
            requested_category=category,
            sub_category=sub_category,
            country=country or ("in" if s["gl"] == "IN" else "global"),
            language=language or "en",
            city=city,
            region=region,
        )
        if article:
            results.append(article)
        if len(results) >= limit * 2:
            break

    _cache_set(cache_key, results)
    return results


def _unwrap_bing_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.hostname and parsed.hostname.lower().endswith("bing.com"):
        target = parse_qs(parsed.query).get("url", [""])[0]
        if target:
            return _normalize_url(unquote(target))
    return _normalize_url(value)


async def fetch_bing_news_metadata(
    client: httpx.AsyncClient,
    provider_query: str,
    *,
    category: Optional[str],
    sub_category: Optional[str],
    country: Optional[str],
    language: Optional[str],
    city: Optional[str],
    region: Optional[str],
    limit: int,
) -> List[NewsItemMetadata]:
    if not provider_query:
        return []
    settings = _country_settings(country)
    cache_key = f"bing-feed:{provider_query}:{settings['mkt']}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    regions_to_fetch = [settings["mkt"]]
    if not country or country.lower() in ("all", "global"):
        regions_to_fetch = ["en-IN", "en-US"]

    results: List[NewsItemMetadata] = []
    seen_titles = set()

    for mkt in regions_to_fetch:
        try:
            response = await client.get(
                "https://www.bing.com/news/search",
                params={"q": provider_query, "format": "rss", "mkt": mkt},
                timeout=7.0,
            )
            if response.status_code == 200:
                entries = feedparser.parse(response.content).entries[: min(max(limit * 2, 8), 30)]
                for entry in entries:
                    t = entry.get("title", "")
                    if not t or t in seen_titles:
                        continue
                    seen_titles.add(t)
                    source_url = _unwrap_bing_url(entry.get("link", ""))
                    source = entry.get("source") or entry.get("news_source") or {}
                    source_name = source.get("title", "") if isinstance(source, dict) else str(source)
                    article = _metadata(
                        title=t,
                        summary=entry.get("summary", "") or entry.get("description", ""),
                        source_url=source_url,
                        source_name=source_name,
                        published_at=entry.get("published", "") or entry.get("updated", ""),
                        provider="bing-news-rss",
                        requested_category=category,
                        sub_category=sub_category,
                        country=country or ("in" if mkt == "en-IN" else "global"),
                        language=language or "en",
                        city=city,
                        region=region,
                    )
                    if article:
                        results.append(article)
                    if len(results) >= limit * 2:
                        break
        except Exception:
            pass

    _cache_set(cache_key, results)
    return results


async def fetch_discovery_metadata(
    client: httpx.AsyncClient,
    *,
    query: Optional[str] = None,
    category: Optional[str] = None,
    sub_category: Optional[str] = None,
    country: Optional[str] = None,
    language: Optional[str] = None,
    city: Optional[str] = None,
    region: Optional[str] = None,
    limit: int = 20,
) -> Dict[str, List[NewsItemMetadata]]:
    provider_query = build_discovery_query(query, category, sub_category, city, region, country)
    if not provider_query:
        return {provider["id"]: [] for provider in DISCOVERY_PROVIDERS}

    provider_limit = min(max(limit, 1), 30)
    common = {
        "category": category,
        "sub_category": sub_category,
        "country": country,
        "language": language,
        "city": city,
        "region": region,
        "limit": provider_limit,
    }

    # Run Google News and Bing News concurrently with strict fast timeouts
    google_task = fetch_google_news_metadata(client, provider_query, **common)
    bing_task = fetch_bing_news_metadata(client, provider_query, **common)

    # GDELT runs with a 2-second timeout guard so it never blocks live search
    async def get_gdelt_safe():
        try:
            return await asyncio.wait_for(fetch_gdelt_metadata(client, provider_query, **common), timeout=2.5)
        except Exception:
            return []

    google, bing, gdelt = await asyncio.gather(
        google_task,
        bing_task,
        get_gdelt_safe(),
    )
    return {
        "gdelt": gdelt,
        "google-news-rss": google,
        "bing-news-rss": bing,
    }
