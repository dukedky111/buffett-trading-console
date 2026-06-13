# 第一版实现说明

本项目第一版分为两步：

1. 抓取和整理五年数据集。
2. 基于数据集运行交易/回测程序。

## 1. 数据集

默认目录：

```text
data/raw/ohlcv/{TICKER}.csv
data/raw/transcripts/transcripts.csv
data/processed/events.csv
data/processed/assessments.csv
data/reports/backtest_summary.csv
data/reports/trades.csv
data/reports/equity_curve.csv
```

## 2. 安装依赖

```bash
python3 -m pip install -r requirements.txt
```

如果只运行本地样例数据，核心回测只需要 pandas。抓取 Yahoo Finance 五年行情需要 yfinance。

## 3. 抓取五年行情

```bash
python3 -m src.bt_lab.dataset_builder \
  --tickers AAPL MSFT NVDA SPY QQQ \
  --years 5 \
  --fetch-yahoo
```

输出：

```text
data/raw/ohlcv/AAPL.csv
data/raw/ohlcv/MSFT.csv
...
```

标准 OHLCV 字段：

```text
date,open,high,low,close,adj_close,volume,ticker
```

## 4. 整理 transcript 数据

准备一个 CSV：

```text
video_id,published_at,transcript
abc123,2024-05-20 09:30:00,"今天重点看 NVDA，900 附近支撑，目标 1000，跌破 860 要小心。"
```

然后运行：

```bash
python3 -m src.bt_lab.transcript_parser \
  --input data/raw/transcripts/transcripts.csv \
  --output data/processed/events.csv
```

生成事件字段：

```text
event_date,ticker,direction,support_level,resistance_level,buy_zone_low,buy_zone_high,target_price,risk_level,transcript_score,raw_evidence
```

## 5. Buffett assessment 数据

第一版先用手工/半自动 CSV 输入，因为真正的财报估值需要额外数据源。

```text
date,ticker,quality_score,intrinsic_value,required_margin_of_safety,management_integrity_problem,major_financial_red_flags,price_level_score
2024-05-20,NVDA,82,1050,0.30,false,false,70
```

后续可接财报 API 自动生成。

可以先从 events 自动生成模板：

```bash
python3 -m src.bt_lab.assessment_template \
  --events data/processed/events.csv \
  --output data/processed/assessments.csv
```

然后填入每个 ticker 的 `quality_score`、`intrinsic_value` 和风险标记。

## 6. 运行回测

```bash
python3 -m src.bt_lab.backtester \
  --prices-dir data/raw/ohlcv \
  --events data/processed/events.csv \
  --assessments data/processed/assessments.csv \
  --strategy buffett_transcript \
  --initial-cash 100000 \
  --output-dir data/reports
```

## 8. 本地样例 smoke test

```bash
python3 -m src.bt_lab.transcript_parser \
  --input examples/transcripts.csv \
  --output /tmp/bt_events.csv

python3 -m src.bt_lab.backtester \
  --prices-dir examples/ohlcv \
  --events /tmp/bt_events.csv \
  --assessments examples/assessments.csv \
  --strategy buffett_transcript \
  --initial-cash 100000 \
  --output-dir /tmp/bt_reports
```

也可以测试直接跟随视频：

```bash
python3 -m src.bt_lab.backtester \
  --prices-dir data/raw/ohlcv \
  --events data/processed/events.csv \
  --strategy transcript_direct \
  --initial-cash 100000 \
  --output-dir data/reports
```

## 7. 当前回测假设

- 日线回测。
- 只做多。
- 不使用融资。
- 信号日收盘后生成信号，下一交易日开盘执行。
- 止损和目标价用当日 high/low 判断。
- 默认最多持有 60 个交易日。
- 手续费和滑点都计入交易成本。

这些假设比“当日看到信号立刻按最优价格成交”更保守。
