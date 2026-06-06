# Dolphine — Final Design Plan
> Regional Codex Hackathon · SEA × OpenAI · 2026-06-06

---

## 评审维度对照分析

| 评审标准 | 目前状态 | 目标状态 |
|---|---|---|
| Problem & Solution Fit | 问题真实，解法有说服力 | 强化"真实总成本"让问题感更痛 |
| Build Quality | 前端完整，API 联通 | 结果页要经得住评审实际使用 |
| Insight & Originality | Life simulator 有新意 | 加入 Regret Score + Total Life Cost 拉开距离 |
| Real-World Value | 数字存在但不戏剧性 | 让"230小时/年"变成情感冲击 |
| Alignment with Build Direction | 偏向 AI-Native (02) | 同时命中 Autonomous (01) + Deep Domain (03) |
| Use of Codex | 后端有多个 agent | 前端要把 agent reasoning 可视化出来 |

---

## 核心概念

**Dolphine 的核心价值主张：**
> 不是帮你找房，是帮你避免 6 个月后后悔。

传统租房平台给你信息。Dolphine 给你判断。这个差别要在 UI 的每一层都体现出来。

---

## 前端改动计划

### 改动 1：结果页开头改成"裁决时刻"（最高优先级）

**现状问题：** `ResultsDashboard` 第一个组件是 `ExtractedRoomCards`——这是信息展示，不是判断。用户看到的第一眼是数据，不是答案。

**目标状态：** 结果页顶部是一张全宽"裁决卡片"，直接亮出 Dolphine 的结论。

**设计方案：**

```
┌─────────────────────────────────────────────────────┐
│  🐬 DOLPHINE 的判断                                  │
│                                                     │
│  Queenstown Common Room                             │
│  是你在这批房源中的最佳选择                           │
│                                                     │
│  原因（30秒版本）：                                   │
│  • 12分钟通勤 vs 你最高可接受的 20 分钟               │
│  • 烹饪允许 + 无房东同住 = 符合你的 top 2 优先级       │
│  • 真实月支出 S$1,518（含交通）vs 预算 S$1,500         │
│                                                     │
│  ⚠️  Jurong East 看起来便宜 S$350，实际只便宜 S$183   │
│                                                     │
│  [查看完整分析 ↓]    [生成房东消息]                  │
└─────────────────────────────────────────────────────┘
```

**新增视觉元素：Regret Score**

每个房源显示一个"后悔概率"，基于用户的优先级排名计算：
- 通勤优先 → 长通勤房源后悔概率高
- 安静优先 → 嘈杂区域后悔概率高

```
Jurong East Common Room
后悔概率：71%  ████████░░
（主因：通勤疲劳，与你 #1 优先级冲突）
```

---

### 改动 2：真实总成本对比（AI-Native 最强论据）

**现状问题：** `TradeoffSection` 是文字列表，对比不够直觉。用户看到"S$350 更便宜"就停了，没有看到交通费和时间成本。

**目标状态：** 一张可视化的 **Total Life Cost** 矩阵。

**计算公式：**
```
真实月成本 = 月租 + 月交通费 + 时间税
时间税 = (单程通勤分钟 × 2 × 每月上班天数 / 60) × 时薪估算 (S$10/hr)
```

**UI 设计：**

```
┌──────────────────────────────────────────────────────────────┐
│  真实总成本对比（不只是租金）                                   │
│                                                              │
│                    Jurong East    Queenstown    Dover Master  │
│  月租              S$1,100        S$1,450       S$1,550       │
│  月交通            +S$95          +S$68         +S$60         │
│  时间税 *          +S$230         +S$90         +S$75         │
│  ─────────────────────────────────────────────────────────   │
│  真实月成本        S$1,425        S$1,608       S$1,685       │
│  vs 月租差距       ─             +S$183        +S$260        │
│                                                              │
│  * 通勤时间 × S$10/hr（你的时间有价值）                        │
└──────────────────────────────────────────────────────────────┘
```

**为什么这是 AI-Native：** 99.co、PropertyGuru 都不算这个。这是只有了解你的工作地点、通勤方式、优先级的 AI 才能给出的数字。

---

### 改动 3：Future Life Simulator 动态化

**现状问题：** 三天时间表是 hardcoded，用户会感觉是"假的"。

**目标状态：** 根据 `room.commuteMinutes` + `profile.officeDays` 真正动态生成，加入：

**新增内容：**

