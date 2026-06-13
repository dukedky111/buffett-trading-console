# 评分模型

## 1. 视频信号评分

满分 100。

| 维度 | 分数 | 说明 |
| --- | --- | --- |
| 股票是否明确 | 20 | 是否明确提到公司或 ticker |
| 点位是否明确 | 20 | 是否有支撑、压力、买入区、目标价 |
| 逻辑是否清晰 | 20 | 是否说明为什么看多或看空 |
| 是否有风险提示 | 10 | 是否提到失效条件 |
| 是否与基本面一致 | 20 | 是否能被财报、行业、估值验证 |
| 是否重复提到 | 10 | 多期视频是否持续关注 |

等级：

| 分数 | 处理 |
| --- | --- |
| 80-100 | 高质量观察信号 |
| 60-79 | 普通观察信号 |
| 40-59 | 只记录，不交易 |
| <40 | 忽略 |

## 2. Buffett Quality Score

满分 100。

| 维度 | 分数 |
| --- | --- |
| 能力圈 | 10 |
| 商业模式清晰 | 10 |
| 护城河强度 | 20 |
| 定价权 | 10 |
| ROIC / ROE 质量 | 15 |
| 现金流质量 | 15 |
| 资产负债表安全 | 10 |
| 管理层与资本配置 | 10 |

## 3. 安全边际评分

```text
margin_of_safety = (intrinsic_value - current_price) / intrinsic_value
```

| 安全边际 | 分数 |
| --- | --- |
| >= 50% | 100 |
| 40%-50% | 85 |
| 30%-40% | 70 |
| 20%-30% | 50 |
| <20% | 0 |

## 4. 最终动作规则

```text
if management_integrity_problem:
    action = "REJECT"
elif buffett_quality_score < 65:
    action = "REJECT"
elif margin_of_safety < required_margin:
    action = "WAIT"
elif transcript_score >= 60 and price_level_score >= 60:
    action = "BUY_CANDIDATE"
else:
    action = "WATCH"
```

## 5. 仓位评分

基础仓位：

| 条件 | 初始仓位 |
| --- | --- |
| Quality >= 85 且 MOS >= 40% | 5%-8% |
| Quality >= 75 且 MOS >= 30% | 2%-4% |
| Quality >= 65 且 MOS >= 40% | <= 2% |
| 其他 | 0% |

仓位扣减：

- 资产负债表风险高：减半。
- 行业相关敞口过高：减半或不买。
- 估值敏感度高：减半。
- 视频信号强但基本面证据弱：不加仓。
