const allocations = [
  {
    id: "us-equity",
    label: "US Equity",
    value: 52,
    color: "#284B63",
    holdings: [
      { ticker: "NVDA", name: "Nvidia", weight: "11.8%", score: 82, advice: "Hold, wait for larger margin" },
      { ticker: "MSFT", name: "Microsoft", weight: "10.4%", score: 88, advice: "Core compounder" },
      { ticker: "AAPL", name: "Apple", weight: "9.6%", score: 84, advice: "Hold, buybacks supportive" },
      { ticker: "GOOGL", name: "Alphabet", weight: "7.9%", score: 86, advice: "Accumulate on weakness" },
      { ticker: "AMZN", name: "Amazon", weight: "6.5%", score: 78, advice: "Watch FCF conversion" },
      { ticker: "META", name: "Meta", weight: "5.8%", score: 80, advice: "Hold with valuation guardrail" },
    ],
  },
  {
    id: "etf",
    label: "ETF",
    value: 16,
    color: "#1F8A91",
    holdings: [
      { ticker: "SPY", name: "S&P 500 ETF", weight: "9.0%", score: 76, advice: "Baseline exposure" },
      { ticker: "QQQ", name: "Nasdaq 100 ETF", weight: "7.0%", score: 74, advice: "Trim if tech concentration rises" },
    ],
  },
  {
    id: "cash",
    label: "Cash",
    value: 12,
    color: "#C58B2B",
    holdings: [
      { ticker: "USD", name: "Cash Reserve", weight: "12.0%", score: 100, advice: "Dry powder for safety margin" },
    ],
  },
  {
    id: "rates",
    label: "Rates",
    value: 11,
    color: "#4F6F52",
    holdings: [
      { ticker: "SGOV", name: "0-3M Treasury ETF", weight: "6.0%", score: 81, advice: "Liquidity reserve" },
      { ticker: "TLT", name: "20Y Treasury ETF", weight: "5.0%", score: 64, advice: "Small duration hedge" },
    ],
  },
  {
    id: "crypto",
    label: "Crypto",
    value: 9,
    color: "#7B4F8A",
    holdings: [
      { ticker: "BTC", name: "Bitcoin", weight: "6.5%", score: 58, advice: "Outside Buffett core, cap exposure" },
      { ticker: "SOL", name: "Solana", weight: "2.5%", score: 45, advice: "Speculative sleeve only" },
    ],
  },
];

const strategies = {
  overall: {
    title: "Overall Combined Advice",
    summary:
      "综合 Buffett 价值、Transcript 信息、趋势、均值回归和 ETF 轮动。最终权重以 Buffett 质量和安全边际为最高优先级，其他逻辑只改变节奏和观察优先级。",
    rules: [
      ["核心约束", "Buffett 质量分和安全边际决定能不能买。"],
      ["辅助信号", "趋势、新闻和 transcript 只提高观察优先级，不绕过估值。"],
      ["组合动作", "持有高质量资产，提高现金纪律，等待更好价格。"],
      ["冲突处理", "多策略冲突时，以永久资本损失风险最低的动作优先。"],
    ],
  },
  buffett: {
    title: "Buffett Value Default",
    summary:
      "默认交易逻辑：只买能力圈内、护城河清晰、现金流真实、管理层可信、价格低于保守内在价值的资产。视频、新闻和宏观只作为信息触发器，不直接下单。",
    rules: [
      ["买入", "Quality Score ≥ 75，安全边际 ≥ 30%，无诚信/财务红旗。"],
      ["加仓", "原始逻辑未变，价格下跌 10%-15%，安全边际扩大。"],
      ["卖出", "严重高估、护城河破坏、管理层诚信问题或更好机会。"],
      ["仓位", "普通机会 2%-4%，高确定性 5%-8%，单票上限 12%。"],
    ],
  },
  transcript: {
    title: "Transcript Signal",
    summary:
      "从视频 transcript 抽取股票、点位、目标价和风险位；只适合观察信号有效性，不建议跳过基本面过滤。",
    rules: [
      ["买入", "Transcript Score ≥ 60，方向看多，有明确买入区。"],
      ["退出", "触发目标价、风险位或持有超过 60 个交易日。"],
      ["风险", "容易受情绪和幸存者偏差影响。"],
      ["用途", "作为 Buffett 筛选之前的机会发现层。"],
    ],
  },
  momentum: {
    title: "Momentum Trend",
    summary: "趋势跟随逻辑：买强者，卖掉趋势破坏者，适合 ETF 和流动性高的大盘股。",
    rules: [
      ["买入", "50 日均线 > 200 日均线，价格站上长期均线。"],
      ["过滤", "成交量放大，行业相对强度排名靠前。"],
      ["退出", "跌破 200 日均线或 trailing stop。"],
      ["仓位", "分散到 5-10 个趋势资产。"],
    ],
  },
  meanReversion: {
    title: "Mean Reversion",
    summary: "均值回归逻辑：只在高质量资产短期过度下跌时买入，避免价值陷阱。",
    rules: [
      ["买入", "RSI < 30，价格低于 20 日均线两倍标准差。"],
      ["过滤", "基本面没有恶化，市场不是系统性危机。"],
      ["退出", "RSI > 60 或价格回到均线。"],
      ["周期", "通常 5-20 个交易日。"],
    ],
  },
  rotation: {
    title: "ETF Rotation",
    summary: "ETF 轮动逻辑：按 3 个月和 6 个月动量选择强资产，跌破 200 日线则转现金。",
    rules: [
      ["资产池", "SPY, QQQ, IWM, TLT, GLD, VNQ, XLK, XLV。"],
      ["买入", "每月选择动量排名前三。"],
      ["防守", "低于 200 日线则换成现金/短债。"],
      ["再平衡", "每月一次，降低交易频率。"],
    ],
  },
};

const portfolioRecommendation = {
  action: "Hold quality, raise cash discipline",
  summary:
    "组合核心资产质量较高，但科技权重偏集中，当前默认不追高。Buffett 逻辑建议保留核心复利资产，等待安全边际扩大后再加仓；对估值敏感和护城河不稳定资产降低权重。",
  metrics: [
    ["组合建议", "持有 + 等待"],
    ["现金目标", "15%-18%"],
    ["加仓门槛", "≥30% MOS"],
    ["单票上限", "12%"],
  ],
  checklist: [
    "MSFT、GOOGL、AAPL 符合能力圈、护城河和现金流质量要求，作为核心观察仓保留。",
    "NVDA 基本面强但估值敏感，只有在预期回落或内在价值上修后才允许加仓。",
    "TSLA、Crypto 类资产不满足默认 Buffett 核心仓标准，只能保留小型机会仓或剔除。",
    "Fed 利率和通胀不作为择时信号，只用于提高折现率和安全边际要求。",
  ],
};

const recommendations = {
  overall: [
    {
      ticker: "Portfolio",
      action: "Hold / Wait",
      className: "wait",
      text: "今天不要追高。保留核心仓，把现金目标提高到 15%-18%。",
      steps: ["今天不新增追涨买单", "检查现金是否低于 15%", "如果现金不足，优先减小非核心仓"],
      detail:
        "综合 Buffett、趋势、均值回归和 transcript 信号后，当前最稳妥的动作是持有高质量资产，等待更好的价格。市场上涨本身不是买入理由。只有当价格低于保守内在价值并给出安全边际时，才允许加仓。",
      risks: ["如果市场继续上涨，短期可能跑输满仓组合。", "如果现金过高，长期牛市中会拖累收益。", "如果误把普通回调当作安全边际，仍可能买贵。"],
    },
    {
      ticker: "GOOGL",
      action: "Best add candidate",
      className: "buy",
      text: "设提醒，不立刻冲。回撤到安全边际区再分批买。",
      steps: ["设置价格提醒", "只用 2%-3% 组合资金做第一笔", "买入后继续等下一档安全边际"],
      detail:
        "GOOGL 在多套逻辑中得分较好：Buffett 逻辑认可搜索和广告现金流，均值回归逻辑支持回撤时买入，趋势逻辑尚未破坏。交易上不追高，等待价格进入保守内在价值的 70%-80% 区间。",
      risks: ["AI 可能改变搜索变现结构。", "监管风险可能压低长期估值倍数。", "如果回购价格不够便宜，资本配置价值会下降。"],
    },
    {
      ticker: "TSLA/BTC",
      action: "Cap exposure",
      className: "reject",
      text: "不要做核心仓。已有就限制仓位，没有就先不买。",
      steps: ["检查合计是否超过 5%", "超过就分批降到目标仓位", "不要用融资或重仓押注"],
      detail:
        "TSLA 和 BTC 可能有交易机会，但不符合默认 Buffett 核心仓：现金流、估值和护城河可预测性都不如核心复利资产。它们只能放在机会仓，不能影响组合生存能力。",
      risks: ["高波动会放大回撤。", "估值依赖远期叙事，错误假设会造成永久损失。", "机会仓过大时会破坏原本的价值投资纪律。"],
    },
  ],
  buffett: [
    {
      ticker: "MSFT",
      action: "Hold",
      className: "buy",
      text: "继续拿着。不要因为新闻好就追买。",
      steps: ["保持现有仓位", "不高于单票 12%", "跌出安全边际再考虑加"],
      detail:
        "MSFT 具备客户转换成本、规模优势、强现金流和较好的资本配置记录，是 Buffett 逻辑下可以长期持有的资产。但好公司不等于任何价格都可以买。当前建议是持有，不追高。",
      risks: ["AI capex 可能压缩短期 owner earnings。", "估值过高会降低未来十年收益。", "单票过重会造成组合集中风险。"],
    },
    {
      ticker: "GOOGL",
      action: "Accumulate zone",
      className: "buy",
      text: "等便宜一点再买。第一笔小仓位。",
      steps: ["等到安全边际 ≥ 30%", "第一笔买 2%-3%", "每跌 8%-10% 再评估一笔"],
      detail:
        "GOOGL 的搜索业务仍有较强经济商誉和现金流能力。买入必须基于保守内在价值，而不是短期新闻。若价格给到 30% 左右安全边际，可分批建仓。",
      risks: ["AI 和监管可能削弱护城河。", "广告周期会影响短期收入。", "过早加仓会消耗现金弹药。"],
    },
    {
      ticker: "TSLA",
      action: "Reject core",
      className: "reject",
      text: "不要当核心仓。最多小仓观察。",
      steps: ["不新增核心仓买入", "已有仓位控制在 2%-3%", "等现金流稳定后再重评"],
      detail:
        "TSLA 的估值对未来假设非常敏感。Buffett 逻辑要求能看清正常年份 owner earnings、护城河和管理层资本配置。当前不适合做核心仓。",
      risks: ["竞争压低毛利率。", "估值依赖远期自动驾驶等叙事。", "价格波动容易诱发情绪化交易。"],
    },
  ],
  transcript: [
    { ticker: "NVDA", action: "Watch", className: "wait", text: "视频/市场热度高，但必须用估值过滤，避免在预期最满时追高。" },
    { ticker: "AAPL", action: "Hold", className: "buy", text: "多次被提及但缺少明确安全边际，适合记录信号，不直接加仓。" },
    { ticker: "META", action: "Trade small", className: "wait", text: "点位清晰时可做小仓位验证，最大仓位不超过 2%-3%。" },
  ],
  momentum: [
    { ticker: "QQQ", action: "Hold trend", className: "buy", text: "趋势仍强，继续持有；若跌破 50 日线，降低科技集中度。" },
    { ticker: "SPY", action: "Core", className: "buy", text: "作为市场 beta 核心仓位，动量弱化前保持基准配置。" },
    { ticker: "TLT", action: "Wait", className: "wait", text: "利率下行确认前不扩大久期仓位。" },
  ],
  meanReversion: [
    { ticker: "AAPL", action: "Buy zone", className: "buy", text: "若 RSI 进入超卖且现金流逻辑未变，可做低频均值回归。" },
    { ticker: "AMZN", action: "Watch", className: "wait", text: "等待价格偏离 20 日均线更明显，同时确认 FCF 质量。" },
    { ticker: "BTC", action: "Reject", className: "reject", text: "波动结构不同，不纳入 Buffett 默认均值回归。" },
  ],
  rotation: [
    { ticker: "SGOV", action: "Defensive", className: "buy", text: "高利率环境下作为现金替代，保留等待安全边际的弹药。" },
    { ticker: "XLK", action: "Overweight", className: "buy", text: "科技相对强度仍高，但需监控集中度和估值。" },
    { ticker: "IWM", action: "Wait", className: "wait", text: "小盘股需要利率压力缓和和盈利修复确认。" },
  ],
};

