"""Create a Buffett assessment CSV template from extracted transcript events."""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from .io import ensure_dir, load_events


def build_template(events: pd.DataFrame) -> pd.DataFrame:
    unique = events[["event_date", "ticker"]].drop_duplicates().sort_values(["ticker", "event_date"])
    return pd.DataFrame(
        {
            "date": unique["event_date"],
            "ticker": unique["ticker"],
            "quality_score": 75,
            "intrinsic_value": "",
            "required_margin_of_safety": 0.30,
            "management_integrity_problem": "false",
            "major_financial_red_flags": "false",
            "price_level_score": 60,
        }
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create Buffett assessment template from events.")
    parser.add_argument("--events", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("data/processed/assessments.csv"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    events = load_events(args.events)
    template = build_template(events)
    ensure_dir(args.output.parent)
    template.to_csv(args.output, index=False)
    print(f"wrote {args.output} ({len(template)} rows)")


if __name__ == "__main__":
    main()
