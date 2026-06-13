# YouTube Channel Monitor

Target channel:

```text
https://youtube.com/@la_banker
```

Installed skill:

```text
/Users/apple/.codex/skills/youtube-full
```

The installed skill uses TranscriptAPI. Restart Codex to make the skill appear in the normal skill list.

## Required Environment

Set a TranscriptAPI key before running real transcript requests:

```bash
export TRANSCRIPT_API_KEY="sk_your_key_here"
```

The channel latest endpoint is free. Transcript extraction costs one credit per video.

## Daily Workflow

Every morning at 06:00, the monitor should:

1. Check the latest videos from `@la_banker`.
2. Compare them with `data/raw/youtube/la_banker/seen_videos.json`.
3. Fetch transcripts for new videos.
4. Save raw transcripts as JSONL.
5. Extract ticker, direction, support, target, risk level, and evidence.
6. Apply Buffett logic before any trading action:
   - Is the company inside the user's circle of competence?
   - Does the transcript discuss business quality, moat, owner earnings, or valuation?
   - Is there a clear price plan and risk level?
   - Is there enough margin of safety?
   - Does the signal risk permanent capital loss?
7. Output actionable verdicts:
   - `research_then_possible_trade`
   - `watchlist_only`
   - `do_not_execute`
   - `ignore_for_trading`

## Run Manually

```bash
python3 -m src.bt_lab.youtube_monitor \
  --channel @la_banker \
  --output-dir data/raw/youtube/la_banker
```

Reprocess already-seen videos:

```bash
python3 -m src.bt_lab.youtube_monitor \
  --channel @la_banker \
  --output-dir data/raw/youtube/la_banker \
  --include-seen
```

## Outputs

```text
data/raw/youtube/la_banker/transcripts_YYYY-MM-DD.jsonl
data/raw/youtube/la_banker/latest_signals.csv
data/raw/youtube/la_banker/latest_summary.json
data/raw/youtube/la_banker/seen_videos.json
```

## Member-Only Content

This project assumes the user has membership access. The current `youtube-full` skill reaches YouTube through TranscriptAPI, not through the user's browser cookies. If a member-only video transcript is unavailable through the API, the monitor must record the failure in `latest_summary.json` and mark the item as needing authenticated access rather than fabricating transcript content.