const marketUpdates = {
  us: {
    title: "US",
    boxes: [
      { title: "US Market", columns: ["Index", "Changes %"], rows: [["Dow Jones", "51,032.46", "1.19"], ["S&P 500", "7,580.06", "1.49"], ["Nasdaq", "26,972.62", "2.24"]] },
      { title: "HK & Mainland China & UK", columns: ["Index", "Changes %"], rows: [["Hang Seng", "25,182.39", "-1.79"], ["FTSE100", "10,409.28", "-0.32"], ["SSE", "4,068.57", "-1.40"]] },
      { title: "Rates", columns: ["Yield"], rows: [["3-month Treasury", "3.67"], ["10-Year Treasury", "4.44"], ["Fed Funds", "3.50-3.75"]] },
      { title: "Market Internals", columns: ["Signal"], rows: [["Breadth", "Positive but narrow"], ["VIX", "Contained"], ["Credit", "Stable spreads"]] },
      { title: "Style Factors", columns: ["Tilt"], rows: [["Quality", "Overweight"], ["Value", "Neutral"], ["Momentum", "Strong"]] },
      { title: "Macro Inputs", columns: ["Read"], rows: [["Oil", "Lower"], ["USD", "Firm"], ["Inflation", "Sticky"]] },
    ],
    sections: [
      {
        heading: "Major U.S. stock indexes rose as AI-linked stocks led sentiment",
        bullets: [
          "Major U.S. stock indexes advanced, with growth and AI-linked companies leading risk appetite. The Nasdaq outperformed while broader benchmarks also posted gains.",
          "Oil price relief and resilient earnings expectations supported sentiment, though valuation dispersion remains wide across mega-cap technology and cyclicals.",
          "Market leadership remains concentrated. The dashboard therefore separates market direction from business quality: index strength alone does not qualify a stock for purchase.",
        ],
      },
      {
        heading: "April PCE data show inflation remains elevated; Fed tone stays cautious",
        bullets: [
          "Inflation data remain above the Fed's comfort zone. A cautious policy tone keeps discount rates important for long-duration growth equities.",
          "Buffett default logic treats macro as a risk filter: it does not forecast markets, but raises required margin of safety when rates and inflation remain uncertain.",
          "Portfolio implication: prefer companies with pricing power, low leverage, and asset-light economics; avoid businesses that need heavy reinvestment merely to maintain earnings.",
        ],
      },
      {
        heading: "Portfolio read-through",
        bullets: [
          "Hold high-quality compounders where the moat is still widening, but do not add unless price gives a clear gap to conservative intrinsic value.",
          "Keep cash and short-duration Treasury exposure as optionality. Cash is not a forecast; it is protection against forced selling and a reserve for future bargains.",
        ],
      },
    ],
  },
  europe: {
    title: "Europe & UK",
    boxes: [
      { title: "Europe", columns: ["Index", "Changes %"], rows: [["STOXX 600", "548.20", "0.14"], ["DAX", "24,128.90", "0.87"], ["CAC 40", "8,036.42", "0.83"]] },
      { title: "UK", columns: ["Index", "Changes %"], rows: [["FTSE 100", "10,409.28", "-0.32"], ["GBP/USD", "1.28", "0.18"], ["UK 10Y", "4.36", "-0.04"]] },
      { title: "Macro", columns: ["Signal"], rows: [["ECB", "Restrictive"], ["Energy", "Supply risk"], ["Autos", "Demand firm"]] },
      { title: "Europe Factors", columns: ["Read"], rows: [["Banks", "Rate support"], ["Luxury", "China demand risk"], ["Industrials", "Mixed orders"]] },
    ],
    sections: [
      {
        heading: "European equities were mixed as investors tracked energy and rate risks",
        bullets: [
          "European markets continued to monitor energy supply, inflation persistence, and central bank communication. Defensive quality companies remain favored by Buffett-style filters.",
          "UK inflation signals keep pressure on consumer-facing businesses with weak pricing power.",
          "Companies with regulated pricing or high labor/energy pass-through risk require a wider valuation discount.",
        ],
      },
      {
        heading: "GDP and durable goods data point to uneven growth",
        bullets: [
          "Growth revisions and industrial data suggest regional dispersion. The strategy favors asset-light businesses with pricing power over heavy-capex cyclicals.",
          "European exposure should be evaluated company by company rather than as a broad macro call.",
        ],
      },
    ],
  },
  china: {
    title: "China (HK)",
    boxes: [
      { title: "China/HK", columns: ["Index", "Changes %"], rows: [["CSI 300", "4,121.38", "0.97"], ["Hang Seng", "25,182.39", "-1.79"], ["Shanghai Comp", "4,068.57", "-1.40"]] },
      { title: "Sectors", columns: ["Signal"], rows: [["Industrial profit", "Improving"], ["Property", "Weak"], ["Brokers", "Regulatory"]] },
      { title: "FX", columns: ["Level"], rows: [["USD/CNH", "7.18"], ["HKD", "Peg stable"], ["China 10Y", "2.04"]] },
      { title: "Policy Lens", columns: ["Risk"], rows: [["Internet", "Regulatory"], ["Consumer", "Demand uneven"], ["Export tech", "External demand"]] },
    ],
    sections: [
      {
        heading: "China equities were mixed as profit growth and regulatory pressure offset",
        bullets: [
          "Industrial profit growth improved, but consumer-facing weakness and property-linked activity remain constraints.",
          "For Buffett default logic, regulatory uncertainty increases the required margin of safety and reduces position size.",
          "Hong Kong-listed names may look statistically cheap, but the system requires evidence that intrinsic value is durable and not merely optically low multiple.",
        ],
      },
      {
        heading: "Recovery remains uneven and dependent on policy support",
        bullets: [
          "The market requires confirmation from cash flow and demand recovery, not only headline growth. High-quality franchises should show resilience in margins and returns on capital.",
          "Portfolio implication: avoid increasing China exposure until policy and cash-flow visibility improve.",
        ],
      },
    ],
  },
  rates: {
    title: "Rates",
    boxes: [
      { title: "Treasury Curve", columns: ["Yield"], rows: [["3M", "3.67"], ["2Y", "3.92"], ["10Y", "4.44"]] },
      { title: "Policy", columns: ["Range"], rows: [["Fed Funds", "3.50-3.75"], ["ECB", "Restrictive"], ["BoE", "Cautious"]] },
      { title: "Credit", columns: ["Signal"], rows: [["IG", "Stable"], ["HY", "Watch"], ["Spreads", "Contained"]] },
      { title: "Valuation Impact", columns: ["Action"], rows: [["Discount rate", "Higher hurdle"], ["Growth stocks", "More MOS"], ["Cash", "Useful option"]] },
    ],
    sections: [
      {
        heading: "Treasuries advanced as yields eased from prior-week levels",
        bullets: [
          "Duration assets benefited from lower yields, while high-yield credit still requires caution if growth slows.",
          "The website treats rates as an input to valuation: higher discount rates lower intrinsic value and raise required safety margin.",
          "If the 10-year yield remains elevated, the model automatically prefers owner-earnings durability over distant-profit stories.",
        ],
      },
    ],
  },
};

const marketUpdateCalendar = {
  "2026-06-13": {
    label: "Jun 13, 2026",
    note: "最新日评：AI 领导力延续，利率仍是估值折现核心变量。",
    prefixBullets: {
      us: "Selected date read-through: index strength remains positive, but breadth is still narrow; Buffett logic keeps add decisions tied to intrinsic value rather than index momentum.",
      europe: "Selected date read-through: Europe remains a company-selection market; pricing power and energy pass-through are the key filters.",
      china: "Selected date read-through: China exposure still requires a higher margin of safety because policy and cash-flow visibility remain uneven.",
      rates: "Selected date read-through: Treasury yields remain high enough to keep the hurdle rate elevated for long-duration assets.",
    },
  },
  "2026-06-12": {
    label: "Jun 12, 2026",
    note: "前一交易日：风险偏好改善，但 Fed 发言维持谨慎基调。",
    prefixBullets: {
      us: "Selected date read-through: mega-cap quality led returns; avoid extrapolating one-day momentum into a purchase decision without a safety margin.",
      europe: "Selected date read-through: inflation sensitivity favored companies with pricing power and low incremental capital needs.",
      china: "Selected date read-through: Hong Kong weakness reflected renewed regulatory caution; reduce position size where governance visibility is low.",
      rates: "Selected date read-through: short-duration cash alternatives remained attractive while the curve priced policy uncertainty.",
    },
  },
  "2026-06-10": {
    label: "Jun 10, 2026",
    note: "周中观察：市场进入等待数据阶段，现金和质量因子占优。",
    prefixBullets: {
      us: "Selected date read-through: market leadership narrowed; quality balance sheets were favored over highly levered cyclicals.",
      europe: "Selected date read-through: regional data were mixed, keeping bottom-up underwriting more useful than macro calls.",
      china: "Selected date read-through: stimulus expectations helped sentiment, but consumer demand confirmation was still incomplete.",
      rates: "Selected date read-through: the rate complex argued for using conservative owner-earnings multiples.",
    },
  },
};

