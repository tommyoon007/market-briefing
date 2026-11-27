#!/usr/bin/env python3
"""data/market_history.json 갱신 — Yahoo Finance chart API에서 일별 종가를 받아 다시 씁니다.

사용: python3 scripts/update_market.py [출력경로]
표준 라이브러리만 사용합니다(urllib). 네트워크가 막히면 기존 파일을 그대로 둡니다.
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "data", "market_history.json")

SYMS = {"^DJI": "DJI", "^GSPC": "SPX", "^NDX": "NDX", "KRW=X": "USDKRW"}
LABELS = {"DJI": "다우지수", "SPX": "S&P 500", "NDX": "나스닥 100", "USDKRW": "원/달러"}
START = datetime(2020, 1, 1, tzinfo=timezone.utc)


def fetch(sym):
    p1 = int(START.timestamp())
    p2 = int(datetime.now(timezone.utc).timestamp()) + 86400
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/"
           + urllib.parse.quote(sym)
           + f"?period1={p1}&period2={p2}&interval=1d&events=div%2Csplits")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (assetciv)"})
    with urllib.request.urlopen(req, timeout=45) as r:
        data = json.load(r)
    res = data["chart"]["result"][0]
    closes = res["indicators"]["quote"][0]["close"]
    out = {}
    for t, c in zip(res["timestamp"], closes):
        if c is None:
            continue
        d = datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m-%d")
        out[d] = round(float(c), 4)
    return out


def main():
    series = {}
    for sym, name in SYMS.items():
        rows = fetch(sym)
        dates = sorted(rows)
        series[name] = {"label": LABELS[name], "dates": dates, "close": [rows[d] for d in dates]}
        print(f"{name}: {len(dates)}일 · {dates[0]} ~ {dates[-1]}")
        time.sleep(1)

    last = max(s["dates"][-1] for s in series.values())
    payload = {
        "source": "Yahoo Finance chart API (^DJI, ^GSPC, ^NDX, KRW=X) daily close",
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "last_trading_day": last,
        "series": series,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)
    print(f"wrote {OUT} ({os.path.getsize(OUT):,} bytes, last {last})")


if __name__ == "__main__":
    main()
