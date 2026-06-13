"""Collect recent market/news web data through the Firecrawl CLI."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from .io import ensure_dir


DEFAULT_QUERIES = [
    "US stock market weekly update Fed rates inflation equities",
    "S&P 500 Nasdaq AI stocks market breadth last week",
    "Federal Reserve latest speech inflation rates market",
    "Treasury yields 10 year 3 month latest market update",
]

DEFAULT_SOURCE_URLS = [
    "https://www.federalreserve.gov/newsevents.htm",
    "https://home.treasury.gov/resource-center/data-chart-center/interest-rates",
    "https://www.bea.gov/data/personal-consumption-expenditures-price-index",
    "https://www.sec.gov/edgar/search/",
]


def firecrawl_command() -> list[str] | None:
    firecrawl = shutil.which("firecrawl")
    if firecrawl:
        return [firecrawl]
    npx = shutil.which("npx")
    if npx:
        return [npx, "firecrawl"]
    return None


def run_firecrawl(command: list[str], args: list[str]) -> dict[str, object]:
    full_command = [*command, *args]
    result = subprocess.run(full_command, text=True, capture_output=True, check=False)
    return {
        "command": full_command,
        "returncode": result.returncode,
        "stdout": result.stdout[-4000:],
        "stderr": result.stderr[-4000:],
    }


def safe_slug(value: str) -> str:
    return "".join(char.lower() if char.isalnum() else "-" for char in value).strip("-")[:80] or "source"


def collect_firecrawl_data(
    queries: list[str],
    source_urls: list[str],
    output_dir: Path,
    limit: int,
    tbs: str,
) -> dict[str, object]:
    ensure_dir(output_dir)
    command = firecrawl_command()
    summary: dict[str, object] = {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "output_dir": str(output_dir),
        "queries": queries,
        "source_urls": source_urls,
        "search_results": [],
        "scrape_results": [],
        "errors": [],
    }

    if command is None:
        summary["errors"].append(
            {
                "stage": "setup",
                "error": "Firecrawl CLI is not installed. Install the CLI or make npx available, then set FIRECRAWL_API_KEY.",
            }
        )
        (output_dir / "latest_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
        return summary

    status = run_firecrawl(command, ["--status"])
    summary["status"] = status
    if status["returncode"] != 0:
        summary["errors"].append(
            {
                "stage": "status",
                "error": "Firecrawl status check failed. Confirm FIRECRAWL_API_KEY and CLI authentication.",
                "stderr": status["stderr"],
            }
        )
        (output_dir / "latest_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
        return summary

    for query in queries:
        output_path = output_dir / f"search-{safe_slug(query)}.json"
        result = run_firecrawl(
            command,
            [
                "search",
                query,
                "--sources",
                "news",
                "--tbs",
                tbs,
                "--scrape",
                "--limit",
                str(limit),
                "--json",
                "-o",
                str(output_path),
            ],
        )
        result["output"] = str(output_path)
        summary["search_results"].append(result)
        if result["returncode"] != 0:
            summary["errors"].append({"stage": "search", "query": query, "stderr": result["stderr"]})

    for url in source_urls:
        output_path = output_dir / f"scrape-{safe_slug(url)}.md"
        result = run_firecrawl(
            command,
            [
                "scrape",
                url,
                "--only-main-content",
                "-o",
                str(output_path),
            ],
        )
        result["output"] = str(output_path)
        summary["scrape_results"].append(result)
        if result["returncode"] != 0:
            summary["errors"].append({"stage": "scrape", "url": url, "stderr": result["stderr"]})

    (output_dir / "latest_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect market/news data through Firecrawl CLI.")
    parser.add_argument("--query", action="append", dest="queries", help="News/search query. Repeatable.")
    parser.add_argument("--ticker", action="append", dest="tickers", help="Ticker to add company-specific news queries. Repeatable.")
    parser.add_argument("--source-url", action="append", dest="source_urls", help="Known source URL to scrape. Repeatable.")
    parser.add_argument("--output-dir", type=Path, default=Path("data/raw/firecrawl"))
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--tbs", default="qdr:w", help="Firecrawl search time filter, e.g. qdr:d or qdr:w.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    queries = list(args.queries or DEFAULT_QUERIES)
    for ticker in args.tickers or []:
        symbol = ticker.upper()
        queries.append(f"{symbol} stock news earnings valuation analyst research last week")
        queries.append(f"{symbol} investor relations SEC filing latest")
    source_urls = list(args.source_urls or DEFAULT_SOURCE_URLS)
    summary = collect_firecrawl_data(queries, source_urls, args.output_dir, args.limit, args.tbs)
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    if summary.get("errors"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
