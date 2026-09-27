from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from schemas.news import (
    NewsItemMetadata,
    FullContentResult,
    ExtractUrlRequest,
    SummarizeRequest,
    SummarizeResponse
)
from services.feed_service import fetch_filtered_metadata
from services.extractor import extract_full_article
from services.summarizer import generate_ai_summary
from services.sources import FEED_SOURCES
from services.discovery_service import DISCOVERY_PROVIDERS

router = APIRouter(prefix="/api/news", tags=["news"])

@router.get("/metadata-feed")
async def get_metadata_feed(
    category: Optional[str] = Query(None, description="News category e.g. technology, sports, world"),
    subCategory: Optional[str] = Query(None, description="Sub-category e.g. esports, regional, general"),
    country: Optional[str] = Query(None, description="Country code e.g. in, us, gb, global, all"),
    language: Optional[str] = Query(None, description="Language e.g. en, hi"),
    isFeaturedOnHome: Optional[bool] = Query(None, description="Filter for home visibility"),
    q: Optional[str] = Query(None, min_length=2, max_length=160, description="Optional live search query"),
    city: Optional[str] = Query(None, max_length=100),
    region: Optional[str] = Query(None, max_length=100),
    limit: int = Query(30, ge=1, le=100)
):
    """Fetches metadata from curated feeds and broad discovery providers."""
    articles = await fetch_filtered_metadata(
        category=category,
        sub_category=subCategory,
        country=country,
        language=language,
        is_featured_on_home=isFeaturedOnHome,
        query=q,
        city=city,
        region=region,
        limit=limit
    )
    return {
        "count": len(articles),
        "providers": sorted(set(article.discoveryProvider for article in articles)),
        "articles": articles
    }


@router.get("/discover")
async def discover_news(
    q: Optional[str] = Query(None, min_length=2, max_length=160),
    category: Optional[str] = Query(None),
    subCategory: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    city: Optional[str] = Query(None, max_length=100),
    region: Optional[str] = Query(None, max_length=100),
    limit: int = Query(30, ge=1, le=100)
):
    """Runs live multi-provider discovery for search and regional requests."""
    if not any([q, category, subCategory, country, city, region]):
        raise HTTPException(status_code=400, detail="Provide a query, category, country, city, or region")

    articles = await fetch_filtered_metadata(
        query=q,
        category=category,
        sub_category=subCategory,
        country=country,
        language=language,
        city=city,
        region=region,
        include_discovery=True,
        limit=limit
    )
    provider_counts = {}
    for article in articles:
        provider_counts[article.discoveryProvider] = provider_counts.get(article.discoveryProvider, 0) + 1
    return {
        "count": len(articles),
        "providers": provider_counts,
        "articles": articles
    }

@router.post("/extract-url", response_model=FullContentResult)
async def extract_url_content(payload: ExtractUrlRequest):
    """Extracts detailed multi-paragraph body text and generates AI summary on demand."""
    if not payload.url:
        raise HTTPException(status_code=400, detail="Missing required 'url' parameter")

    try:
        article_result = await extract_full_article(
            payload.url,
            fallback_title=payload.title,
            fallback_content=payload.fallbackContent,
            fallback_image=payload.imageUrl,
            category=payload.category,
            sub_category=payload.subCategory,
            country=payload.country
        )

        # Generate AI summary & key takeaways for the extracted text
        summary_result = await generate_ai_summary(article_result.content, title=article_result.title)
        article_result.aiSummary = summary_result.get("executiveSummary", "")
        article_result.keyTakeaways = summary_result.get("keyTakeaways", [])

        return article_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_text(payload: SummarizeRequest):
    """Summarizes any given text into an executive summary and 3 key takeaways."""
    if not payload.text or len(payload.text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Text must be at least 50 characters long.")

    result = await generate_ai_summary(payload.text, title=payload.title or "")
    word_count = len(payload.text.split())
    read_time = max(1, round(word_count / 200))

    return SummarizeResponse(
        executiveSummary=result.get("executiveSummary", ""),
        keyTakeaways=result.get("keyTakeaways", []),
        readTime=read_time
    )

@router.get("/sources")
async def get_configured_sources():
    """Returns the curated feed catalog and broad discovery providers."""
    return {
        "totalSources": len(FEED_SOURCES),
        "sources": FEED_SOURCES,
        "discoveryProviders": DISCOVERY_PROVIDERS
    }
