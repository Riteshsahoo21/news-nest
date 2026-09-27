import json
import unittest

from services.extractor import clean_extracted_text, extract_meta_tags


class ExtractorUnitTests(unittest.TestCase):
    def test_json_ld_body_is_read_even_when_open_graph_image_exists(self):
        body = (
            "The first detailed paragraph contains enough reporting context to remain intact. "
            "The second sentence adds verified background and a clear outcome for readers."
        )
        payload = {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": "Regional policy update",
            "articleBody": body,
            "datePublished": "2026-09-20T10:00:00Z",
            "author": {"@type": "Person", "name": "Test Reporter"},
            "keywords": ["policy", "regional"]
        }
        html = f"""
        <html><head>
          <meta property="og:title" content="Regional policy update">
          <meta property="og:image" content="https://example.com/photo.jpg">
          <script type="application/ld+json">{json.dumps(payload)}</script>
        </head><body><article><p>Short preview only.</p></article></body></html>
        """

        metadata = extract_meta_tags(html, "https://example.com/report")
        self.assertEqual(metadata["article_body"], body)
        self.assertEqual(metadata["author"], "Test Reporter")
        self.assertEqual(metadata["published_at"], "2026-09-20T10:00:00Z")
        self.assertEqual(metadata["image"], "https://example.com/photo.jpg")

    def test_content_cleaner_removes_subscription_noise(self):
        cleaned = clean_extracted_text(
            "This is a complete opening paragraph with verified details for the reader.\n\n"
            "Sign up for our newsletter\n\n"
            "This is a second complete paragraph explaining what happens next."
        )
        self.assertIn("complete opening paragraph", cleaned)
        self.assertIn("what happens next", cleaned)
        self.assertNotIn("newsletter", cleaned.lower())


if __name__ == "__main__":
    unittest.main()