1. **睡眠压力指标**
   - 如果通勤 > 40 分钟，推算"如果要9点到，需要7:20起床 → 需要11:20睡觉 → 每天只有 3 小时个人时间"
   - 视觉：一个简单的"个人时间条"，红色代表时间被通勤吃掉

2. **周末自由时间估算**
   - "住在 Queenstown，你的周末从 MRT 5 分钟覆盖范围内有：{food options}, {gym}, {nature}"
   - "住在 Jurong East，周末出行需要额外 {X} 分钟到达同等选项"

3. **12个月后的自己**
   - 一段短文（2-3句）描述住进去 12 个月后的生活状态
   - Queenstown: "12 个月后：通勤稳定，有烹饪习惯，每月多存 S$183，健身房已成习惯。"
   - Jurong East: "12 个月后：通勤疲劳已经影响你的下班后状态，外卖费用超出预期，每年多花 230 小时在通勤上。"

---

### 改动 4：Agent Reasoning 可视化（命中 Build Direction 01）

**现状问题：** 加载界面有 7 个步骤，但结果页看不出 AI "思考"了什么。

**目标状态：** 在每个结果区块的角落，加一个小的"Dolphine 注意到"气泡。

```
[Dolphine 注意到]
你标记了"烹饪允许"为 must-have，
但 Jurong East 的 listing 里明确写了"no cooking"。
这是我把它排第 4 的主要原因。
```

这个细节让评审感受到 AI 真的在"阅读"和"推断"，不是在查表。

---

### 改动 5：Neighbourhood Vibe Score Card（命中 Deep Domain 03）

**现状问题：** `foodAccess`、`gymAccess`、`quietness` 都是纯文字，信息密度低。

**目标状态：** 每个房源有一个 5 维的 Vibe Score Card：

```
Queenstown Common Room
─────────────────────
食物  ████████░░  8/10
交通  █████████░  9/10
健身  ███████░░░  7/10
安静  ████████░░  8/10
生活  ████████░░  8/10
```

维度分数由 AI 从 listing 文本 + 预设邻里数据推算出来，加入 `RoomListing` schema。

---

## 结果页新组件顺序

改动后的 `ResultsDashboard` 渲染顺序：

```
1. VerdictCard            ← 新增：裁决时刻（顶部大卡）
2. TotalLifeCostMatrix    ← 新增：真实总成本对比
3. RankedRoomRecommendations  ← 现有（加入 Regret Score 标签）
4. SelectedRoomDeepDive   ← 现有（加入 Vibe Score Card）
5. FutureLifeSimulator    ← 现有（改成动态 + 12个月预测）
6. AgentReasoningLog      ← 新增：agent 推理片段
7. LandlordQuestions      ← 现有
8. DolphineReport         ← 现有
9. DolphineChatRefinement ← 现有
```

---

## Schema 扩展（算法侧需配合）

`RoomListing` 需要新增字段：

```typescript
type RoomListing = {
  // ... 现有字段 ...
  regretProbability: number;          // 0-100，后悔概率
  totalMonthlyCost: number;           // 月租 + 交通 + 时间税
  vibeScore: {
    food: number;                     // 1-10
    transit: number;
    gym: number;
    quiet: number;
    lifestyle: number;
  };
  agentInsight: string;               // agent 的一句话洞察
  twelveMonthForecast: string;        // 12个月后的生活预测
};
```

---

## Demo 走场节奏（给评审看的 30 秒内容）

1. 打开 landing page → 点 "Find My Best Room"
2. 快速填好 profile（已有默认值）
3. 选 Demo 模式 → 点 "Analyze Rooms"
4. 看加载中的 agent reasoning steps（卖 AI-native 感）
5. 滚动到 **VerdictCard**（第一个冲击点）
6. 展开 **Total Life Cost Matrix**（第二个冲击点："S$350 其实只便宜 S$183"）
7. 看 **Future Life Simulator** 的 12 个月预测（情感收尾）
8. 点 "生成房东消息"（实用落地）

---

## 优先级排序

| 优先级 | 改动 | 原因 |
|---|---|---|
| P0 | VerdictCard（裁决卡） | 改变第一眼印象，投入产出比最高 |
| P0 | Total Life Cost Matrix | 最有说服力的 AI-native 差异化 |
| P1 | Regret Score 标签 | 视觉上强化判断力 |
| P1 | 12个月后预测文案 | 情感共鸣，memorable |
| P2 | Vibe Score Card | 好看，但信息量大 |
| P2 | Agent Reasoning 气泡 | 加分项，不是核心 |
| P3 | 睡眠压力指标 | 如果时间够再加 |