const newsCategories = [
  {
    title: "Company News",
    count: 8,
    items: [
      {
        id: "news-msft-cloud",
        date: "Jun 13",
        title: "Microsoft cloud demand remains resilient",
        text: "Enterprise cloud spending and AI workloads continue to support revenue durability; margin discipline remains the key variable.",
        tags: ["MSFT", "Cloud", "Moat"],
        detail: "The investment relevance is not simply that AI demand is strong; it is that Microsoft can monetize demand through recurring enterprise relationships, bundled productivity workflows, identity/security integration and Azure usage. Buffett logic classifies this as switching-cost plus scale moat, but still requires price discipline because capex intensity can reduce near-term owner earnings.",
        citations: [
          ["Microsoft Investor Relations", "https://www.microsoft.com/en-us/investor"],
          ["Microsoft SEC filings", "https://www.sec.gov/edgar/browse/?CIK=789019"],
        ],
      },
      {
        id: "news-nvda-demand",
        date: "Jun 12",
        title: "Nvidia demand strong, valuation sensitivity high",
        text: "AI accelerator demand remains strong, but the model requires a larger margin of safety because expectations are already elevated.",
        tags: ["NVDA", "AI", "Valuation"],
        detail: "Nvidia remains a high-quality business with extraordinary demand, but intrinsic value is sensitive to assumptions about data-center growth, gross margin durability, supply constraints and customer concentration. Under Buffett logic, a great company can still be a poor purchase if the entry price assumes too much of the next decade upfront.",
        citations: [
          ["Nvidia Investor Relations", "https://investor.nvidia.com/"],
          ["Nvidia SEC filings", "https://www.sec.gov/edgar/browse/?CIK=1045810"],
        ],
      },
      {
        id: "news-googl-buybacks",
        date: "Jun 11",
        title: "Alphabet buybacks support per-share value",
        text: "Search cash flow and disciplined repurchases remain constructive if capital allocation stays price-sensitive.",
        tags: ["GOOGL", "Buyback"],
        detail: "Alphabet's buyback program can increase per-share intrinsic value when executed below conservative value. The key diligence question is whether management repurchases more aggressively when price is attractive, and whether AI transition risk changes normalized search economics.",
        citations: [
          ["Alphabet Investor Relations", "https://abc.xyz/investor/"],
          ["Alphabet SEC filings", "https://www.sec.gov/edgar/browse/?CIK=1652044"],
        ],
      },
      {
        id: "news-tsla-margin",
        date: "Jun 10",
        title: "Tesla faces competition and margin questions",
        text: "Price competition and execution uncertainty keep the name outside the default Buffett core bucket.",
        tags: ["TSLA", "Competition"],
        detail: "Tesla has brand value and optionality, but the default Buffett model requires stable earning power, conservative owner-earnings estimates and a moat that is hard to replicate. Margin compression and high reliance on future optionality push the name into opportunity/satellite sizing rather than core holding.",
        citations: [
          ["Tesla Investor Relations", "https://ir.tesla.com/"],
          ["Tesla SEC filings", "https://www.sec.gov/edgar/browse/?CIK=1318605"],
        ],
      },
    ],
  },
  {
    title: "YouTube / LA Banker",
    count: 1,
    items: [
      {
        id: "news-youtube-la-banker-monitor",
        date: "Daily 06:00",
        title: "LA Banker member-channel transcript monitor",
        text: "每天早上检查 @la_banker 是否更新；新 transcript 会被提炼成 ticker、点位、目标价和风险位，再交给 Buffett 逻辑过滤。",
        tags: ["YouTube", "Transcript", "Buffett filter"],
        detail:
          "这个模块不是自动跟单。流程是：先用 youtube-full / TranscriptAPI 检查频道最新视频，再抓取 transcript，提取股票代码、方向、支撑/目标/止损等交易指示，最后用 Buffett 框架判断能不能执行。只有当业务质量、owner earnings、估值安全边际、仓位纪律和风险位都满足时，才会从 watchlist 升级为 possible trade。",
        citations: [
          ["LA Banker YouTube Channel", "https://youtube.com/@la_banker"],
          ["TranscriptAPI Docs", "https://transcriptapi.com/docs"],
          ["YouTube Skills Repo", "https://github.com/ZeroPointRepo/youtube-skills"],
        ],
      },
    ],
  },
  {
    title: "Fed / Rates",
    count: 6,
    items: [
      {
        id: "news-fed-sticky",
        date: "Jun 13",
        title: "Fed tone remains cautious as inflation proves sticky",
        text: "Higher-for-longer risk raises the discount-rate hurdle for long-duration equities.",
        tags: ["Fed", "PCE", "Rates"],
        detail: "Fed-related news changes the valuation input rather than becoming a market timing signal. A higher risk-free rate reduces the present value of distant cash flows and increases required margin of safety, especially for companies whose value depends on terminal growth assumptions.",
        citations: [
          ["Federal Reserve News & Events", "https://www.federalreserve.gov/newsevents.htm"],
          ["BEA PCE data", "https://www.bea.gov/data/personal-consumption-expenditures-price-index"],
        ],
      },
      {
        id: "news-yields",
        date: "Jun 12",
        title: "Treasury yields ease but remain valuation-relevant",
        text: "Cash and short-duration Treasuries remain useful optionality while waiting for clear safety margins.",
        tags: ["10Y", "SGOV"],
        detail: "The portfolio read-through is defensive but not bearish: short-duration yield creates a real opportunity cost for overpaying. Cash is treated as option value, allowing the investor to act when high-quality assets finally trade below conservative value.",
        citations: [
          ["U.S. Treasury Daily Rates", "https://home.treasury.gov/resource-center/data-chart-center/interest-rates"],
          ["Federal Reserve H.15", "https://www.federalreserve.gov/releases/h15/"],
        ],
      },
      {
        id: "news-credit",
        date: "Jun 09",
        title: "Credit spreads stable, high yield still on watch",
        text: "Contained spreads support risk appetite, but Buffett logic avoids leverage-dependent businesses.",
        tags: ["Credit", "HY"],
        detail: "Stable spreads reduce immediate stress, but they do not remove balance sheet risk. The model still penalizes companies that need refinancing access to survive a two-year revenue drawdown.",
        citations: [
          ["FRED Credit Spreads", "https://fred.stlouisfed.org/categories/32251"],
          ["FINRA Market Data", "https://www.finra.org/finra-data"],
        ],
      },
    ],
  },
  {
    title: "Macro / Market Breadth",
    count: 7,
    items: [
      { date: "Jun 13", title: "AI leadership keeps indexes firm but breadth is narrower", text: "The market is up, but gains are concentrated. Index strength does not automatically equal broad opportunity.", tags: ["Breadth", "AI"] },
      { date: "Jun 11", title: "Oil prices ease and support sentiment", text: "Lower energy pressure helps inflation expectations, though durable disinflation is not yet proven.", tags: ["Oil", "Inflation"] },
      { date: "Jun 09", title: "Quality factor continues to outperform cyclicals", text: "High ROIC, low leverage and cash-rich balance sheets are rewarded in uncertain macro regimes.", tags: ["Quality", "ROIC"] },
    ],
  },
  {
    title: "China / Europe",
    count: 5,
    items: [
      { date: "Jun 13", title: "China recovery remains uneven", text: "Industrial profit growth improved, but consumer and property-linked activity remain weak.", tags: ["China", "Policy"] },
      { date: "Jun 12", title: "Europe inflation pressure keeps central banks cautious", text: "Companies without pricing power face margin risk if input costs remain elevated.", tags: ["Europe", "ECB"] },
      { date: "Jun 10", title: "Luxury and exporters watch China demand", text: "Demand uncertainty increases required margin of safety for internationally exposed businesses.", tags: ["Luxury", "Demand"] },
    ],
  },
];

