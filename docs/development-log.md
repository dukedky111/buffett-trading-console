# Development Log

Project: Buffett Transcript Trading / Market Console

Workspace:

```text
/Users/apple/Documents/Trading Philosophy
```

## Completed Work

### 1. Buffett Skill

- Installed `agi-now/buffett-skills`.
- Added Buffett investment logic as the default decision framework.
- Core concepts used:
  - Circle of competence
  - Durable moat
  - Owner earnings
  - Management integrity
  - Balance sheet safety
  - Conservative intrinsic value
  - Margin of safety
  - Position sizing discipline

### 2. Strategy Documentation

Created strategy and pipeline documentation:

```text
README.md
docs/strategy.md
docs/data-pipeline.md
docs/scoring-model.md
docs/backtest-rules.md
docs/implementation.md
```

### 3. Data and Backtest Code

Created the first version of the data and backtesting pipeline:

```text
src/bt_lab/dataset_builder.py
src/bt_lab/transcript_parser.py
src/bt_lab/assessment_template.py
src/bt_lab/backtester.py
src/bt_lab/models.py
src/bt_lab/io.py
```

Implemented:

- Five-year OHLCV dataset builder.
- Transcript event parser.
- Buffett assessment CSV template generator.
- Long-only daily backtester.
- Two initial strategies:
  - `transcript_direct`
  - `buffett_transcript`

### 4. Market Data

Fetched and normalized five years of daily OHLCV data for:

```text
SPY
QQQ
AAPL
MSFT
NVDA
TSLA
META
GOOGL
AMZN
```

Normalized schema:

```text
date, open, high, low, close, adj_close, volume, ticker
```

### 5. Website Prototype

Created the website prototype:

```text
web/index.html
web/styles.css
web/app.js
```

Current local URL:

```text
http://127.0.0.1:8080
```

## Current Website Features

### 1. Portfolio Allocation

- Displays asset allocation as a dynamic SVG pie chart.
- Each slice is generated from allocation data.
- Slice labels and percentages update automatically when allocation values change.
- Each slice has a visible border.
- Hovering over a slice shows detailed holdings:
  - Ticker
  - Weight
  - Buffett score
  - Holding advice
- Clicking a slice opens the full holdings table.

### 2. First-Time Setup

On first website visit, the user is asked for:

- Current holdings
- Trading philosophy
- Risk tolerance
- Investment horizon

The profile is saved in local storage and used to adjust homepage recommendations.

### 3. Trading Logic Selector

Supported trading logic options:

```text
Overall Combined Advice
Buffett Value Default
Transcript Signal
Momentum Trend
Mean Reversion
ETF Rotation
```

Buffett logic remains the default and highest-priority framework.

### 4. Direct Trade Instructions

Homepage includes a `Direct Action Plan / 今日交易指令` module.

Each recommendation gives simple step-by-step actions, for example:

```text
1. Keep current position
2. Do not exceed 12% single-position exposure
3. Add only if the price returns to a margin-of-safety zone
```

Clicking a recommendation opens a detailed explanation with:

- Simple execution steps
- Reasoning
- Key risks
- User holding background
- Buffett checklist

### 5. Market Update

Market update supports:

- US
- Europe & UK
- China (HK)
- Rates

It includes:

- Index tables
- Rate tables
- Market internals
- Style factors
- Macro inputs
- Portfolio read-through

It also includes a date picker for switching daily market update content.

Current sample dates:

```text
2026-06-13
2026-06-12
2026-06-10
```

### 6. News Monitor

News is organized by expandable categories:

```text
Company News
Fed / Rates
Macro / Market Breadth
China / Europe
```

Clicking a news item opens a research brief with:

- News detail
- Buffett interpretation
- Trading implication
- Citation links

### 7. Equity Research

Equity research cards currently include:

```text
MSFT
GOOGL
TSLA
```

Clicking a research card opens a Goldman-style research report with:

- Investment view
- Positive drivers
- Key risks
- Buffett valuation frame
- Portfolio action

### 8. Personal Connection Area

The website includes placeholders for:

- Broker / portfolio connection
- Research sources
- YouTube transcript source

### 9. Personalized Holdings Customization

Added portfolio-driven customization across the website.

When the user enters holdings such as:

```text
MSFT 18%, NVDA 12%, TSLA 8%, BTC 4%, cash 20%
```

the website now customizes:

- Asset allocation pie chart and hover details.
- Homepage Buffett recommendation.
- Direct trade instruction cards.
- Strategy-specific recommendations.
- Company-specific seven-day news categories.
- News detail reports with citation links.
- Goldman-style equity research cards.
- Full research report modals.
- Market update portfolio read-through.

