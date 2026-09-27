import json
import unittest

from services.discovery_service import (
    _clean_text,
    _unwrap_bing_url,
    build_discovery_query,
    decode_google_news_url,
)


class FakeResponse:
    def __init__(self, text):
        self.text = text

    def raise_for_status(self):
        return None


class FakeClient:
    async def get(self, *_args, **_kwargs):
        return FakeResponse('<div data-n-a-sg="signature" data-n-a-ts="1720000000"></div>')

    async def post(self, *_args, **_kwargs):
        inner = json.dumps(["garturlres", "https://publisher.example/story"])
        return FakeResponse("\n\n" + json.dumps([["wrb.fr", "Fbv4je", inner]]))


class DiscoveryServiceUnitTests(unittest.IsolatedAsyncioTestCase):
    def test_query_combines_safe_topic_and_region(self):
        query = build_discovery_query(
            query='Modi<script> sourcecountry:fake',
            city='Bhubaneswar',
            region='Odisha',
        )
        self.assertNotIn('<', query)
        self.assertNotIn(':', query)
        self.assertIn('Modi script sourcecountry fake', query)
        self.assertIn('"Bhubaneswar" OR "Odisha"', query)

    def test_bing_redirect_exposes_original_publisher_url(self):
        wrapped = (
            'http://www.bing.com/news/apiclick.aspx?ref=FexRss&'
            'url=https%3A%2F%2Fpublisher.example%2Fcomplete-story%3Fa%3D1&mkt=en-in'
        )
        self.assertEqual(
            _unwrap_bing_url(wrapped),
            'https://publisher.example/complete-story?a=1',
        )

    def test_mojibake_from_rss_is_repaired(self):
        self.assertEqual(_clean_text("Team\u00e2\u0080\u0099s victory"), "Team\u2019s victory")

    async def test_google_wrapper_decodes_to_original_publisher(self):
        decoded = await decode_google_news_url(
            FakeClient(),
            'https://news.google.com/rss/articles/not-a-legacy-id',
        )
        self.assertEqual(decoded, 'https://publisher.example/story')


if __name__ == '__main__':
    unittest.main()
