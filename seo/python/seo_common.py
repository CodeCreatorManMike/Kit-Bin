from __future__ import annotations
import hashlib, json, os, time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
import requests

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
SCOPE = ["https://www.googleapis.com/auth/webmasters.readonly"]

def env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value: raise RuntimeError(f"Missing required environment variable: {name}")
    return value

def row_id(row: dict) -> str:
    fields = ("property", "search_type", "data_date", "query", "page", "country", "device")
    raw = "\x1f".join(str(row.get(k) or "").strip() for k in fields)
    return hashlib.sha256(raw.encode()).hexdigest()

def normalize(keys: list[str], values: list, site: str) -> dict:
    dims = dict(zip(keys, values))
    row = {"property": site, "search_type": "web", "data_date": dims.get("date", ""),
           "query": dims.get("query", "") or "", "page": dims.get("page", "") or "",
           "country": dims.get("country", "") or "", "device": dims.get("device", "") or ""}
    row.update(clicks=0, impressions=0, ctr=0.0, position=0.0)
    row["row_id"] = row_id(row)
    return row

class SupabaseREST:
    def __init__(self):
        self.base = env("SUPABASE_URL").rstrip("/") + "/rest/v1"
        key = env("SUPABASE_SECRET_KEY")
        self.headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    def request(self, method, table, *, params=None, data=None, prefer=None, retries=4):
        headers = dict(self.headers)
        if prefer: headers["Prefer"] = prefer
        for attempt in range(retries):
            try:
                r = requests.request(method, f"{self.base}/{table}", headers=headers, params=params,
                                     json=data, timeout=60)
                if r.status_code in (429, 500, 502, 503, 504): raise requests.HTTPError(response=r)
                r.raise_for_status()
                return r.json() if r.content else []
            except (requests.RequestException, ValueError):
                if attempt + 1 == retries: raise
                time.sleep(2 ** attempt)
    def upsert(self, table, rows, batch=500):
        for i in range(0, len(rows), batch):
            self.request("POST", table, data=rows[i:i+batch], prefer="resolution=merge-duplicates,return=minimal")
    def select_all(self, table, params=None, page_size=1000):
        params = dict(params or {}); out = []; offset = 0
        while True:
            page_params = {**params, "limit": str(page_size), "offset": str(offset)}
            page = self.request("GET", table, params=page_params)
            out.extend(page)
            if len(page) < page_size: return out
            offset += page_size

def windows(anchor: date):
    def span(end_offset, days):
        end = anchor - timedelta(days=end_offset); return end - timedelta(days=days-1), end
    return {"last_7": span(0,7), "previous_7": span(7,7), "last_28": span(0,28), "previous_28": span(28,28)}

def weighted_position(rows):
    impressions = sum(float(r.get("impressions",0)) for r in rows)
    return sum(float(r.get("position",0))*float(r.get("impressions",0)) for r in rows)/impressions if impressions else 0.0
