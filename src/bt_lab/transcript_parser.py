"""Extract stock events and price levels from transcript files."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

from .io import ensure_dir


TICKER_RE = re.compile(r"\b[A-Z]{1,5}\b")
PRICE_RE = re.compile(r"(?<![A-Za-z])\$?\b(\d{1,5}(?:\.\d{1,2})?)\b")

POSITIVE_WORDS = ("看多", "买", "支撑", "突破", "目标", "bullish", "buy", "support", "breakout", "target")
NEGATIVE_WORDS = ("看空", "卖", "跌破", "风险", "止损", "bearish", "sell", "risk", "stop")
RISK_WORDS = ("风险", "止损", "跌破", "小心", "risk", "stop", "invalid")
TARGET_WORDS = ("目标", "看到", "target", "take profit")
SUPPORT_WORDS = ("支撑", "买入区", "附近买", "support", "buy zone")
RESISTANCE_WORDS = ("压力", "阻力", "resistance")

COMMON_WORDS = {
    "CEO",
    "CPI",
    "EPS",
    "ETF",
    "FOMC",
    "GDP",
    "IPO",
    "PE",
    "QE",
    "QT",
    "RSI",
    "SEC",
    "USA",
    "USD",
}


def infer_direction(text: str) -> str:
    lower = text.lower()
    pos = sum(1 for word in POSITIVE_WORDS if word.lower() in lower)
    neg = sum(1 for word in NEGATIVE_WORDS if word.lower() in lower)
    if pos > neg:
        return "bullish"
    if neg > pos:
        return "bearish"
    return "neutral"


def find_nearest_price(text: str, keywords: tuple[str, ...], prefer_after: bool = False) -> float | None:
    lower = text.lower()
    best_index: int | None = None
    for keyword in keywords:
        index = lower.find(keyword.lower())
        if index >= 0 and (best_index is None or index < best_index):
            best_index = index
    if best_index is None:
        return None

    if prefer_after:
        after_window = text[best_index : best_index + 80]
        after_prices = [float(match.group(1)) for match in PRICE_RE.finditer(after_window)]
        if after_prices:
            return after_prices[0]

    window_start = max(0, best_index - 50)
    window = text[window_start : best_index + 80]
    matches = list(PRICE_RE.finditer(window))
    if not matches:
        return None
    nearest = min(matches, key=lambda match: abs((window_start + match.start()) - best_index))
    return float(nearest.group(1))


def score_event(text: str, ticker: str, prices: list[float]) -> int:
    lower = text.lower()
    score = 20 if ticker else 0
    score += 20 if prices else 0
    score += 20 if any(word.lower() in lower for word in POSITIVE_WORDS + NEGATIVE_WORDS) else 0
    score += 10 if any(word.lower() in lower for word in RISK_WORDS) else 0
    score += 20 if any(word.lower() in lower for word in ("财报", "估值", "现金流", "earnings", "valuation", "cash flow")) else 0
    return min(score, 100)


def extract_events_from_text(video_id: str, published_at: str, text: str) -> list[dict[str, object]]:
    tickers = sorted({match.group(0) for match in TICKER_RE.finditer(text)} - COMMON_WORDS)
    prices = [float(match.group(1)) for match in PRICE_RE.finditer(text)]
    if not tickers:
        return []

    event_date = pd.to_datetime(published_at).date()
    direction = infer_direction(text)
    support = find_nearest_price(text, SUPPORT_WORDS)
    resistance = find_nearest_price(text, RESISTANCE_WORDS)
    target = find_nearest_price(text, TARGET_WORDS, prefer_after=True)
    risk = find_nearest_price(text, RISK_WORDS, prefer_after=True)

    events: list[dict[str, object]] = []
    for ticker in tickers:
        score = score_event(text, ticker, prices)
        events.append(
            {
                "event_date": event_date,
                "ticker": ticker,
                "direction": direction,
                "support_level": support,
                "resistance_level": resistance,
                "buy_zone_low": support,
                "buy_zone_high": support,
                "target_price": target,
                "risk_level": risk,
                "transcript_score": score,
                "video_id": video_id,
                "raw_evidence": text[:500],
            }
        )
    return events


def parse_transcripts(input_path: Path) -> pd.DataFrame:
    if input_path.suffix.lower() == ".jsonl":
        transcripts = pd.read_json(input_path, lines=True)
    else:
        transcripts = pd.read_csv(input_path)

    required = {"video_id", "published_at", "transcript"}
    missing = required - set(transcripts.columns)
    if missing:
        raise ValueError(f"Transcript file missing columns: {sorted(missing)}")

    rows: list[dict[str, object]] = []
    for _, row in transcripts.iterrows():
        rows.extend(
            extract_events_from_text(
                str(row["video_id"]),
                str(row["published_at"]),
                str(row["transcript"]),
            )
        )
    return pd.DataFrame(rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract stock events from transcript CSV/JSONL.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("data/processed/events.csv"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    events = parse_transcripts(args.input)
    ensure_dir(args.output.parent)
    events.to_csv(args.output, index=False)
    print(f"wrote {args.output} ({len(events)} rows)")


if __name__ == "__main__":
    main()