const researchReports = [
  {
    id: "msft",
    source: "Equity Research",
    title: "Microsoft: owner earnings remain resilient",
    text: "High recurring revenue, switching costs and disciplined capital returns support a core holding classification.",
    tags: ["Quality 88", "Moat", "Core Hold"],
    report: {
      rating: "Buy / Core Hold",
      priceView: "Add only on pullbacks that restore a 25%-30% margin of safety.",
      thesis:
        "Microsoft remains one of the cleanest examples of a Buffett-compatible technology compounder: understandable enterprise demand, recurring revenue, high switching costs, strong free cash flow conversion, and management with a long record of rational capital allocation.",
      positives: [
        "Cloud and productivity software create recurring revenue with high customer retention.",
        "Switching costs are high because workflows, identity, security and data are deeply integrated.",
        "Balance sheet strength allows continued buybacks, AI capex and strategic flexibility without financial stress.",
      ],
      risks: [
        "AI infrastructure spending may pressure near-term margins if monetization lags capex.",
        "At elevated multiples, even excellent execution may not produce attractive forward returns.",
      ],
      valuation: [
        ["Normalized owner earnings", "High quality, durable"],
        ["Moat multiple", "20-25x justified only with continued 5%+ durable growth"],
        ["Required margin", "25%-30% because rate sensitivity remains relevant"],
      ],
      action: "Hold core position. Add only if price falls toward conservative intrinsic value range.",
    },
  },
  {
    id: "googl",
    source: "Equity Research",
    title: "Alphabet: buyback discipline improves per-share value",
    text: "Search franchise and balance sheet strength support accumulation during drawdowns.",
    tags: ["GOOGL", "Buyback", "Accumulate"],
    report: {
      rating: "Buy on weakness",
      priceView: "Attractive if market price is at or below 70%-80% of conservative intrinsic value.",
      thesis:
        "Alphabet combines a durable search franchise, asset-light economics and net cash with a repurchase program that can create value when executed below intrinsic value. The key question is whether AI changes search economics or reinforces distribution and data advantages.",
      positives: [
        "Search remains a toll-bridge-like advertising business with global scale.",
        "YouTube and cloud provide additional growth paths without undermining the core cash engine.",
        "Buybacks can raise per-share intrinsic value if management remains price disciplined.",
      ],
      risks: [
        "AI answer interfaces could pressure search monetization if user behavior changes structurally.",
        "Regulatory pressure may limit business flexibility or increase compliance cost.",
      ],
      valuation: [
        ["Normalized owner earnings", "Strong but monitor AI capex"],
        ["Moat trend", "Stable, with AI disruption watch"],
        ["Required margin", "30%-35% due to regulatory and platform-transition uncertainty"],
      ],
      action: "Accumulate gradually during drawdowns; avoid chasing after multiple expansion.",
    },
  },
  {
    id: "tsla",
    source: "Equity Research",
    title: "Tesla: valuation requires unusually high execution confidence",
    text: "Buffett default mode rejects core sizing due to competitive intensity and intrinsic value sensitivity.",
    tags: ["Reject core", "Competition", "High variance"],
    report: {
      rating: "Neutral / Not core",
      priceView: "Only speculative sizing unless price embeds very conservative auto margins.",
      thesis:
        "Tesla may remain an important company, but importance is not the same as a Buffett-quality investment. The business has brand, manufacturing capability and optionality, yet the intrinsic value depends heavily on assumptions about future autonomy, software attach rates and margin recovery.",
      positives: [
        "Strong brand recognition and operating scale in EVs.",
        "Potential upside from software, energy and autonomy if execution proves durable.",
      ],
      risks: [
        "Automotive competition pressures pricing power and margins.",
        "Valuation is highly sensitive to distant cash flow assumptions.",
        "The business is harder to underwrite with a conservative owner-earnings multiple.",
      ],
      valuation: [
        ["Normalized owner earnings", "Unstable across cycle"],
        ["Moat multiple", "Lower than market narrative if auto margin pressure persists"],
        ["Required margin", "40%-50% because intrinsic value uncertainty is high"],
      ],
      action: "Do not size as a core Buffett holding; keep only small opportunity exposure if desired.",
    },
  },
];

const companyProfiles = {
  MSFT: {
    ticker: "MSFT",
    name: "Microsoft",
    allocationId: "us-equity",
    score: 88,
    moat: "enterprise switching costs, cloud scale, productivity workflow lock-in",
    citationName: "Microsoft Investor Relations",
    citationUrl: "https://www.microsoft.com/en-us/investor",
    secUrl: "https://www.sec.gov/edgar/browse/?CIK=789019",
    baseAction: "Core Hold",
    risks: ["AI capex may pressure owner earnings before monetization catches up.", "A rich entry multiple can turn an excellent business into a mediocre investment.", "Single-stock concentration above 12% weakens portfolio resilience."],
  },
  AAPL: {
    ticker: "AAPL",
    name: "Apple",
    allocationId: "us-equity",
    score: 84,
    moat: "ecosystem lock-in, brand trust, installed-base monetization",
    citationName: "Apple Investor Relations",
    citationUrl: "https://investor.apple.com/",
    secUrl: "https://www.sec.gov/edgar/browse/?CIK=320193",
    baseAction: "Hold",
    risks: ["Hardware replacement cycles can slow.", "Services growth may not fully offset device maturity.", "Buybacks create more value only when price is reasonable."],
  },
  NVDA: {
    ticker: "NVDA",
    name: "Nvidia",
    allocationId: "us-equity",
    score: 82,
    moat: "accelerated-computing ecosystem, software stack, developer mindshare",
    citationName: "Nvidia Investor Relations",
    citationUrl: "https://investor.nvidia.com/",
    secUrl: "https://www.sec.gov/edgar/browse/?CIK=1045810",
    baseAction: "Hold, wait for margin",
    risks: ["Expectations may already discount several years of strong AI demand.", "Customer concentration and hyperscaler capex cycles can amplify downside.", "Gross margin normalization would reduce intrinsic value."],
  },
  GOOGL: {
    ticker: "GOOGL",
    name: "Alphabet",
    allocationId: "us-equity",
    score: 86,
    moat: "search distribution, data scale, ads marketplace liquidity",
    citationName: "Alphabet Investor Relations",
    citationUrl: "https://abc.xyz/investor/",
    secUrl: "https://www.sec.gov/edgar/browse/?CIK=1652044",
    baseAction: "Accumulate on weakness",
    risks: ["AI answer interfaces may pressure search economics.", "Regulatory remedies could reduce business flexibility.", "Cloud and AI capex can lower near-term free cash flow."],
  },
  AMZN: {
    ticker: "AMZN",
    name: "Amazon",
    allocationId: "us-equity",
    score: 78,
    moat: "logistics scale, AWS switching costs, marketplace network effects",
    citationName: "Amazon Investor Relations",
    citationUrl: "https://ir.aboutamazon.com/",
    secUrl: "https://www.sec.gov/edgar/browse/?CIK=1018724",
    baseAction: "Watch FCF quality",
    risks: ["Retail margins are structurally thinner than software margins.", "AWS competition can pressure growth assumptions.", "Heavy reinvestment makes owner earnings harder to normalize."],
  },
  META: {
    ticker: "META",
    name: "Meta Platforms",
    allocationId: "us-equity",
    score: 80,
    moat: "social graph, ad targeting scale, messaging network effects",
    citationName: "Meta Investor Relations",
    citationUrl: "https://investor.fb.com/",
    secUrl: "https://www.sec.gov/edgar/browse/?CIK=1326801",
    baseAction: "Hold with valuation guardrail",
    risks: ["Reality Labs losses can dilute owner earnings.", "Regulatory and privacy changes may weaken ad targeting.", "User attention can migrate faster than mature platforms expect."],
  },
  TSLA: {
    ticker: "TSLA",
    name: "Tesla",
    allocationId: "us-equity",
    score: 62,
    moat: "brand, manufacturing scale, optionality in software and energy",
    citationName: "Tesla Investor Relations",
    citationUrl: "https://ir.tesla.com/",
    secUrl: "https://www.sec.gov/edgar/browse/?CIK=1318605",
    baseAction: "Not core",
    risks: ["Automotive competition can pressure margins.", "Intrinsic value depends heavily on distant optionality.", "High volatility can trigger emotional position sizing."],
  },
  SPY: {
    ticker: "SPY",
    name: "S&P 500 ETF",
    allocationId: "etf",
    score: 76,
    moat: "broad market ownership and low single-company risk",
    citationName: "SPDR S&P 500 ETF",
    citationUrl: "https://www.ssga.com/us/en/intermediary/etfs/funds/spdr-sp-500-etf-trust-spy",
    secUrl: "https://www.sec.gov/edgar/search/",
    baseAction: "Baseline exposure",
    risks: ["Index valuation can still be high.", "Mega-cap concentration may reduce diversification.", "ETF exposure cannot enforce Buffett security selection."],
  },
  QQQ: {
    ticker: "QQQ",
    name: "Nasdaq 100 ETF",
    allocationId: "etf",
    score: 74,
    moat: "large-cap growth basket with high liquidity",
    citationName: "Invesco QQQ",
    citationUrl: "https://www.invesco.com/qqq-etf/en/home.html",
    secUrl: "https://www.sec.gov/edgar/search/",
    baseAction: "Hold trend, watch concentration",
    risks: ["Technology concentration can amplify drawdowns.", "Momentum can reverse before fundamentals change.", "ETF ownership includes both excellent and average businesses."],
  },
  SGOV: {
    ticker: "SGOV",
    name: "0-3M Treasury ETF",
    allocationId: "rates",
    score: 81,
    moat: "cash-like Treasury exposure",
    citationName: "iShares SGOV",
    citationUrl: "https://www.ishares.com/us/products/314116/ishares-0-3-month-treasury-bond-etf",
    secUrl: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates",
    baseAction: "Dry powder",
    risks: ["Reinvestment yield can fall when policy rates decline.", "It protects liquidity, not long-term purchasing power.", "Too much cash-like exposure can lag in a strong equity market."],
  },
  TLT: {
    ticker: "TLT",
    name: "20Y Treasury ETF",
    allocationId: "rates",
    score: 64,
    moat: "duration hedge rather than business ownership",
    citationName: "iShares TLT",
    citationUrl: "https://www.ishares.com/us/products/239454/ishares-20-year-treasury-bond-etf",
    secUrl: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates",
    baseAction: "Small hedge only",
    risks: ["Long duration can lose value quickly when yields rise.", "This is a macro hedge, not a Buffett compounder.", "Position size should stay small unless it matches a clear liability need."],
  },
  BTC: {
    ticker: "BTC",
    name: "Bitcoin",
    allocationId: "crypto",
    score: 58,
    moat: "scarcity narrative and network liquidity, outside Buffett core",
    citationName: "Coin Metrics",
    citationUrl: "https://coinmetrics.io/",
    secUrl: "https://www.sec.gov/crypto-assets",
    baseAction: "Cap exposure",
    risks: ["No owner earnings make intrinsic value difficult to underwrite.", "Volatility can dominate portfolio behavior.", "Regulatory and custody risks require strict sizing."],
  },
  SOL: {
    ticker: "SOL",
    name: "Solana",
    allocationId: "crypto",
    score: 45,
    moat: "developer ecosystem and network usage, speculative sleeve only",
    citationName: "Solana Foundation",
    citationUrl: "https://solana.org/",
    secUrl: "https://www.sec.gov/crypto-assets",
    baseAction: "Speculative only",
    risks: ["Protocol and ecosystem risks are higher than large-cap equities.", "No stable owner earnings fit the Buffett default model.", "Liquidity and sentiment cycles can create severe drawdowns."],
  },
  USD: {
    ticker: "USD",
    name: "Cash Reserve",
    allocationId: "cash",
    score: 100,
    moat: "optionality and forced-selling protection",
    citationName: "U.S. Treasury Rates",
    citationUrl: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates",
    secUrl: "https://www.federalreserve.gov/releases/h15/",
    baseAction: "Keep optionality",
    risks: ["Cash can lag during strong bull markets.", "Inflation reduces real purchasing power.", "Too much cash can become disguised market timing."],
  },
};

