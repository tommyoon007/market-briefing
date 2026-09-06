import json
import os
import re
from datetime import datetime, timezone

import requests


# =========================================================
# API 설정
# =========================================================

API_TOKEN = os.environ.get("MARKETAUX_API_TOKEN", "")
DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY", "")

API_URL = "https://api.marketaux.com/v1/news/all"
DEEPL_URL = "https://api-free.deepl.com/v2/translate"


# =========================================================
# 보유 종목
# =========================================================

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


MAX_ARTICLES_TO_KEEP = 100


# =========================================================
# 기본 함수
# =========================================================

def clean_text(value):
    if not value:
        return ""

    return re.sub(r"\s+", " ", str(value)).strip()


# =========================================================
# DeepL 번역
# =========================================================

def translate_text(text):

    if not text:
        return text

    if not DEEPL_API_KEY:
        print("❌ DEEPL_API_KEY가 없습니다.")
        return text

    try:

        response = requests.post(
            DEEPL_URL,

            # ★ 핵심 수정: API 키를 Authorization 헤더로 전달
            headers={
                "Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}"
            },

            data={
                "text": text[:500],
                "target_lang": "KO"
            },

            timeout=20
        )

        if response.status_code == 200:

            result = response.json()

            translations = result.get("translations", [])

            if translations:

                translated = translations[0].get("text", "").strip()

                if translated:
                    return translated

            print("⚠️ DeepL 응답에 번역 결과가 없습니다.")
            return text

        print(f"❌ DeepL 오류: HTTP {response.status_code}")
        print(response.text[:500])

        return text

    except Exception as e:

        print(f"❌ DeepL 요청 오류: {e}")

        return text


# =========================================================
# 기사 분석
# =========================================================

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

            pattern = rf"(?<![A-Z]){re.escape(sym)}(?![A-Z])"

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


# =========================================================
# 기사 생성
# =========================================================

def make_article(article):

    title = clean_text(article.get("title"))

    snippet = clean_text(
        article.get("description")
        or article.get("snippet")
        or article.get("content")
    )

    source = article.get("source")

    if isinstance(source, dict):

        source = (
            source.get("domain")
            or source.get("name")
        )

    elif not source:

        source = "MarketAux"

    source = clean_text(source)

    symbol, sentiment_score = parse_entities(article)

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


# =========================================================
# 기존 기사 번역 보완
# =========================================================

def repair_old_translations(items):

    repaired = 0

    for item in items:

        title = item.get("title", "")
        title_ko = item.get("title_ko", "")

        snippet = item.get("snippet", "")
        snippet_ko = item.get("snippet_ko", "")

        if title and (
            not title_ko
            or title_ko.strip() == title.strip()
        ):

            translated = translate_text(title)

            if translated != title:

                item["title_ko"] = translated
                repaired += 1

        if snippet and (
            not snippet_ko
            or snippet_ko.strip() == snippet.strip()
        ):

            translated = translate_text(snippet)

            if translated != snippet:

                item["snippet_ko"] = translated
                repaired += 1

    return repaired


# =========================================================
# 뉴스 수집
# =========================================================

