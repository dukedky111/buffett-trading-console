"""I/O helpers for normalized datasets."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pandas as pd


PRICE_COLUMNS = ["date", "open", "high", "low", "close", "adj_close", "volume", "ticker"]


def ensure_dir(path: str | Path) -> Path:
    target = Path(path)
    target.mkdir(parents=True, exist_ok=True)
    return target


def normalize_price_frame(df: pd.DataFrame, ticker: str) -> pd.DataFrame:
    """Normalize common OHLCV column names into the project schema."""
    data = df.copy()
    data.columns = [str(col).strip().lower().replace(" ", "_") for col in data.columns]

    if "date" not in data.columns:
        if data.index.name:
            data = data.reset_index()
            data = data.rename(columns={data.columns[0]: "date"})
        else:
            data = data.reset_index().rename(columns={"index": "date"})

    rename_map = {
        "adj_close": "adj_close",
        "adjusted_close": "adj_close",
        "adj_close_": "adj_close",
    }
    data = data.rename(columns=rename_map)

    if "adj_close" not in data.columns and "close" in data.columns:
        data["adj_close"] = data["close"]

    data["date"] = pd.to_datetime(data["date"]).dt.date
    data["ticker"] = ticker.upper()

    missing = [col for col in PRICE_COLUMNS if col not in data.columns]
    if missing:
        raise ValueError(f"{ticker}: missing required price columns: {missing}")

    data = data[PRICE_COLUMNS].sort_values("date").drop_duplicates(["date", "ticker"])
    numeric_cols = ["open", "high", "low", "close", "adj_close", "volume"]
    for col in numeric_cols:
        data[col] = pd.to_numeric(data[col], errors="coerce")
    return data.dropna(subset=["open", "high", "low", "close"])


def load_price_files(prices_dir: str | Path) -> dict[str, pd.DataFrame]:
    root = Path(prices_dir)
    frames: dict[str, pd.DataFrame] = {}
    for path in sorted(root.glob("*.csv")):
        ticker = path.stem.upper()
        df = pd.read_csv(path)
        normalized = normalize_price_frame(df, ticker)
        normalized["date"] = pd.to_datetime(normalized["date"]).dt.date
        frames[ticker] = normalized.set_index("date").sort_index()
    if not frames:
        raise FileNotFoundError(f"No price CSV files found in {root}")
    return frames


def load_events(path: str | Path) -> pd.DataFrame:
    events = pd.read_csv(path)
    required = {"event_date", "ticker", "transcript_score"}
    missing = required - set(events.columns)
    if missing:
        raise ValueError(f"Events file missing columns: {sorted(missing)}")
    events["event_date"] = pd.to_datetime(events["event_date"]).dt.date
    events["ticker"] = events["ticker"].astype(str).str.upper()
    return events.sort_values(["event_date", "ticker"])


def load_assessments(path: str | Path | None) -> pd.DataFrame:
    if path is None:
        return pd.DataFrame()
    assessments = pd.read_csv(path)
    required = {
        "date",
        "ticker",
        "quality_score",
        "intrinsic_value",
        "required_margin_of_safety",
        "management_integrity_problem",
        "major_financial_red_flags",
        "price_level_score",
    }
    missing = required - set(assessments.columns)
    if missing:
        raise ValueError(f"Assessments file missing columns: {sorted(missing)}")
    assessments["date"] = pd.to_datetime(assessments["date"]).dt.date
    assessments["ticker"] = assessments["ticker"].astype(str).str.upper()
    return assessments.sort_values(["date", "ticker"])


def latest_assessment(
    assessments: pd.DataFrame,
    ticker: str,
    asof: date,
) -> pd.Series | None:
    if assessments.empty:
        return None
    subset = assessments[(assessments["ticker"] == ticker) & (assessments["date"] <= asof)]
    if subset.empty:
        return None
    return subset.iloc[-1]