const tickerAliases = [
  ["MICROSOFT", "MSFT"],
  ["APPLE", "AAPL"],
  ["NVIDIA", "NVDA"],
  ["GOOGLE", "GOOGL"],
  ["ALPHABET", "GOOGL"],
  ["AMAZON", "AMZN"],
  ["META", "META"],
  ["FACEBOOK", "META"],
  ["TESLA", "TSLA"],
  ["S&P 500", "SPY"],
  ["SP500", "SPY"],
  ["NASDAQ", "QQQ"],
  ["QQQ", "QQQ"],
  ["SPY", "SPY"],
  ["SGOV", "SGOV"],
  ["TLT", "TLT"],
  ["BITCOIN", "BTC"],
  ["BTC", "BTC"],
  ["SOLANA", "SOL"],
  ["SOL", "SOL"],
  ["CASH", "USD"],
  ["USD", "USD"],
];

const ignoredTickerWords = new Set(["I", "A", "AN", "AND", "OR", "THE", "STOCK", "STOCKS", "SHARE", "SHARES", "ETF", "ETFS", "CASH"]);

function hasCustomPortfolio() {
  const hasLegacyText = Boolean(userProfile && userProfile.holdings && userProfile.holdings.trim());
  const hasAssetRows = Boolean(userProfile && Array.isArray(userProfile.assets) && userProfile.assets.some((asset) => asset.name && asset.name.trim()));
  return Boolean(userProfile && !userProfile.skipped && (hasLegacyText || hasAssetRows));
}

function normalizeTicker(token) {
  const upper = token.toUpperCase();
  const alias = tickerAliases.find(([label]) => label === upper);
  return alias ? alias[1] : upper;
}

