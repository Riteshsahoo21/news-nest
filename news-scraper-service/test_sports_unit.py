import unittest

from routers.sports import parse_live_score_html, parse_upcoming_cricket_html


class SportsParserUnitTests(unittest.TestCase):
    def test_fixture_parser_deduplicates_and_skips_completed_matches(self):
        html = """
        <div class="cb-mtch-crd-itm">
          <a href="/live-cricket-scores/99214/india-v-australia" title="India vs Australia, 2nd ODI">India vs Australia</a>
          <span class="cb-text-preview">Starts at 7:30 PM</span>
          <span class="team-name">India</span><span class="team-name">Australia</span>
          <span class="venue">Melbourne Cricket Ground</span>
        </div>
        <a href="/live-cricket-scores/99214/duplicate">Duplicate link</a>
        <div class="cb-mtch-crd-itm">
          <a href="/live-cricket-scores/99100/old-match" title="Old A vs Old B">Old match</a>
          <span class="cb-text-complete">Old A won by 4 wickets</span>
        </div>
        """
        matches = parse_upcoming_cricket_html(html)
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["externalMatchId"], "cric_99214")
        self.assertEqual(matches[0]["teams"]["team1"], "India")

    def test_live_score_parser_returns_stable_sync_payload(self):
        html = """
        <h1 class="cb-nav-hdr">India vs Australia, 2nd ODI</h1>
        <div class="match-status">India need 15 runs from 12 balls</div>
        <div class="score-row" data-team-name="India" data-team-score="262/6 (48.0 ov)"></div>
        <div class="score-row" data-team-name="Australia" data-team-score="276/8 (50 ov)"></div>
        <div class="commtext">FOUR! Driven firmly through extra cover.</div>
        """
        result = parse_live_score_html(html, "cric_99214")
        self.assertFalse(result["isComplete"])
        self.assertEqual(result["team1"]["score"], "262/6 (48.0 ov)")
        self.assertIn("FOUR", result["latestCommentary"]["content"])
        self.assertEqual(len(result["updateId"]), 24)


if __name__ == "__main__":
    unittest.main()

