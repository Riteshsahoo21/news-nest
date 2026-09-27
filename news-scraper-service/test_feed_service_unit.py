import unittest
from unittest.mock import AsyncMock, patch

from schemas.news import NewsItemMetadata
from services.feed_service import fetch_filtered_metadata, is_esports_story


def article(title, source, url):
    return NewsItemMetadata(
        title=title,
        summary=f"Summary for {title}",
        category="technology",
        sourceName=source,
        sourceUrl=url
    )


class FeedServiceUnitTests(unittest.IsolatedAsyncioTestCase):
    def test_esports_filter_rejects_casino_promotions(self):
        self.assertFalse(is_esports_story(
            "Casino promo code offers free spins",
            "A betting bonus promotion",
            "ESTNN"
        ))
        self.assertTrue(is_esports_story(
            "Valorant team wins VCT championship",
            "The tournament concluded Sunday",
            "Dot Esports"
        ))

    async def test_unmatched_category_returns_no_unrelated_articles(self):
        result = await fetch_filtered_metadata(category="category-that-does-not-exist", limit=5)
        self.assertEqual(result, [])

    async def test_category_quota_is_shared_across_publishers(self):
        sources = [
            {"sourceName": "Source A", "url": "https://a.test/rss", "category": "technology"},
            {"sourceName": "Source B", "url": "https://b.test/rss", "category": "technology"}
        ]

        async def fake_fetch(_client, source):
            prefix = source["sourceName"]
            return [
                article(f"{prefix} story number {index}", prefix, f"https://{prefix[-1].lower()}.test/{index}")
                for index in range(3)
            ]

        with patch("services.feed_service.FEED_SOURCES", sources), patch(
            "services.feed_service.fetch_single_feed",
            new=AsyncMock(side_effect=fake_fetch)
        ):
            result = await fetch_filtered_metadata(category="technology", include_discovery=False, limit=4)

        self.assertEqual([item.sourceName for item in result], ["Source A", "Source B", "Source A", "Source B"])


if __name__ == "__main__":
    unittest.main()
