# 数据流程

## 1. 输入数据

主要输入：

- YouTube 频道视频列表。
- 视频标题。
- 视频发布时间。
- 视频描述。
- 视频 transcript。
- 股票行情。
- 财报数据。
- 公司基本面数据。

## 2. YouTube 处理流程

```text
指定频道
-> 拉取新视频
-> 判断是否包含 market prediction / 股票 / 公司 / 点位内容
-> 获取 transcript
-> 分段解析
-> 提取股票事件
-> 保存原文证据和时间戳
```

## 3. Transcript 提取字段

| 字段 | 说明 |
| --- | --- |
| ticker | 股票代码 |
| company | 公司名 |
| video_id | YouTube 视频 ID |
| video_time | 视频发布时间 |
| transcript_time | 字幕时间戳 |
| direction | bullish / bearish / neutral |
| support_level | 支撑位 |
| resistance_level | 压力位 |
| buy_zone | 买入区 |
| target_price | 目标价 |
| risk_level | 风险位或止损参考 |
| catalyst | 财报、宏观、板块、产品、估值等 |
| confidence_text | 语气强度 |
| raw_evidence | 原文片段 |

## 4. 标准事件格式

```json
{
  "ticker": "NVDA",
  "company": "Nvidia",
  "video_id": "example_video_id",
  "video_time": "2026-06-13T09:00:00Z",
  "transcript_time": "00:12:31",
  "direction": "bullish",
  "support_level": 120.0,
  "resistance_level": 140.0,
  "buy_zone": [115.0, 122.0],
  "target_price": 150.0,
  "risk_level": 110.0,
  "catalyst": "AI earnings momentum",
  "confidence_text": "high",
  "raw_evidence": "..."
}
```

## 5. 数据存储建议

最小实现：

```text
data/raw/videos.jsonl
data/raw/transcripts.jsonl
data/processed/events.jsonl
data/processed/signals.jsonl
```

进阶实现：

```text
SQLite / DuckDB
videos
transcripts
stock_events
company_scores
valuation_snapshots
trade_signals
backtest_trades
```

## 6. 合规原则

- 优先使用官方 API 或符合平台规则的方式获取数据。
- 保存视频链接和 transcript 时间戳，便于审计。
- 不把视频观点当作投资建议。
- 不绕过平台访问限制。
