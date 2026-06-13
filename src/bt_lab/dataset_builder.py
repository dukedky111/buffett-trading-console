"""Build normalized five-year OHLCV datasets."""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

from .io import ensure_dir, normalize_price_frame


def fetch_yahoo_prices(tickers: list[str], years: int, output_dir: Path) -> None:
    try:
        import yfinance as yf
    except ImportError as exc:
        raise SystemExit(
            "yfinance is required for --fetch-yahoo. Install with: "
            "python3 -m pip install -r requirements.txt"
        ) from exc

    start = datetime.now(timezone.utc).date() - timedelta(days=int(years * 365.25) + 7)
    for ticker in tickers:
        symbol = ticker.upper()
        df = yf.download(symbol, start=start.isoformat(), auto_adjust=False, progress=False)
        if df.empty:
            print(f"warning: no data returned for {symbol}")
            continue
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0] for col in df.columns]
        df = df.rename(
            columns={
                "Open": "open",
                "High": "high",
                "Low": "low",
                "Close": "close",
                "Adj Close": "adj_close",
                "Volume": "volume",
            }
        )
        normalized = normalize_price_frame(df, symbol)
        output_path = output_dir / f"{symbol}.csv"
        normalized.to_csv(output_path, index=False)
        print(f"wrote {output_path} ({len(normalized)} rows)")


def normalize_existing_csv(input_path: Path, ticker: str, output_dir: Path) -> None:
    df = pd.read_csv(input_path)
    normalized = normalize_price_frame(df, ticker)
    output_path = output_dir / f"{ticker.upper()}.csv"
    normalized.to_csv(output_path, index=False)
    print(f"wrote {output_path} ({len(normalized)} rows)")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build normalized OHLCV datasets.")
    parser.add_argument("--tickers", nargs="+", help="Tickers to fetch, e.g. AAPL MSFT NVDA")
    parser.add_argument("--years", type=int, default=5, help="Years of history to fetch")
    parser.add_argument("--fetch-yahoo", action="store_true", help="Fetch OHLCV from Yahoo Finance")
    parser.add_argument("--input-csv", type=Path, help="Normalize an existing OHLCV CSV")
    parser.add_argument("--ticker", help="Ticker for --input-csv")
    parser.add_argument("--output-dir", type=Path, default=Path("data/raw/ohlcv"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = ensure_dir(args.output_dir)

    if args.fetch_yahoo:
        if not args.tickers:
            raise SystemExit("--tickers is required with --fetch-yahoo")
        fetch_yahoo_prices(args.tickers, args.years, output_dir)
        return

    if args.input_csv:
        if not args.ticker:
            raise SystemExit("--ticker is required with --input-csv")
        normalize_existing_csv(args.input_csv, args.ticker, output_dir)
        return

    raise SystemExit("Choose --fetch-yahoo or --input-csv")


if __name__ == "__main__":
    main()
