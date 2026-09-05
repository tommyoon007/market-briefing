import json
import os
import re
from datetime import datetime, timezone
import requests

# MarketAux API 설정
API_TOKEN = os.environ.get("MARKETAUX_API_TOKEN", "")
API_URL = "https://api.marketaux.com/v1/news/all"

# index.html의 보유 종목 리스트와 100% 일치
PORTFOLIO_SYMBOLS = {
    "AAPL", "MSFT", "TSLA", "SMH", "GOOGL", "AMZN", "SOXX", "META", "MSTR",
    "DIS", "MRK", "NVDA", "AVGO", "V", "MA", "INTC", "KO",
    "MORT", "BMNR", "MP", "AMSC", "GFUZ", "DKNG", "AMADA", "PLTR",
    "MCD", "NFLX", "DJT", "CEG", "USD", "KRW"
}

# 제외할 광고성/불필요 키워드
EXCLUDED_KEYWORDS = [
    "leadership development", "flood management", "master plans",
    "emi affordability", "celebrity", "horoscope", "recipe", "sports scores"
]

def clean_text(value):
    if not value:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()

def parse_entities(article):
    """MarketAux API의 entities 객체에서 symbol과 sentiment_score를 정밀 추출합니다."""
    entities = article.get("entities") or []
    found_symbol = ""
    sentiment_scores = []

    for entity in entities:
        sym = str(entity.get("symbol", "")).upper().strip()
        score = entity.get("sentiment_score")

        if score is not None:
            try:
                sentiment_scores.append(float(score))
            except (ValueError, TypeError):
                pass

        if not found_symbol and sym in PORTFOLIO_SYMBOLS:
            found_symbol = sym

    # entities에 종목 코드가 없는 경우 본문 텍스트에서 매칭
    if not found_symbol:
        text = f"{article.get('title', '')} {article.get('description', '')}".upper()
        for sym in sorted(PORTFOLIO_SYMBOLS, key=len, reverse=True):
            pattern = rf"(?<![A-Z]){re.escape(sym)}(?![A-Z])"
            if re.search(pattern, text):
                found_symbol = sym
                break

    avg_sentiment = (
        sum(sentiment_scores) / len(sentiment_scores)
        if sentiment_scores else 0.0
    )
    return found_symbol, round(avg_sentiment, 4)

def is_excluded(article):
    text = f"{article.get('title', '')} {article.get('description', '')}".lower()
    return any(kw in text for kw in EXCLUDED_KEYWORDS)

def make_article(article):
    title = clean_text(article.get("title"))
    snippet = clean_text(
        article.get("description") or article.get("snippet") or article.get("content")
    )
    
    source = article.get("source")
    if isinstance(source, dict):
        source = source.get("domain") or source.get("name")
    elif not source:
        source = "MarketAux"
    source = clean_text(source)

    symbol, sentiment_score = parse_entities(article)

    return {
        "title": title,
        "title_ko": title,
        "snippet": snippet,
        "snippet_ko": snippet,
        "symbol": symbol,
        "sentiment_score": sentiment_score,
        "source": source,
        "url": clean_text(article.get("url")),
        "cross_verified": bool(article.get("entities")),
        "published_at": article.get("published_at") or "",
    }

def fetch_data():
    if not API_TOKEN:
        print("❌ 오류: MARKETAUX_API_TOKEN 환경 변수가 설정되지 않았습니다.")
        raise RuntimeError("MARKETAUX_API_TOKEN이 누락되었습니다.")

    articles = []

    # 1. 주요 보유 종목 기반 API 호출 (주식 종목 위주)
    target_symbols = [s for s in PORTFOLIO_SYMBOLS if s not in {"USD", "KRW"}][:20]
    p1 = {
        "api_token": API_TOKEN,
        "language": "en",
        "limit": 50,
        "symbols": ",".join(target_symbols),
    }
    try:
        r1 = requests.get(API_URL, params=p1, timeout=20)
        if r1.status_code == 200:
            articles.extend(r1.json().get("data") or [])
        else:
            print(f"⚠️ 보유 종목 뉴스를 불러오는 중 응답 코드: {r1.status_code}")
    except Exception as e:
        print(f"⚠️ 보유 종목 뉴스 수집 실패: {e}")

    # 2. 미국 전체 시장 뉴스 API 호출
    p2 = {
        "api_token": API_TOKEN,
        "language": "en",
        "limit": 50,
        "countries": "us",
    }
    try:
        r2 = requests.get(API_URL, params=p2, timeout=20)
        if r2.status_code == 200:
            articles.extend(r2.json().get("data") or [])
        else:
            print(f"⚠️ 전체 시장 뉴스를 불러오는 중 응답 코드: {r2.status_code}")
    except Exception as e:
        print(f"⚠️ 전체 시장 뉴스 수집 실패: {e}")

    # URL 기준 중복 제거
    seen = set()
    unique_articles = []
    for art in articles:
        url = art.get("url")
        if url and url not in seen:
            seen.add(url)
            unique_articles.append(art)

    market_news = []
    portfolio_news = []

    for art in unique_articles:
        if is_excluded(art):
            continue

        item = make_article(art)
        market_news.append(item)

        if item["symbol"]:
            portfolio_news.append(item)

    output = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "status": "ok",
        "market_news": market_news[:25],
        "portfolio_news": portfolio_news[:25],
    }

    with open("news.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("=========================================")
    print(f"✅ news.json 생성 성공!")
    print(f"- 전체 시장 뉴스 수집: {len(output['market_news'])}개")
    print(f"- 보유 종목 뉴스 수집: {len(output['portfolio_news'])}개")
    print("=========================================")

if __name__ == "__main__":
    fetch_data()
