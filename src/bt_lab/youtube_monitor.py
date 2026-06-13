"""Monitor a YouTube channel and convert transcripts into Buffett-filtered signals."""

from __future__ import annotations

import argparse
import csv
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .io import ensure_dir
from .transcript_parser import extract_events_from_text


API_BASE = "https://transcriptapi.com/api/v2/youtube"
DEFAULT_CHANNEL = "@la_banker"
USER_AGENT = "BuffettMarketConsole/0.1"


def api_key() -> str:
    key = os.environ.get("TRANSCRIPT_API_KEY", "").strip()
    if not key:
        raise RuntimeError("TRANSCRIPT_API_KEY is required for youtube-full / TranscriptAPI requests.")
    return key


def api_get(path: str, params: dict[str, str]) -> Any:
    query = urllib.parse.urlencode(params)
    request = urllib.request.Request(
        f"{API_BASE}{path}?{query}",
        headers={
            "Authorization": f"Bearer {api_key()}",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"TranscriptAPI HTTP {exc.code}: {body}") from exc


def response_items(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in ("results", "videos", "items", "data"):
            value = payload.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    return []


def video_id(video: dict[str, Any]) -> str | None:
    for key in ("video_id", "videoId", "id"):
        value = video.get(key)
        if isinstance(value, str) and value:
            return value
    url = str(video.get("url") or video.get("video_url") or "")
    match = urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get("v", [])
    return match[0] if match else None


def published_at(video: dict[str, Any]) -> str:
    for key in ("published", "published_at", "publishedAt", "upload_date"):
        value = video.get(key)
        if value:
            return str(value)
    return datetime.now(timezone.utc).isoformat()


def load_seen(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return set(json.loads(path.read_text()).get("video_ids", []))


def save_seen(path: Path, seen: set[str]) -> None:
    ensure_dir(path.parent)
    path.write_text(json.dumps({"video_ids": sorted(seen)}, indent=2))


def latest_videos(channel: str) -> list[dict[str, Any]]:
    payload = api_get("/channel/latest", {"channel": channel})
    return response_items(payload)


def fetch_transcript(video: dict[str, Any]) -> dict[str, Any]:
    vid = video_id(video)
    if not vid:
        raise ValueError(f"Could not identify video id from: {video}")
    payload = api_get(
        "/transcript",
        {
            "video_url": vid,
            "format": "text",
            "include_timestamp": "true",
            "send_metadata": "true",
        },
    )
    transcript = payload if isinstance(payload, str) else payload.get("transcript", "")
    metadata = {} if isinstance(payload, str) else payload.get("metadata", {})
    return {
        "video_id": vid,
        "published_at": published_at(video),
        "title": video.get("title") or metadata.get("title") or "",
        "channel": metadata.get("author_name") or DEFAULT_CHANNEL,
        "transcript": transcript,
        "source_url": f"https://youtube.com/watch?v={vid}",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def buffett_verdict(event: dict[str, Any]) -> dict[str, str]:
    evidence = str(event.get("raw_evidence", "")).lower()
    direction = str(event.get("direction", "neutral"))
    score = int(event.get("transcript_score", 0))
    has_price_plan = bool(event.get("support_level") or event.get("target_price") or event.get("risk_level"))
    mentions_fundamentals = any(
        word in evidence
        for word in ("估值", "现金流", "护城河", "财报", "盈利", "valuation", "cash flow", "moat", "earnings")
    )

    if direction == "bearish":
        return {
            "buffett_action": "do_not_execute",
            "buffett_reason": "Signal is bearish; Buffett logic treats it as risk review, not a buy trigger.",
        }
    if score >= 70 and has_price_plan and mentions_fundamentals:
        return {
            "buffett_action": "research_then_possible_trade",
            "buffett_reason": "Transcript has direction, price plan, and fundamental context; still requires intrinsic value and margin-of-safety check before execution.",
        }
    if score >= 60 and has_price_plan:
        return {
            "buffett_action": "watchlist_only",
            "buffett_reason": "Price levels exist, but the transcript does not prove business quality, owner earnings, or margin of safety.",
        }
    return {
        "buffett_action": "ignore_for_trading",
        "buffett_reason": "Insufficient ticker, price, risk, or fundamental evidence for a Buffett-compatible trade.",
    }


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    ensure_dir(path.parent)
    with path.open("a", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_signal_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    ensure_dir(path.parent)
    fields = [
        "event_date",
        "ticker",
        "direction",
        "support_level",
        "resistance_level",
        "target_price",
        "risk_level",
        "transcript_score",
        "video_id",
        "source_url",
        "buffett_action",
        "buffett_reason",
        "raw_evidence",
    ]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fields})


def monitor_channel(channel: str, output_dir: Path, include_seen: bool = False) -> dict[str, Any]:
    ensure_dir(output_dir)
    seen_path = output_dir / "seen_videos.json"
    seen = load_seen(seen_path)
    videos = latest_videos(channel)
    new_videos = [video for video in videos if include_seen or video_id(video) not in seen]
    transcripts: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    for video in new_videos:
        try:
            transcripts.append(fetch_transcript(video))
            time.sleep(0.2)
        except Exception as exc:  # noqa: BLE001 - report per-video failures for automation.
            errors.append({"video_id": video_id(video) or "unknown", "error": str(exc)})

    if transcripts:
        today = datetime.now(timezone.utc).date().isoformat()
        write_jsonl(output_dir / f"transcripts_{today}.jsonl", transcripts)

    signal_rows: list[dict[str, Any]] = []
    for transcript in transcripts:
        events = extract_events_from_text(transcript["video_id"], transcript["published_at"], transcript["transcript"])
        for event in events:
            enriched = {
                **event,
                "event_date": str(event["event_date"]),
                "source_url": transcript["source_url"],
                **buffett_verdict(event),
            }
            signal_rows.append(enriched)

    if signal_rows:
        write_signal_csv(output_dir / "latest_signals.csv", signal_rows)

    seen.update(filter(None, (video_id(video) for video in new_videos)))
    save_seen(seen_path, seen)

    summary = {
        "channel": channel,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "videos_seen_from_api": len(videos),
        "new_videos_checked": len(new_videos),
        "transcripts_saved": len(transcripts),
        "signals_extracted": len(signal_rows),
        "errors": errors,
    }
    (output_dir / "latest_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Monitor YouTube channel transcripts and Buffett-filter trade signals.")
    parser.add_argument("--channel", default=DEFAULT_CHANNEL, help="YouTube @handle, channel URL, or channel ID.")
    parser.add_argument("--output-dir", type=Path, default=Path("data/raw/youtube/la_banker"))
    parser.add_argument("--include-seen", action="store_true", help="Reprocess videos already seen before.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        summary = monitor_channel(args.channel, args.output_dir, args.include_seen)
    except RuntimeError as exc:
        summary = {
            "channel": args.channel,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "videos_seen_from_api": 0,
            "new_videos_checked": 0,
            "transcripts_saved": 0,
            "signals_extracted": 0,
            "errors": [{"video_id": "channel", "error": str(exc)}],
        }
        ensure_dir(args.output_dir)
        (args.output_dir / "latest_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
        print(json.dumps(summary, indent=2, ensure_ascii=False))
        raise SystemExit(1) from exc
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
