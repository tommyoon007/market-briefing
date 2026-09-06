import json
import os
import re
from datetime import datetime, timezone

import requests


# API 토큰 및 키 설정
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
    "leadership development",
    "flood management",
    "master plans",
    "emi affordability",
    "celebrity",
    "horoscope",
    "recipe",
    "sports scores"
]


def clean_text(value):
    if not value:
        return ""

    return re.sub(r"\s+", " ", str(value)).strip()


def translate_text(text):
    """
    DeepL API를 이용해 영어를 한국어로 번역합니다.
    번역 실패 시 원문을 반환합니다.
    """

    if not text:
        return ""

    if not DEEPL_API_KEY:
        print("⚠️ DEEPL_API_KEY가 없습니다. 원문을 사용합니다.")
        return text

    try:
        response = requests.post(
            DEEPL_URL,
            headers={
                "Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "text": [text[:500]],
                "target_lang": "KO"
            },
            timeout=20
        )

        if response.status_code == 200:
            result = response.json()
            translations = result.get("translations", [])

            if translations:
                translated = translations[0].get("text", "")

                if translated:
                    return translated

            print("⚠️ DeepL 응답에 번역 결과가 없습니다.")

        else:
            print(
                f"⚠️ DeepL 번역 실패 "
                f"(HTTP {response.status_code}): "
                f"{response.text[:300]}"
            )

    except Exception as e:
        print(f"⚠️ 번역 요청 오류 (원문 사용): {e}")

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
        text = (
            f"{article.get('title', '')} "
            f"{article.get('description', '')}"
        ).upper()

        for sym in sorted(PORTFOLIO_SYMBOLS, key=len, reverse=True):
            pattern = rf"(?<![A-Z]){re.escape(sym)}(?![A-Z)"

            if re.search(pattern, text):
                found_symbol = sym
                break

    avg_sentiment = (
        sum(sentiment_scores) / len(sentiment_scores)
        if sentiment_scores
        else 0.0
    )

    return found_symbol, round(avg_sentiment, 4)


def is_excluded(article):
    text = (
        f"{article.get('title', '')} "
        f"{article.get('description', '')}"
    ).lower()

    return any(
        keyword in text
        for keyword in EXCLUDED_KEYWORDS
    )


def make_article(article):
    title = clean_text(article.get("title"))

    snippet = clean_text(
        article.get("description")
        or article.get("snippet")
        or article.get("content")
    )

    source = article.get("source")

    if isinstance(source, dict):
        source = source.get("domain") or source.get("name")
    elif not source:
        source = "MarketAux"

    source = clean_text(source)

    symbol, sentiment_score = parse_entities(article)

    # 한국어 번역
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

    articles = []

    # 1. 주요 보유 종목 뉴스
    target_symbols = [
        symbol
        for symbol in PORTFOLIO_SYMBOLS
        if symbol not in {"USD", "KRW"}
    ][:20]

    p1 = {
        "api_token": API_TOKEN,
        "language": "en",
        "limit": 50,
        "symbols": ",".join(target_symbols),
    }

    try:
        r1 = requests.get(
            API_URL,
            params=p1,
            timeout=20
        )

        if r1.status_code == 200:
            articles.extend(r1.json().get("data") or [])
        else:
            print(
                f"⚠️ 보유 종목 뉴스 실패 "
                f"(HTTP {r1.status_code}): {r1.text[:300]}"
            )

    except Exception as e:
        print(f"⚠️ 보유 종목 뉴스 수집 실패: {e}")

    # 2. 미국 전체 시장 뉴스
    p2 = {
        "api_token": API_TOKEN,
        "language": "en",
        "limit": 50,
        "countries": "us",
    }

    try:
        r2 = requests.get(
            API_URL,
            params=p2,
            timeout=20
        )

        if r2.status_code == 200:
            articles.extend(r2.json().get("data") or [])
        else:
            print(
                f"⚠️ 전체 시장 뉴스 실패 "
                f"(HTTP {r2.status_code}): {r2.text[:300]}"
            )

    except Exception as e:
        print(f"⚠️ 전체 시장 뉴스 수집 실패: {e}")

    # URL 기준 중복 제거
    seen = set()
    unique_articles = []

    for article in articles:
        url = article.get("url")

        if url and url not in seen:
            seen.add(url)
            unique_articles.append(article)

    market_news = []
    portfolio_news = []

    for article in unique_articles:
        if is_excluded(article):
            continue

        item = make_article(article)

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
        json.dump(
            output,
            f,
            ensure_ascii=False,
            indent=2
        )

    print("=========================================")
    print("✅ news.json 생성 완료!")
    print(f"- 전체 시장 뉴스: {len(output['market_news'])}개")
    print(f"- 보유 종목 뉴스: {len(output['portfolio_news'])}개")
    print("=========================================")


if __name__ == "__main__":
    fetch_data()
