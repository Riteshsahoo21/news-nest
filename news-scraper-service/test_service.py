import asyncio
from services.feed_service import fetch_filtered_metadata
from services.extractor import extract_full_article
from services.summarizer import generate_ai_summary

async def main():
    print("Testing metadata feed...")
    articles = await fetch_filtered_metadata(category="technology", limit=1)
    if not articles:
        print("No articles found")
        return
    art = articles[0]
    print(f"Article: {art.title} ({art.sourceName})")
    print(f"URL: {art.sourceUrl}")

    print("\nTesting full article extraction...")
    full = await extract_full_article(art.sourceUrl, fallback_title=art.title)
    print(f"Extracted content length: {len(full.content)} chars")
    print(f"Content preview: {full.content[:200]}...")

    print("\nTesting AI summary...")
    summary = await generate_ai_summary(full.content, title=full.title)
    print(f"Executive summary: {summary.get('executiveSummary')}")
    print(f"Takeaways: {summary.get('keyTakeaways')}")

if __name__ == "__main__":
    asyncio.run(main())
