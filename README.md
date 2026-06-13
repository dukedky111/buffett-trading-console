# Buffett Transcript Trading

巴菲特价值投资框架 + YouTube transcript 信息雷达 + 点位提醒的交易研究项目。

本项目的核心思想：

> 视频负责发现机会，Buffett 框架负责判断能不能买，估值决定价格是否合理，点位系统负责执行提醒，风控决定仓位大小。

## 项目目标

1. 抓取指定 YouTube 频道的视频标题、发布时间、描述和 transcript。
2. 从 transcript 中提取股票、公司、点位、方向、风险提示和时间周期。
3. 用 Buffett 价值投资框架过滤候选股票。
4. 计算企业质量、护城河、财务质量、管理层和估值安全边际。
5. 输出观察、等待、买入、加仓、减仓、卖出或放弃信号。
6. 保留每条信号的原文证据，方便复盘和回测。

## 第一版可运行流程

安装依赖：

```bash
python3 -m pip install -r requirements.txt
```

抓取五年行情：

```bash
python3 -m src.bt_lab.dataset_builder \
  --tickers AAPL MSFT NVDA SPY QQQ \
  --years 5 \
  --fetch-yahoo
```

解析 transcript：

```bash
python3 -m src.bt_lab.transcript_parser \
  --input data/raw/transcripts/transcripts.csv \
  --output data/processed/events.csv
```

检查 `@la_banker` 最新视频并提炼 Buffett 过滤后的交易信号：

```bash
export TRANSCRIPT_API_KEY="sk_your_key_here"

python3 -m src.bt_lab.youtube_monitor \
  --channel @la_banker \
  --output-dir data/raw/youtube/la_banker
```

输出会写入：

```text
data/raw/youtube/la_banker/transcripts_YYYY-MM-DD.jsonl
data/raw/youtube/la_banker/latest_signals.csv
data/raw/youtube/la_banker/latest_summary.json
```

生成 Buffett assessment 模板：

```bash
python3 -m src.bt_lab.assessment_template \
  --events data/processed/events.csv \
  --output data/processed/assessments.csv
```

运行 Buffett + transcript 回测：

```bash
python3 -m src.bt_lab.backtester \
  --prices-dir data/raw/ohlcv \
  --events data/processed/events.csv \
  --assessments data/processed/assessments.csv \
  --strategy buffett_transcript \
  --initial-cash 100000 \
  --output-dir data/reports
```

更多说明见 [docs/implementation.md](docs/implementation.md) 和 [docs/youtube-monitor.md](docs/youtube-monitor.md)。

## 打开网站原型

```bash
python3 -m http.server 8080 --directory web
```

然后访问：

```text
http://127.0.0.1:8080
```

当前网站包含资产配置饼图、持仓下钻、交易逻辑选择、每日宏观 market update、新闻/研报 feed、Buffett 默认交易建议和个人账户连接入口。

## 交易哲学

- 不根据市场预测交易。
- 不根据播主一句话交易。
- 不追热点，不追高。
- 只在好公司、好价格和足够安全边际同时出现时行动。
- 管理层诚信问题一票否决。
- 股价下跌不是卖出理由，投资逻辑破坏才是卖出理由。
- 仓位由确定性决定，不由情绪决定。

## 核心流程

```text
YouTube 视频/字幕
-> 股票与点位提取
-> 视频信号评分
-> Buffett 八问过滤
-> 企业质量评分
-> 护城河评分
-> 财务质量评分
-> 估值与安全边际
-> 技术点位确认
-> 仓位与风险控制
-> 交易提醒
```

## 目录结构

```text
.
├── README.md
├── docs
│   ├── strategy.md
│   ├── data-pipeline.md
│   ├── scoring-model.md
│   └── backtest-rules.md
├── config
│   └── signal_rules.example.yaml
└── src
    └── signal_engine.py
```

## 信号等级

| 等级 | 动作 | 含义 |
| --- | --- | --- |
| A | 买入 / 加仓 | 企业质量高，估值便宜，安全边际足，点位合适 |
| B | 等待 | 企业质量高，但价格不够便宜 |
| C | 观察 | 视频提到，但基本面或估值仍需确认 |
| D | 放弃 | 不在能力圈、无护城河、财务差或估值无法判断 |
| E | 减仓 / 卖出 | 价格严重高估，或原始投资逻辑破坏 |

## 免责声明

本项目只用于交易研究和策略设计，不构成投资建议。任何实盘交易都需要独立判断，并承担相应风险。
