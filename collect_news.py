import json
import os
import re
from datetime import datetime, timezone
import requests

API_TOKEN = os.environ.get("MARKETAUX_API_TOKEN", "")
DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY", "")

API_URL = "https://api.marketaux.com/v1/news/all"
DEEPL_URL = "https://api-free.deepl.com/v2/translate"

PORTFOLIO_SYMBOLS = {
    "AAPL", "MSFT", "TSLA", "SMH", "GOOGL", "AMZN", "SOXX", "META", "MSTR",
    "DIS", "MRK", "NVDA", "AVGO", "V", "MA", "INTC", "KO",
    "MORT", "BMNR", "MP", "AMSC", "GFUZ", "DKNG", "AMADA", "PLTR",
    "MCD", "NFLX", "DJT", "CEG", "USD", "KRW"
}

EXCLUDED_KEYWORDS = [
    "leadership development", "flood management", "master plans",
    "emi affordability", "celebrity", "horoscope", "recipe", "sports scores"
]

MAX_ARTICLES_TO_KEEP = 100  # 스크롤 가능하도록 최대 100개 누적 저장

def clean_text(value):
    if not value:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()

def translate_text(text):
    if not text or not DEEPL_API_KEY:
        return text

    try:
        response = requests.post(
            DEEPL_URL,
            data={
                "auth_key": DEEPL_API_KEY,
                "text": text[:500],
                "target_lang": "KO"
            },
            timeout=10
        )
        if response.status_code == 200:
            result = response.json()
            translations = result.get("translations", [])
            if translations:
                return translations[0].get("text", text)
    except Exception as e:
        print(f"⚠️ 번역 요청 오류: {e}")

    return text

def parse_entities(article):
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

    # 신규 기사만 번역 실행
    title_ko = translate_text(title)
    snippet_ko = translate_text(snippet)

    return {
        "title": title,
        "title_ko": title_ko,
        "snippet": snippet,
        "snippet_ko": snippet_ko,
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

    # 1. 기존 news.json 파일이 있으면 불러오기 (기사 누적용)
    existing_market = []
    existing_portfolio = []
    existing_urls = set()

    if os.path.exists("news.json"):
        try:
            with open("news.json", "r", encoding="utf-8") as f:
                old_data = json.load(f)
                existing_market = old_data.get("market_news", [])
                existing_portfolio = old_data.get("portfolio_news", [])
                for item in existing_market + existing_portfolio:
                    if item.get("url"):
                        existing_urls.add(item["url"])
        except Exception as e:
            print(f"⚠️ 기존 news.json 읽기 실패 (새로 생성): {e}")

    # 2. 신규 API 요청
    articles = []
    target_symbols = [s for s in PORTFOLIO_SYMBOLS if s not in {"USD", "KRW"}][:20]

    p1 = {"api_token": API_TOKEN, "language": "en", "limit": 50, "symbols": ",".join(target_symbols)}
    try:
        r1 = requests.get(API_URL, params=p1, timeout=20)
        if r1.status_code == 200:
            articles.extend(r1.json().get("data") or [])
    except Exception as e:
        print(f"⚠️ 보유 종목 뉴스 수집 실패: {e}")

    p2 = {"api_token": API_TOKEN, "language": "en", "limit": 50, "countries": "us"}
    try:
        r2 = requests.get(API_URL, params=p2, timeout=20)
        if r2.status_code == 200:
            articles.extend(r2.json().get("data") or [])
    except Exception as e:
        print(f"⚠️ 전체 시장 뉴스 수집 실패: {e}")

    # 3. 신규 기사 필터링 및 번역
    new_market = []
    new_portfolio = []
    seen_in_this_run = set()

    for art in articles:
        url = art.get("url")
        if not url or url in existing_urls or url in seen_in_this_run or is_excluded(art):
            continue
            
        seen_in_this_run.add(url)
        item = make_article(art)

        if item["symbol"]:
            new_portfolio.append(item)
        else:
            new_market.append(item)

    # 4. 기존 기사와 신규 기사 합치기 (최신 기사가 상단으로)
    combined_market = new_market + existing_market
    combined_portfolio = new_portfolio + existing_portfolio

    # 5. 보유 종목 기사는 전체 시장 뉴스 목록에서 완전 제거 (중복 방지)
    portfolio_urls = {item["url"] for item in combined_portfolio if item.get("url")}
    combined_market = [item for item in combined_market if item.get("url") not in portfolio_urls]

    output = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "status": "ok",
        "market_news": combined_market[:MAX_ARTICLES_TO_KEEP],
        "portfolio_news": combined_portfolio[:MAX_ARTICLES_TO_KEEP],
    }

    with open("news.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("=========================================")
    print(f"✅ news.json 누적 업데이트 완료!")
    print(f"- 전체 시장 뉴스: {len(output['market_news'])}개")
    print(f"- 보유 종목 뉴스: {len(output['portfolio_news'])}개")
    print("=========================================")

if __name__ == "__main__":
    fetch_data()