If the user enters a ticker that is not in the preset company library, the website creates a generic underwriting profile and labels it as requiring manual financial statement review before core sizing.

### 10. Structured First-Time Portfolio Setup

Updated the first-entry setup dialog.

The user now enters:

- Total account amount.
- One asset per row.
- Asset name / ticker / ETF / bond name.
- Quantity, dollar amount, or percentage beside each asset.
- A plus button to add more asset rows.
- A remove button to delete rows.

Examples:

```text
MSFT | 18000 USD
NVDA | 12%
SGOV | 20000 USD
```

If total amount is provided, dollar amounts are converted into portfolio weights. If weights do not add to 100%, the remaining allocation is treated as cash / unallocated dry powder.

### 11. LA Banker YouTube Monitor

Installed:

```text
/Users/apple/.codex/skills/youtube-full
```

Added:

```text
src/bt_lab/youtube_monitor.py
docs/youtube-monitor.md
```

The monitor checks:

```text
https://youtube.com/@la_banker
```

Workflow:

- Check latest channel videos.
- Fetch transcripts through `youtube-full` / TranscriptAPI when `TRANSCRIPT_API_KEY` is available.
- Save transcripts.
- Extract ticker, direction, support, target, and risk level.
- Apply Buffett logic before allowing any trade idea to become actionable.
- Output one of:
  - `research_then_possible_trade`
  - `watchlist_only`
  - `do_not_execute`
  - `ignore_for_trading`

Created automation:

```text
LA Banker YouTube monitor
```

Automation ID:

```text
la-banker-youtube-monitor
```

Schedule:

```text
Every day at 06:00
```

Member-only content note: the system assumes the user has membership, but if the transcript source cannot access a member-only video, it records the access failure instead of fabricating content.

## Automation

Created automation:

```text
Daily market data refresh
```

Automation ID:

```text
daily-market-data-refresh
```

Schedule:

```text
Every day at 06:00
```

Workspace:

```text
/Users/apple/Documents/Trading Philosophy
```

Automation responsibilities:

- Refresh portfolio holdings where available.
- Read the saved user profile and customize outputs by held companies and asset types.
- Refresh market OHLCV data.
- Refresh rates and macro inputs.
- Refresh recent seven-day news.
- Refresh equity research summaries.
- Refresh company-specific news, citations, and full research notes for the user's holdings.
- Refresh YouTube transcript events if transcript files are present.
- Check `@la_banker` daily and Buffett-filter extracted YouTube trade signals.
- Refresh Buffett quality and safety-margin assessments where inputs exist.
- Refresh market update content.
- Refresh homepage trade recommendations.
- Refresh detailed trade rationale and risk modules.
- List unavailable sources, errors, recommendation changes, and manual next actions.

Default recommendation framework:

- Business quality
- Moat durability
- Owner earnings
- Management integrity
- Balance sheet safety
- Conservative intrinsic value
- Margin of safety
- Position sizing discipline

If other strategies conflict with Buffett logic, the automation should label the conflict and prioritize avoiding permanent capital loss.

## Verification Completed

Verified with local commands and headless Chrome:

- Python smoke tests passed.
- Transcript parser extracts ticker, support level, target price, and risk level.
- JavaScript syntax check passed.
- Website interactions work:
  - Dynamic pie chart hover
  - Holdings modal
  - News detail modal
  - Equity research modal
  - Market date selector
  - Strategy selector
  - First-time onboarding
  - Direct trade instruction modal
- Desktop layout has no horizontal overflow.
- Mobile layout has no horizontal overflow.

## Pending Work

### Data Integrations

- Connect real broker account or portfolio CSV.
- Connect real news API or RSS feeds.
- Connect real equity research sources.
- Connect YouTube channel transcript ingestion.
- Connect macro/rates data providers.

### Investment Engine

- Automate Buffett quality score generation.
- Automate intrinsic value estimates.
- Automate margin-of-safety calculation.
- Persist user profile and portfolio data beyond browser local storage.
- Store daily recommendation history.
- Compare recommendation changes day over day.

### Backend

- Replace frontend mock data with backend data endpoints.
- Add a persistent database.
- Add scheduled dataset refresh scripts.
- Generate daily market update files consumed by the frontend.

### Product Improvements

- Add account-level risk dashboard.
- Add tax-aware selling logic.
- Add position drift alerts.
- Add trade execution checklist export.
- Add PDF export for daily market update and recommendations.