function parseNumericInput(value) {
  const match = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseMoneyAmount(value) {
  const text = String(value || "").trim();
  if (!text || text.includes("%")) return null;
  const number = parseNumericInput(text);
  if (number === null) return null;
  const looksLikeMoney = /[$¥￥]|usd|dollar|amount|金额|市值|元|美金/i.test(text) || number > 100;
  return looksLikeMoney ? number : null;
}

function getProfileAssetRows() {
  if (!userProfile) return [];
  if (Array.isArray(userProfile.assets) && userProfile.assets.length) {
    return userProfile.assets
      .map((asset) => ({
        name: String(asset.name || "").trim(),
        value: String(asset.value || "").trim(),
      }))
      .filter((asset) => asset.name);
  }
  if (userProfile.holdings) {
    return userProfile.holdings
      .split(/[,，;；\n、]+/)
      .map((segment) => ({ name: segment.trim(), value: "" }))
      .filter((asset) => asset.name);
  }
  return [];
}

function formatProfileAssetRows() {
  const rows = getProfileAssetRows();
  return rows.map((asset) => `${asset.name}${asset.value ? ` ${asset.value}` : ""}`).join(", ");
}

function parseProfileHoldings() {
  if (!hasCustomPortfolio()) return [];
  const rows = getProfileAssetRows();
  const totalAmount = parseNumericInput(userProfile.totalAmount);
  const seen = new Set();
  const parsed = [];

  for (const asset of rows) {
    const segment = `${asset.name} ${asset.value}`.trim();
    const upper = segment.toUpperCase();
    const nameUpper = asset.name.toUpperCase();
    const alias = tickerAliases.find(([label]) => nameUpper.includes(label));
    const tickerMatch = upper.match(/\b[A-Z]{1,5}\b/g) || [];
    const normalizedMatches = tickerMatch.map(normalizeTicker).filter((item) => !ignoredTickerWords.has(item));
    const directTicker = normalizedMatches.find((item) => item !== "USD" && companyProfiles[item]) || normalizedMatches.find((item) => item !== "USD");
    const ticker = directTicker || (alias ? alias[1] : normalizedMatches.find((item) => companyProfiles[item]) || normalizedMatches[0]);
    if (!ticker || seen.has(ticker)) continue;
    const pctMatch = segment.match(/(\d+(?:\.\d+)?)\s*%/);
    const moneyAmount = parseMoneyAmount(asset.value);
    const weightFromMoney = moneyAmount !== null && totalAmount ? (moneyAmount / totalAmount) * 100 : null;
    const profile = companyProfiles[ticker] || createGenericProfile(ticker);
    parsed.push({
      ticker,
      profile,
      raw: segment,
      amountText: asset.value,
      weightValue: pctMatch ? Number(pctMatch[1]) : weightFromMoney,
    });
    seen.add(ticker);
  }
  return parsed;
}

function createGenericProfile(ticker) {
  return {
    ticker,
    name: ticker,
    allocationId: "us-equity",
    score: 68,
    moat: "not yet underwritten; requires manual financial statement review",
    citationName: `${ticker} Investor Relations`,
    citationUrl: `https://www.sec.gov/edgar/search/#/q=${ticker}`,
    secUrl: "https://www.sec.gov/edgar/search/",
    baseAction: "Underwrite first",
    risks: ["The system has not yet reviewed normalized owner earnings.", "Moat durability and management quality need manual confirmation.", "Do not size this holding as core until the research file is complete."],
  };
}

function getProfileCompanies() {
  const parsed = parseProfileHoldings();
  if (!parsed.length) {
    return ["MSFT", "GOOGL", "AAPL", "NVDA"].map((ticker) => ({
      ticker,
      profile: companyProfiles[ticker],
      weightValue: null,
      raw: ticker,
    }));
  }
  return parsed;
}

function formatWeight(weightValue, fallback) {
  if (typeof weightValue === "number") return `${weightValue.toFixed(weightValue % 1 === 0 ? 0 : 1)}%`;
  return fallback;
}

function getActiveAllocations() {
  const parsed = parseProfileHoldings();
  if (!parsed.length) return allocations;

  const explicitTotal = parsed.reduce((sum, item) => sum + (typeof item.weightValue === "number" ? item.weightValue : 0), 0);
  const missingCount = parsed.filter((item) => typeof item.weightValue !== "number").length;
  const fallbackWeight = missingCount ? Math.max(0, 100 - explicitTotal) / missingCount : 100 / parsed.length;
  const rawWeights = parsed.map((item) => (typeof item.weightValue === "number" ? item.weightValue : fallbackWeight));
  const totalWeight = rawWeights.reduce((sum, value) => sum + value, 0) || 100;
  const scale = totalWeight > 100 ? 100 / totalWeight : 1;
  const groups = new Map();

  parsed.forEach((item, index) => {
    const base = allocations.find((allocation) => allocation.id === item.profile.allocationId) || allocations[0];
    const normalizedWeight = rawWeights[index] * scale;
    if (!groups.has(base.id)) {
      groups.set(base.id, {
        ...base,
        value: 0,
        holdings: [],
      });
    }
    const group = groups.get(base.id);
    group.value += normalizedWeight;
    group.holdings.push({
      ticker: item.ticker,
      name: item.profile.name,
      weight: formatWeight(rawWeights[index], formatPct(normalizedWeight)),
      score: item.profile.score,
      advice: item.profile.baseAction,
    });
  });

  if (!missingCount && totalWeight < 99.5) {
    const cashBase = allocations.find((allocation) => allocation.id === "cash");
    if (!groups.has("cash")) {
      groups.set("cash", {
        ...cashBase,
        value: 0,
        holdings: [],
      });
    }
    const group = groups.get("cash");
    const remaining = 100 - totalWeight;
    group.value += remaining;
    group.holdings.push({
      ticker: "USD",
      name: "Unallocated / Cash",
      weight: formatPct(remaining),
      score: 100,
      advice: "Available dry powder",
    });
  }

  return allocations
    .filter((allocation) => groups.has(allocation.id))
    .map((allocation) => {
      const group = groups.get(allocation.id);
      return {
        ...group,
        value: Number(group.value.toFixed(1)),
      };
    });
}

function getSelectedAllocation(activeAllocations = getActiveAllocations()) {
  return activeAllocations.find((item) => item.id === selectedAllocation.id) || activeAllocations[0];
}

function classifyBuffett(profile, weightValue) {
  if (profile.allocationId === "cash" || profile.ticker === "SGOV") {
    return { action: "Keep dry powder", className: "buy", limit: "15%-20%" };
  }
  if (profile.score >= 84) {
    return weightValue && weightValue > 12
      ? { action: "Trim to cap", className: "wait", limit: "12%" }
      : { action: "Core Hold", className: "buy", limit: "8%-12%" };
  }
  if (profile.score >= 74) {
    return { action: "Hold / Wait", className: "wait", limit: "4%-8%" };
  }
  return { action: "Cap / Avoid", className: "reject", limit: profile.allocationId === "crypto" ? "0%-3%" : "0%-4%" };
}

function getUpperLimit(limitText) {
  const matches = limitText.match(/\d+(?:\.\d+)?/g);
  return matches ? Number(matches[matches.length - 1]) : 12;
}

function buildRecommendation(item, strategyKey) {
  const { ticker, profile, weightValue } = item;
  const weightText = formatWeight(weightValue, "未填写比例");
  const verdict = classifyBuffett(profile, weightValue);
  const strategyLabel = strategies[strategyKey].title;
  const isCore = verdict.className === "buy";
  const isRejected = verdict.className === "reject";
  const overLimit = typeof weightValue === "number" && weightValue > getUpperLimit(verdict.limit);
  const action = strategyKey === "transcript"
    ? "Use as signal only"
    : strategyKey === "momentum"
      ? "Check trend first"
      : strategyKey === "meanReversion"
        ? "Wait for oversold"
        : strategyKey === "rotation"
          ? profile.allocationId === "etf" || profile.allocationId === "rates" ? "Rotation eligible" : "Not rotation core"
          : verdict.action;
  const className = strategyKey === "rotation" && profile.allocationId !== "etf" && profile.allocationId !== "rates" ? "wait" : verdict.className;

  return {
    ticker,
    action,
    className,
    text: `${profile.name} 当前识别仓位 ${weightText}。${isRejected ? "不要作为核心仓；先控制风险。" : overLimit ? "仓位高于纪律上限，先降集中度。" : "先持有观察，只有安全边际足够才加仓。"}`,
    steps: isRejected
      ? [`今天不新增买入 ${ticker}`, `如果仓位超过 ${verdict.limit}，分 2-3 次降到上限内`, "把下一次复盘条件写成价格、现金流和风险三项"]
      : overLimit
        ? [`暂停加仓 ${ticker}`, `把仓位从 ${weightText} 降到不高于 ${verdict.limit}`, "卖出资金先放入现金/短债，等安全边际再部署"]
        : [`保持 ${ticker} 当前仓位`, `设置加仓提醒：只在安全边际达到 25%-35% 后买第一笔`, `第一笔不超过组合 2%-3%，买完重新检查现金比例`],
    detail:
      `${strategyLabel} 对 ${profile.name} 的判断来自你的真实持仓输入，而不是默认示例组合。Buffett 层先看是否在能力圈内、护城河是否清晰、owner earnings 是否可估、管理层是否理性、当前价格是否低于保守内在价值。${profile.name} 的核心观察点是 ${profile.moat}。当前动作不是预测明天涨跌，而是把仓位限制、买入门槛和风险条件写清楚。`,
    risks: profile.risks,
  };
}

function getCustomizedRecommendations(strategyKey) {
  if (!hasCustomPortfolio()) return recommendations[strategyKey];
  const companies = getProfileCompanies();
  const investable = companies.filter((item) => item.profile.allocationId !== "cash").slice(0, 4);
  const cash = companies.find((item) => item.profile.allocationId === "cash");
  const cards = investable.map((item) => buildRecommendation(item, strategyKey));

  if (strategyKey === "overall") {
    cards.unshift({
      ticker: "Portfolio",
      action: "Personalized overall",
      className: "wait",
      text: `已按你的持仓生成：${companies.map((item) => item.ticker).join(", ")}。先处理超限仓位，再等待安全边际。`,
      steps: ["今天先不追高买入", "把单票上限设为 12%，投机仓上限设为 3%-5%", "只对通过 Buffett 检查表的公司设置分批加仓单"],
      detail:
        "综合逻辑会先使用 Buffett 质量和安全边际做硬过滤，再用新闻、研报、趋势和均值回归决定观察优先级。若多个策略冲突，默认选择永久资本损失风险最低的动作。",
      risks: ["个性化建议依赖你输入的持仓和比例。", "如果成本价、税务或现金需求没有输入，实际交易仍需人工复核。", "综合逻辑可能牺牲短期收益来换取更低回撤风险。"],
    });
  }

  if (cash && cards.length < 4) cards.push(buildRecommendation(cash, strategyKey));
  return cards.slice(0, 4);
}

function getCustomizedPortfolioRecommendation() {
  if (!hasCustomPortfolio()) return portfolioRecommendation;
  const companies = getProfileCompanies();
  const core = companies.filter((item) => classifyBuffett(item.profile, item.weightValue).className === "buy");
  const risk = companies.filter((item) => classifyBuffett(item.profile, item.weightValue).className === "reject");
  const highWeight = companies.filter((item) => typeof item.weightValue === "number" && item.weightValue > 12);
  return {
    action: "Personalized Buffett action plan",
    summary:
      `系统已识别你的持仓：${companies.map((item) => item.ticker).join(", ")}。首页建议会围绕这些公司刷新交易指令、新闻、研报和风险说明；默认先保留高质量核心仓，限制高波动/不可估值资产，等待安全边际后再分批加仓。`,
    metrics: [
      ["识别持仓", `${companies.length} 个`],
      ["核心候选", core.length ? core.map((item) => item.ticker).join(", ") : "暂无"],
      ["需控风险", risk.length ? risk.map((item) => item.ticker).join(", ") : "暂无"],
      ["超 12% 仓位", highWeight.length ? highWeight.map((item) => item.ticker).join(", ") : "暂无"],
    ],
    checklist: companies.slice(0, 6).map((item) => {
      const verdict = classifyBuffett(item.profile, item.weightValue);
      return `${item.ticker}: ${verdict.action}，纪律仓位 ${verdict.limit}；核心问题是 ${item.profile.moat}。`;
    }),
  };
}

function buildCompanyNews(item) {
  const { ticker, profile } = item;
  return {
    title: `${ticker} / ${profile.name}`,
    count: 3,
    items: [
      {
        id: `news-${ticker.toLowerCase()}-moat`,
        date: "Jun 13",
        title: `${profile.name}: moat and owner-earnings watch`,
        text: `围绕 ${profile.moat} 检查近一周新闻是否真的改变长期 earning power。`,
        tags: [ticker, "Moat", "Owner earnings"],
        detail:
          `这条个性化新闻简报按你的持仓 ${ticker} 生成。研究重点不是标题情绪，而是新闻是否改变正常年份 owner earnings、护城河、资产负债表和管理层资本配置。若只是短期情绪变化，交易动作保持不变；若长期现金流假设被削弱，则提高安全边际或降低仓位。`,
        citations: [
          [profile.citationName, profile.citationUrl],
          [`${ticker} SEC filings`, profile.secUrl],
        ],
      },
      {
        id: `news-${ticker.toLowerCase()}-valuation`,
        date: "Jun 12",
        title: `${profile.name}: valuation discipline check`,
        text: `好公司不等于好价格；本模块检查估值是否已经透支未来增长。`,
        tags: [ticker, "Valuation", "MOS"],
        detail:
          `${profile.name} 的交易建议只在保守内在价值和市场价格之间有足够差距时才升级为买入。若新闻很好但价格已经反映乐观预期，Buffett 逻辑仍保持等待。`,
        citations: [
          [profile.citationName, profile.citationUrl],
          ["SEC EDGAR", "https://www.sec.gov/edgar/search/"],
        ],
      },
      {
        id: `news-${ticker.toLowerCase()}-risk`,
        date: "Jun 09",
        title: `${profile.name}: risk monitor`,
        text: profile.risks[0],
        tags: [ticker, "Risk", "Position sizing"],
        detail:
          `风险不是卖出的唯一理由，但风险会改变仓位。对 ${ticker}，当前首要风险是：${profile.risks.join(" ")} 如果这些风险开始影响长期现金流，系统会把建议从持有降为减仓或观察。`,
        citations: [
          [profile.citationName, profile.citationUrl],
          ["SEC Company Search", "https://www.sec.gov/edgar/searchedgar/companysearch"],
        ],
      },
    ],
  };
}

function getCustomizedNewsCategories() {
  if (!hasCustomPortfolio()) return newsCategories;
  const companyNews = getProfileCompanies().filter((item) => item.profile.allocationId !== "cash").map(buildCompanyNews);
  return [...companyNews, ...newsCategories.filter((category) => category.title !== "Company News")];
}

function buildResearchReport(item) {
  const { ticker, profile, weightValue } = item;
  const verdict = classifyBuffett(profile, weightValue);
  return {
    id: ticker.toLowerCase(),
    source: "Personalized Equity Research",
    title: `${profile.name}: custom Buffett research for your position`,
    text: `基于你的 ${ticker} 持仓生成，覆盖护城河、owner earnings、安全边际、仓位纪律和风险。`,
    tags: [`${ticker}`, `Score ${profile.score}`, verdict.action],
    report: {
      rating: verdict.action,
      priceView: `纪律仓位 ${verdict.limit}；只有当保守内在价值折价足够时才允许新增买入。`,
      thesis:
        `${profile.name} 的个性化研报以你的持仓为起点。核心投资假设是 ${profile.moat}。高盛风格摘要会把结论拆成商业质量、估值、催化、风险和组合动作：如果新闻只改变情绪，不交易；如果它改变长期 owner earnings，重新估值并调整仓位。`,
      positives: [
        `当前 Buffett 质量分为 ${profile.score}，用于决定它能否进入核心候选。`,
        `主要护城河观察点：${profile.moat}。`,
        "若现金流、护城河和管理层资本配置都未恶化，短期波动优先视作复盘机会而非自动卖出信号。",
      ],
      risks: profile.risks,
      valuation: [
        ["Position in your portfolio", formatWeight(weightValue, "未填写比例")],
        ["Buffett discipline range", verdict.limit],
        ["Required margin of safety", profile.score >= 84 ? "25%-30%" : profile.score >= 74 ? "30%-35%" : "40%+"],
        ["Primary diligence question", profile.moat],
      ],
      action: `${ticker}: ${verdict.action}。执行上先检查当前仓位是否超过 ${verdict.limit}；没有安全边际时不追买；若属于风险仓，先把仓位压到纪律上限内。`,
    },
  };
}

function getCustomizedResearchReports() {
  if (!hasCustomPortfolio()) return researchReports;
  return getProfileCompanies().filter((item) => item.profile.allocationId !== "cash").map(buildResearchReport);
}

function getPortfolioMarketSection() {
  if (!hasCustomPortfolio()) return null;
  const companies = getProfileCompanies().filter((item) => item.profile.allocationId !== "cash").slice(0, 4);
  return {
    heading: "Your holdings read-through",
    bullets: companies.map((item) => {
      const verdict = classifyBuffett(item.profile, item.weightValue);
      return `${item.ticker}: ${verdict.action}. 今日 market update 只改变折现率、风险权重和复盘优先级；买入仍必须通过 ${item.profile.name} 的安全边际检查。`;
    }),
  };
}

const connections = [
  { title: "Broker / Portfolio", text: "连接 Interactive Brokers、Robinhood 或券商 CSV，同步真实持仓和成本价。", status: "Mock connector" },
  { title: "Research Sources", text: "接入研报、RSS、Google Drive 文档和本地 PDF，统一进入 research feed。", status: "Ready for API" },
  { title: "YouTube Transcript", text: "已安装 youtube-full；每天 06:00 检查 @la_banker，新 transcript 转成事件信号，再走 Buffett 过滤器。", status: "Skill installed" },
];

let selectedAllocation = allocations[0];
let selectedRegion = "us";
let selectedMarketDate = "2026-06-13";
let userProfile = loadUserProfile();

function loadUserProfile() {
  try {
    return JSON.parse(localStorage.getItem("btUserProfile")) || null;
  } catch {
    return null;
  }
}

function saveUserProfile(profile) {
  localStorage.setItem("btUserProfile", JSON.stringify(profile));
  userProfile = profile;
}

function getProfileText() {
  if (!userProfile) {
    return "当前使用默认示例持仓。首次设置后，建议会根据你的实际持仓和交易哲学调整。";
  }
  const total = userProfile.totalAmount ? `总金额：${userProfile.totalAmount}；` : "";
  return `${total}当前持仓：${formatProfileAssetRows() || userProfile.holdings || "未填写"}；交易哲学：${userProfile.philosophy}；风险：${userProfile.risk}；周期：${userProfile.horizon}。`;
}

function polarToCartesian(cx, cy, radius, angleDegrees) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians),
  };
}

