"""보유 종목 30개가 모두 MarketAux 요청에 포함되는지 확인하는 모의 테스트.

실행: python3 tests/test_symbol_coverage.py
"""

import json
import os
import sys
import tempfile

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_DIR)

os.environ["MARKETAUX_API_TOKEN"] = "dummy-token-for-test"

# requests가 설치되어 있지 않은 환경에서도 돌도록 가짜 모듈을 넣어둔다
try:
    import requests  # noqa: F401
except ImportError:
    import types

    fake_requests = types.ModuleType("requests")
    fake_requests.get = lambda *a, **k: None
    fake_requests.post = lambda *a, **k: None
    sys.modules["requests"] = fake_requests

import collect_news  # noqa: E402

EXPECTED = [
    "AAPL", "MSFT", "SMH", "GOOGL", "AMZN", "SOXX", "META", "MSTR",
    "DIS", "MRK", "NVDA", "AVGO", "V", "MA", "INTC", "KO",
    "MORT", "BMNR", "MP", "AMSC", "GFUZ", "DKNG", "XRPN", "PLTR",
    "MCD", "NFLX", "DJT", "CEG", "BWXT", "ROBO",
]

REMOVED = ["TSLA", "AMADA", "USD", "KRW"]


class FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload)

    def json(self):
        return self._payload


def main():
    calls = []

    def fake_get(url, params=None, timeout=None):
        calls.append(dict(params or {}))
        symbols = (params or {}).get("symbols")
        data = []
        if symbols:  # 보유 종목 요청이면 첫 종목 기사 하나씩 돌려준다
            first = symbols.split(",")[0]
            data.append({
                "title": f"{first} test article",
                "description": f"news about {first}",
                "url": f"https://example.com/{first}",
                "source": "example.com",
                "published_at": "2026-11-17T00:00:00Z",
                "entities": [{"symbol": first, "sentiment_score": 0.3}],
            })
        return FakeResponse(200, {"data": data})

    collect_news.requests.get = fake_get
    collect_news.translate_text = lambda text: text  # DeepL 호출 생략

    cwd = os.getcwd()
    tmpdir = tempfile.mkdtemp()
    try:
        os.chdir(tmpdir)
        collect_news.fetch_data()
        with open("news.json", encoding="utf-8") as f:
            output = json.load(f)
    finally:
        os.chdir(cwd)

    symbol_calls = [c for c in calls if c.get("symbols")]
    requested = []
    for call in symbol_calls:
        for sym in call["symbols"].split(","):
            if sym not in requested:
                requested.append(sym)

    failures = []

    # 1. 포트폴리오 상수 확인
    if collect_news.PORTFOLIO_SYMBOLS != set(EXPECTED):
        failures.append(
            f"PORTFOLIO_SYMBOLS 불일치: {sorted(collect_news.PORTFOLIO_SYMBOLS)}"
        )

    # 2. 모든 종목이 API 요청에 포함되는지
    missing = [s for s in EXPECTED if s not in requested]
    if missing:
        failures.append(f"API 요청에서 누락된 종목: {missing}")

    # 3. 제거 대상이 요청/상수에서 빠졌는지
    for sym in REMOVED:
        if sym in collect_news.PORTFOLIO_SYMBOLS:
            failures.append(f"PORTFOLIO_SYMBOLS에 남아 있음: {sym}")
        if sym in requested:
            failures.append(f"API 요청에 남아 있음: {sym}")

    # 4. 청크당 20개 이하인지, 요청 수가 2회 이상인지
    for call in symbol_calls:
        n = len(call["symbols"].split(","))
        if n > collect_news.SYMBOLS_PER_REQUEST:
            failures.append(f"청크가 너무 큼: {n}개 (> {collect_news.SYMBOLS_PER_REQUEST})")
    if len(symbol_calls) < 2:
        failures.append(f"보유 종목 요청이 {len(symbol_calls)}회뿐 (분할 호출 안 됨)")

    # 5. 각 요청 결과가 articles로 합쳐졌는지 / 최종 저장 결과 확인
    total_with_symbol = len(output.get("portfolio_news", []))
    if total_with_symbol < len(symbol_calls):
        failures.append(
            f"보유 종목 뉴스 병합 부족: 요청 {len(symbol_calls)}회 vs 저장 {total_with_symbol}건"
        )

    print("--- 요청별 symbols ---")
    for call in symbol_calls:
        print(call["symbols"])
    print(f"--- 요청 횟수: {len(symbol_calls)}, 요청된 종목 수: {len(requested)} ---")
    print(f"--- portfolio_news 저장 건수: {total_with_symbol} ---")

    if failures:
        print("❌ 실패:")
        for f in failures:
            print(" -", f)
        sys.exit(1)

    print("✅ 모든 검증 통과")


if __name__ == "__main__":
    main()
