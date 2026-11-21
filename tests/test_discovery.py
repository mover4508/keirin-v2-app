import unittest
from unittest.mock import patch
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from discover_races import Links, collect

class RaceDiscoveryTests(unittest.TestCase):
    def test_link_parser(self):
        parser = Links()
        parser.feed('<a href="/race/1">1R 出走表</a><a href="/race/2">2R 出走表</a>')
        self.assertEqual(len(parser.links), 2)
        self.assertEqual(parser.links[0], ("1R 出走表", "/race/1"))

    def test_only_allowed_host(self):
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, n): return '<a href="https://evil.example/race/1">1R 出走表</a><a href="/race/2">2R 出走表</a>'.encode("utf-8")
        with patch("discover_races.urllib.request.urlopen", return_value=Response()):
            result = collect("2026-11-20", "51", "福井")
        self.assertEqual([r["number"] for r in result["races"]], [2])
        self.assertTrue(result["races"][0]["cardUrl"].startswith("https://www.chariloto.com/"))

if __name__ == "__main__":
    unittest.main()