function describeSlice(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function formatPct(value) {
  return `${Number(value).toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function renderPieChart() {
  const svg = document.getElementById("allocationPieSvg");
  const activeAllocations = getActiveAllocations();
  selectedAllocation = getSelectedAllocation(activeAllocations);
  const cx = 210;
  const cy = 180;
  const radius = 108;
  let startAngle = 0;
  svg.innerHTML = activeAllocations
    .map((item) => {
      const angle = (item.value / 100) * 360;
      const endAngle = startAngle + angle;
      const midAngle = startAngle + angle / 2;
      const labelSide = Math.cos(((midAngle - 90) * Math.PI) / 180) >= 0 ? 1 : -1;
      const edge = polarToCartesian(cx, cy, radius, midAngle);
      const elbow = polarToCartesian(cx, cy, radius + 24, midAngle);
      const labelX = cx + labelSide * 170;
      const labelY = elbow.y;
      const lineEndX = labelX - labelSide * 12;
      const anchor = labelSide > 0 ? "start" : "end";
      const path = describeSlice(cx, cy, radius, startAngle, endAngle);
      startAngle = endAngle;
      return `
        <path class="pie-slice ${item.id === selectedAllocation.id ? "active" : ""}" d="${path}" fill="${item.color}" data-allocation="${item.id}"></path>
        <polyline class="pie-leader" points="${edge.x},${edge.y} ${elbow.x},${elbow.y} ${lineEndX},${labelY}" stroke="${item.color}"></polyline>
        <text class="pie-label" x="${labelX}" y="${labelY - 4}" text-anchor="${anchor}" fill="${item.color}">
          <tspan x="${labelX}" dy="0">${item.label}</tspan>
          <tspan x="${labelX}" dy="16">${formatPct(item.value)}</tspan>
        </text>
      `;
    })
    .join("");
}

function showPieTooltip(event) {
  const target = event.target.closest("[data-allocation]");
  const activeAllocations = getActiveAllocations();
  const allocation = target ? activeAllocations.find((item) => item.id === target.dataset.allocation) : null;
  const tooltip = document.getElementById("pieTooltip");
  if (!allocation) {
    tooltip.classList.remove("visible");
    return;
  }
  tooltip.innerHTML = `
    <strong>${allocation.label} · ${allocation.value}%</strong>
    <ul>
      ${allocation.holdings
        .map((holding) => `<li>${holding.ticker} ${holding.weight} · Score ${holding.score} · ${holding.advice}</li>`)
        .join("")}
    </ul>
  `;
  tooltip.classList.add("visible");
}

function renderLegend() {
  const root = document.getElementById("allocationLegend");
  const activeAllocations = getActiveAllocations();
  selectedAllocation = getSelectedAllocation(activeAllocations);
  root.innerHTML = activeAllocations
    .map(
      (item) => `
        <button class="legend-item ${item.id === selectedAllocation.id ? "active" : ""}" data-allocation="${item.id}" type="button">
          <span class="swatch" style="background:${item.color}"></span>
          <strong>${item.label}</strong>
          <span>${item.value}%</span>
        </button>
      `
    )
    .join("");
}

function renderHoldings() {
  const activeAllocations = getActiveAllocations();
  selectedAllocation = getSelectedAllocation(activeAllocations);
  renderPieChart();
  document.getElementById("selectedSliceLabel").textContent = selectedAllocation.label;
  document.getElementById("selectedSliceValue").textContent = `${selectedAllocation.value}%`;
  document.getElementById("holdingTitle").textContent = `${selectedAllocation.label} 持仓`;
  document.getElementById("holdingList").innerHTML = selectedAllocation.holdings
    .slice(0, 4)
    .map(
      (holding) => `
        <div class="holding-row">
          <strong>${holding.ticker}</strong>
          <span>${holding.name}</span>
          <b>${holding.weight}</b>
        </div>
      `
    )
    .join("");
}

function renderDialogHoldings() {
  const rows = selectedAllocation.holdings
    .map(
      (holding) => `
        <tr>
          <td><strong>${holding.ticker}</strong></td>
          <td>${holding.name}</td>
          <td>${holding.weight}</td>
          <td>${holding.score}</td>
          <td>${holding.advice}</td>
        </tr>
      `
    )
    .join("");
  document.getElementById("dialogHoldings").innerHTML = rows;
}

function renderStrategy() {
  const key = document.getElementById("strategySelect").value;
  const strategy = strategies[key];
  const strategyRecommendations = getCustomizedRecommendations(key);
  document.getElementById("strategySummary").innerHTML = `
    <h2>${strategy.title}</h2>
    <p>${strategy.summary}</p>
    <div class="rule-grid">
      ${strategy.rules
        .map(
          ([label, text]) => `
            <div class="rule-box">
              <b>${label}</b>
              <p>${text}</p>
            </div>
          `
        )
        .join("")}
    </div>
  `;
  document.getElementById("recommendationGrid").innerHTML = strategyRecommendations
    .map((item, index) => {
      const steps = item.steps || ["先不要立刻下单", "检查仓位是否超标", "等待触发条件再执行"];
      return `
        <article class="recommendation" data-trade="${key}:${index}">
          <header>
            <span class="ticker">${item.ticker}</span>
            <span class="badge ${item.className}">${item.action}</span>
          </header>
          <p>${item.text}</p>
          <ul class="action-steps">
            ${steps.map((step, stepIndex) => `<li><span>${stepIndex + 1}</span>${step}</li>`).join("")}
          </ul>
        </article>
      `;
    })
    .join("");
}

function renderPortfolioAdvice() {
  const advice = getCustomizedPortfolioRecommendation();
  document.getElementById("portfolioAdvice").innerHTML = `
    <section class="advice-card">
      <p class="eyebrow">Homepage Recommendation</p>
      <h2>${advice.action}</h2>
      <p>${advice.summary}</p>
      <div class="profile-note">${getProfileText()}</div>
      <div class="advice-metrics">
        ${advice.metrics
          .map(
            ([label, value]) => `
              <div class="metric-tile">
                <span>${label}</span>
                <b>${value}</b>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
    <section class="advice-checklist">
      <p class="eyebrow">Buffett Logic</p>
      <h3>严谨条件</h3>
      <ul class="check-list">
        ${advice.checklist.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </section>
  `;
}

function getTradeItem(tradeKey) {
  const [strategyKey, index] = tradeKey.split(":");
  return {
    strategy: strategies[strategyKey],
    item: getCustomizedRecommendations(strategyKey)[Number(index)],
  };
}

function openTradeDialog(tradeKey) {
  const { strategy, item } = getTradeItem(tradeKey);
  const steps = item.steps || ["先不要立刻下单", "检查仓位是否超标", "等待触发条件再执行"];
  const detail =
    item.detail ||
    `该建议来自 ${strategy.title}。它会根据当前策略的买入、卖出、仓位和风险规则生成。执行前必须确认仓位、价格、风险位和资金来源。`;
  const risks = item.risks || [
    "市场短期波动可能让正确策略暂时亏损。",
    "如果输入持仓或成本价不准确，建议会失真。",
    "任何策略都不能保证收益，必须控制仓位和现金。",
  ];
  document.getElementById("tradeDialogTitle").textContent = `${item.ticker} · ${item.action}`;
  document.getElementById("tradeDialogBody").innerHTML = `
    <section class="report-section">
      <h3>小学生也能照做的步骤</h3>
      <ol>${steps.map((step) => `<li>${step}</li>`).join("")}</ol>
    </section>
    <section class="report-section">
      <h3>为什么这么做</h3>
      <p>${detail}</p>
    </section>
    <section class="report-section">
      <h3>主要风险</h3>
      <ul>${risks.map((risk) => `<li>${risk}</li>`).join("")}</ul>
    </section>
    <section class="report-section">
      <h3>你的持仓背景</h3>
      <p>${getProfileText()}</p>
    </section>
    <section class="report-section">
      <h3>Buffett 检查表</h3>
      <ul>
        <li>我是否能解释这家公司如何赚钱？</li>
        <li>护城河是否仍在扩大，而不是被竞争侵蚀？</li>
        <li>owner earnings 是否真实，现金流是否能覆盖业务需求？</li>
        <li>当前价格是否低于保守内在价值，并提供足够安全边际？</li>
        <li>如果明天市场关闭五年，我是否愿意继续持有？</li>
      </ul>
    </section>
  `;
  document.getElementById("tradeDialog").showModal();
}

function renderMarketUpdate() {
  const update = marketUpdates[selectedRegion];
  const dated = marketUpdateCalendar[selectedMarketDate] || {
    label: selectedMarketDate,
    note: "该日期暂无完整历史日报，显示当前模板并保留所选日期用于后续数据接入。",
    prefixBullets: {},
  };
  document.getElementById("marketDate").textContent = `${update.title} · ${dated.label}`;
  document.getElementById("marketTables").innerHTML = update.boxes
    .map(
      (box) => `
        <section class="market-box">
          <h3>${box.title}</h3>
          <table>
            <thead><tr><th></th>${box.columns.map((col) => `<th>${col}</th>`).join("")}</tr></thead>
            <tbody>
              ${box.rows
                .map(
                  (row) => `
                    <tr>
                      <td><strong>${row[0]}</strong></td>
                      ${row.slice(1).map((value) => `<td>${value}</td>`).join("")}
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </section>
      `
    )
    .join("");
  const dateSection = {
    heading: dated.note,
    bullets: [dated.prefixBullets[selectedRegion] || "Selected date read-through: use the same Buffett discipline for this date; macro changes the required return, not the definition of business quality."],
  };
  document.getElementById("macroReport").innerHTML = [dateSection, getPortfolioMarketSection(), ...update.sections]
    .filter(Boolean)
    .map(
      (section) => `
        <section class="macro-section">
          <h3>${section.heading}</h3>
          <ul>${section.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>
        </section>
      `
    )
    .join("");
}

function renderFeeds() {
  const personalizedNews = getCustomizedNewsCategories();
  const personalizedResearch = getCustomizedResearchReports();
  document.getElementById("newsFeed").innerHTML = personalizedNews
    .map(
      (category, index) => `
        <details class="news-category" ${index < 2 ? "open" : ""}>
          <summary>
            <span>${category.title}</span>
            <span class="mini-tag">7D · ${category.count}</span>
          </summary>
          <div class="news-category-body">
            ${category.items
              .map(
                (item) => `
                  <article class="news-item" data-news="${item.id || item.title}">
                    <header>
                      <strong>${item.title}</strong>
                      <time>${item.date}</time>
                    </header>
                    <p>${item.text}</p>
                    <div class="feed-meta">${item.tags.map((tag) => `<span class="mini-tag">${tag}</span>`).join("")}</div>
                  </article>
                `
              )
              .join("")}
          </div>
        </details>
      `
    )
    .join("");
  document.getElementById("researchFeed").innerHTML = personalizedResearch
    .map(
      (item) => `
        <article class="feed-item">
          <button class="research-clickable" type="button" data-report="${item.id}">
            <span>${item.source}</span>
            <strong>${item.title}</strong>
            <p>${item.text}</p>
            <div class="feed-meta">${item.tags.map((tag) => `<span class="mini-tag">${tag}</span>`).join("")}</div>
          </button>
        </article>
      `
    )
    .join("");
  document.getElementById("connectionList").innerHTML = connections
    .map(
      (item) => `
        <div class="connection-item">
          <strong>${item.title}</strong>
          <p>${item.text}</p>
          <div class="feed-meta"><span class="mini-tag">${item.status}</span></div>
        </div>
      `
    )
    .join("");
}

function openResearchReport(reportId) {
  const item = getCustomizedResearchReports().find((report) => report.id === reportId);
  if (!item) return;
  document.getElementById("researchDialogTitle").textContent = item.title;
  document.getElementById("researchDialogBody").innerHTML = `
    <section class="report-section">
      <h3>Investment View</h3>
      <p><strong>${item.report.rating}</strong> · ${item.report.priceView}</p>
      <p>${item.report.thesis}</p>
    </section>
    <section class="report-section">
      <h3>Positive Drivers</h3>
      <ul>${item.report.positives.map((point) => `<li>${point}</li>`).join("")}</ul>
    </section>
    <section class="report-section">
      <h3>Key Risks</h3>
      <ul>${item.report.risks.map((point) => `<li>${point}</li>`).join("")}</ul>
    </section>
    <section class="report-section">
      <h3>Buffett Valuation Frame</h3>
      <table>
        <tbody>
          ${item.report.valuation
            .map(
              ([label, value]) => `
                <tr>
                  <td><strong>${label}</strong></td>
                  <td>${value}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>
    <section class="report-section">
      <h3>Portfolio Action</h3>
      <p>${item.report.action}</p>
    </section>
  `;
  document.getElementById("researchDialog").showModal();
}

function findNewsItem(newsId) {
  for (const category of getCustomizedNewsCategories()) {
    const found = category.items.find((item) => (item.id || item.title) === newsId);
    if (found) return { category, item: found };
  }
  return null;
}

function openNewsReport(newsId) {
  const result = findNewsItem(newsId);
  if (!result) return;
  const { category, item } = result;
  const citations = item.citations || [
    ["Federal Reserve", "https://www.federalreserve.gov/newsevents.htm"],
    ["SEC EDGAR", "https://www.sec.gov/edgar/search/"],
    ["U.S. Treasury Data", "https://home.treasury.gov/resource-center/data-chart-center/interest-rates"],
  ];
  document.getElementById("researchDialogTitle").textContent = item.title;
  document.getElementById("researchDialogBody").innerHTML = `
    <section class="report-section">
      <h3>News Research Brief</h3>
      <p><strong>${category.title}</strong> · ${item.date}</p>
      <p>${item.detail || item.text}</p>
    </section>
    <section class="report-section">
      <h3>Buffett Interpretation</h3>
      <ul>
        <li>Does the item change normalized owner earnings, or only near-term sentiment?</li>
        <li>Does it strengthen or weaken the company's moat, pricing power, balance sheet, or management credibility?</li>
        <li>If uncertainty rises, raise the required margin of safety rather than forcing a trade.</li>
      </ul>
    </section>
    <section class="report-section">
      <h3>Trading Implication</h3>
      <p>Use this news as an evidence input. It can upgrade watchlist priority, but a buy action still requires business quality, conservative intrinsic value, and sufficient safety margin.</p>
    </section>
    <section class="report-section">
      <h3>Citations</h3>
      <div class="citation-list">
        ${citations.map(([label, url]) => `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`).join("")}
      </div>
      <div class="source-note">Citation links point to primary or reference source websites. Live article ingestion can replace this demo data when a news API/RSS source is connected.</div>
    </section>
  `;
  document.getElementById("researchDialog").showModal();
}

function openHoldingDialog() {
  selectedAllocation = getSelectedAllocation();
  renderDialogHoldings();
  document.getElementById("holdingDialog").showModal();
}

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function createAssetEntryRow(asset = { name: "", value: "" }) {
  const row = document.createElement("div");
  row.className = "asset-entry-row";
  row.innerHTML = `
    <input class="asset-name-input" type="text" placeholder="股票/ETF/Bond，例如 MSFT、SPY、SGOV" value="${escapeAttr(asset.name)}" />
    <input class="asset-value-input" type="text" placeholder="数量/金额/比例，例如 10 shares、$5000、15%" value="${escapeAttr(asset.value)}" />
    <button class="icon-button remove-asset-row" type="button" aria-label="Remove asset row">×</button>
  `;
  return row;
}

function renderAssetRows(rows = []) {
  const list = document.getElementById("assetEntryList");
  list.innerHTML = "";
  const normalizedRows = rows.length ? rows : [{ name: "", value: "" }];
  normalizedRows.forEach((asset) => list.appendChild(createAssetEntryRow(asset)));
}

function collectAssetRows() {
  return Array.from(document.querySelectorAll(".asset-entry-row"))
    .map((row) => ({
      name: row.querySelector(".asset-name-input").value.trim(),
      value: row.querySelector(".asset-value-input").value.trim(),
    }))
    .filter((asset) => asset.name);
}

function assetRowsToHoldingText(rows) {
  return rows.map((asset) => `${asset.name}${asset.value ? ` ${asset.value}` : ""}`).join(", ");
}

function refreshPersonalizedViews() {
  selectedAllocation = getSelectedAllocation();
  renderLegend();
  renderHoldings();
  renderPortfolioAdvice();
  renderStrategy();
  renderMarketUpdate();
  renderFeeds();
}

function bindEvents() {
  document.getElementById("allocationLegend").addEventListener("click", (event) => {
    const button = event.target.closest("[data-allocation]");
    if (!button) return;
    selectedAllocation = getActiveAllocations().find((item) => item.id === button.dataset.allocation);
    renderLegend();
    renderHoldings();
  });

  document.getElementById("pieChart").addEventListener("click", (event) => {
    const slice = event.target.closest("[data-allocation]");
    if (slice) {
      selectedAllocation = getActiveAllocations().find((item) => item.id === slice.dataset.allocation);
      renderLegend();
      renderHoldings();
    }
    openHoldingDialog();
  });
  document.getElementById("pieChart").addEventListener("mousemove", showPieTooltip);
  document.getElementById("pieChart").addEventListener("mouseleave", () => document.getElementById("pieTooltip").classList.remove("visible"));
  document.getElementById("showAllHoldings").addEventListener("click", openHoldingDialog);
  document.getElementById("closeDialog").addEventListener("click", () => document.getElementById("holdingDialog").close());
  document.getElementById("closeResearchDialog").addEventListener("click", () => document.getElementById("researchDialog").close());
  document.getElementById("closeTradeDialog").addEventListener("click", () => document.getElementById("tradeDialog").close());
  document.getElementById("strategySelect").addEventListener("change", renderStrategy);
  document.getElementById("editProfileButton").addEventListener("click", () => openOnboarding(true));
  document.getElementById("connectButton").addEventListener("click", () => {
    document.querySelector(".connection-list").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.getElementById("recommendationGrid").addEventListener("click", (event) => {
    const card = event.target.closest("[data-trade]");
    if (!card) return;
    openTradeDialog(card.dataset.trade);
  });

  document.getElementById("researchFeed").addEventListener("click", (event) => {
    const button = event.target.closest("[data-report]");
    if (!button) return;
    openResearchReport(button.dataset.report);
  });

  document.getElementById("newsFeed").addEventListener("click", (event) => {
    const item = event.target.closest("[data-news]");
    if (!item) return;
    openNewsReport(item.dataset.news);
  });

  document.getElementById("marketDatePicker").addEventListener("change", (event) => {
    selectedMarketDate = event.target.value;
    renderMarketUpdate();
  });

  document.querySelector(".report-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-region]");
    if (!button) return;
    selectedRegion = button.dataset.region;
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    renderMarketUpdate();
  });

  document.getElementById("skipOnboarding").addEventListener("click", () => {
    saveUserProfile({
      holdings: "Default demo portfolio",
      totalAmount: "",
      assets: [],
      philosophy: "buffett",
      risk: "balanced",
      horizon: "long",
      skipped: true,
    });
    document.getElementById("onboardingDialog").close();
    refreshPersonalizedViews();
  });

  document.getElementById("addAssetRow").addEventListener("click", () => {
    document.getElementById("assetEntryList").appendChild(createAssetEntryRow());
  });

  document.getElementById("assetEntryList").addEventListener("click", (event) => {
    const removeButton = event.target.closest(".remove-asset-row");
    if (!removeButton) return;
    const rows = document.querySelectorAll(".asset-entry-row");
    if (rows.length === 1) {
      rows[0].querySelector(".asset-name-input").value = "";
      rows[0].querySelector(".asset-value-input").value = "";
      return;
    }
    removeButton.closest(".asset-entry-row").remove();
  });

  document.getElementById("onboardingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const assets = collectAssetRows();
    saveUserProfile({
      holdings: assetRowsToHoldingText(assets),
      totalAmount: document.getElementById("profileTotalAmount").value.trim(),
      assets,
      philosophy: document.getElementById("profilePhilosophy").value,
      risk: document.getElementById("profileRisk").value,
      horizon: document.getElementById("profileHorizon").value,
    });
    document.getElementById("onboardingDialog").close();
    refreshPersonalizedViews();
  });
}

function openOnboarding(force = false) {
  if (!force && userProfile) return;
  if (userProfile && !userProfile.skipped) {
    document.getElementById("profileTotalAmount").value = userProfile.totalAmount || "";
    renderAssetRows(getProfileAssetRows());
    document.getElementById("profilePhilosophy").value = userProfile.philosophy || "buffett";
    document.getElementById("profileRisk").value = userProfile.risk || "balanced";
    document.getElementById("profileHorizon").value = userProfile.horizon || "long";
  } else {
    document.getElementById("profileTotalAmount").value = "";
    renderAssetRows([
      { name: "", value: "" },
      { name: "", value: "" },
    ]);
  }
  document.getElementById("onboardingDialog").showModal();
}

function init() {
  refreshPersonalizedViews();
  bindEvents();
  openOnboarding(false);
}

init();
