#!/usr/bin/env python3
"""Public race-index discovery. Metadata only; never label it training data."""
import datetime as dt
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo

VENUES = {"51": "福井"}
BASE = "https://www.chariloto.com/keirin/athletes/{date}/{venue}"

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.href = None
        self.label = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.href = dict(attrs).get("href")
            self.label = []
    def handle_data(self, data):
        if self.href is not None:
            self.label.append(data)
    def handle_endtag(self, tag):
        if tag == "a" and self.href:
            self.links.append(("".join(self.label).strip(), self.href))
            self.href = None

def collect(day, venue, name):
    url = BASE.format(date=day, venue=venue)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; keirin-v2-discovery/1.0)"})
    with urllib.request.urlopen(req, timeout=20) as response:
        html = response.read(2_000_000).decode("utf-8", errors="replace")
    parser = Links()
    parser.feed(html)
    races = {}
    for label, href in parser.links:
        m = re.search(r"(?:^|\\D)(1[0-2]|[1-9])\\s*R(?:\\D|$)", label, re.I)
        if not m:
            continue
        number = int(m.group(1))
        if "出走" not in label and "race" not in href:
            continue
        from urllib.parse import urljoin
        races[number] = {"number": number, "cardUrl": urljoin(url, href)}
    return {"date": day, "venue": venue, "venueName": name, "indexUrl": url, "races": list(races.values())}

def main():
    today = dt.datetime.now(ZoneInfo("Asia/Tokyo")).date()
    entries, errors = [], []
    for day in (today, today + dt.timedelta(days=1)):
        for venue, name in VENUES.items():
            try:
                row = collect(day.isoformat(), venue, name)
                if row["races"]:
                    entries.append(row)
            except Exception as exc:
                errors.append({"date": day.isoformat(), "venue": venue, "error": type(exc).__name__})
    out = {"schema": 1, "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "entries": entries, "errors": errors,
           "status": "discovery_only_not_verified_prediction_data"}
    path = Path("data/race-catalog.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