def fetch_data():

    if not API_TOKEN:

        print("❌ MARKETAUX_API_TOKEN이 없습니다.")

        raise RuntimeError(
            "MARKETAUX_API_TOKEN이 누락되었습니다."
        )

    print("=========================================")
    print("🚀 뉴스 수집 시작")
    print("=========================================")

    # -----------------------------------------------------
    # 기존 news.json 불러오기
    # -----------------------------------------------------

    existing_market = []
    existing_portfolio = []
    existing_urls = set()

    if os.path.exists("news.json"):

        try:

            with open(
                "news.json",
                "r",
                encoding="utf-8"
            ) as f:

                old_data = json.load(f)

                existing_market = old_data.get(
                    "market_news", []
                )

                existing_portfolio = old_data.get(
                    "portfolio_news", []
                )

                for item in (
                    existing_market + existing_portfolio
                ):

                    if item.get("url"):

                        existing_urls.add(
                            item["url"]
                        )

            print("✅ 기존 news.json 불러오기 완료")

        except Exception as e:

            print(
                f"⚠️ 기존 news.json 읽기 실패: {e}"
            )

    # -----------------------------------------------------
    # 기존 번역 보완
    # -----------------------------------------------------

    print("🔄 기존 기사 번역 상태 확인 중...")

    repaired_count = repair_old_translations(
        existing_market + existing_portfolio
    )

    print(
        f"✅ 기존 기사 번역 보완 완료: "
        f"{repaired_count}개"
    )

    # -----------------------------------------------------
    # MarketAux API 요청
    # -----------------------------------------------------

    articles = []

    target_symbols = [
        s
        for s in sorted(PORTFOLIO_SYMBOLS)
        if s not in {"USD", "KRW"}
    ][:20]

    # 보유 종목 뉴스
    p1 = {
        "api_token": API_TOKEN,
        "language": "en",
        "limit": 50,
        "symbols": ",".join(target_symbols)
    }

    try:

        r1 = requests.get(
            API_URL,
            params=p1,
            timeout=20
        )

        print(
            f"📡 보유 종목 뉴스 API: HTTP {r1.status_code}"
        )

        if r1.status_code == 200:

            articles.extend(
                r1.json().get("data") or []
            )

        else:

            print(r1.text[:500])

    except Exception as e:

        print(f"⚠️ 보유 종목 뉴스 수집 실패: {e}")

    # 전체 시장 뉴스
    p2 = {
        "api_token": API_TOKEN,
        "language": "en",
        "limit": 50,
        "countries": "us"
    }

    try:

        r2 = requests.get(
            API_URL,
            params=p2,
            timeout=20
        )

        print(
            f"📡 전체 시장 뉴스 API: HTTP {r2.status_code}"
        )

        if r2.status_code == 200:

            articles.extend(
                r2.json().get("data") or []
            )

        else:

            print(r2.text[:500])

    except Exception as e:

        print(f"⚠️ 전체 시장 뉴스 수집 실패: {e}")

    # -----------------------------------------------------
    # 신규 기사 번역
    # -----------------------------------------------------

    new_market = []
    new_portfolio = []

    seen_in_this_run = set()

    print("🔄 신규 기사 번역 시작...")

    for art in articles:

        url = art.get("url")

        if not url:
            continue

        if url in existing_urls:
            continue

        if url in seen_in_this_run:
            continue

        if is_excluded(art):
            continue

        seen_in_this_run.add(url)

        item = make_article(art)

        if item["symbol"]:

            new_portfolio.append(item)

        else:

            new_market.append(item)

    print(
        f"✅ 신규 기사 번역 완료: "
        f"{len(new_market) + len(new_portfolio)}개"
    )

    # -----------------------------------------------------
    # 기존 + 신규 기사 합치기
    # -----------------------------------------------------

    combined_market = (
        new_market + existing_market
    )

    combined_portfolio = (
        new_portfolio + existing_portfolio
    )

    # -----------------------------------------------------
    # 중복 기사 제거
    # -----------------------------------------------------

    portfolio_urls = {
        item["url"]
        for item in combined_portfolio
        if item.get("url")
    }

    combined_market = [
        item
        for item in combined_market
        if item.get("url") not in portfolio_urls
    ]

    # -----------------------------------------------------
    # 저장
    # -----------------------------------------------------

    output = {
        "updated_at": datetime.now(
            timezone.utc
        ).isoformat(),

        "status": "ok",

        "market_news": combined_market[
            :MAX_ARTICLES_TO_KEEP
        ],

        "portfolio_news": combined_portfolio[
            :MAX_ARTICLES_TO_KEEP
        ],
    }

    with open(
        "news.json",
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            output,
            f,
            ensure_ascii=False,
            indent=2
        )

    print("=========================================")
    print("✅ news.json 누적 업데이트 완료!")
    print(
        f"- 전체 시장 뉴스: "
        f"{len(output['market_news'])}개"
    )
    print(
        f"- 보유 종목 뉴스: "
        f"{len(output['portfolio_news'])}개"
    )
    print("=========================================")


if __name__ == "__main__":

    fetch_data()
