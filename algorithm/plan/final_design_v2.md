# Dolphine — Final Design v2（进阶版）
> Regional Codex Hackathon · SEA × OpenAI · 2026-06-06
> 核心命题：不是"AI 辅助找房"，是"AI 替你做了一个专业顾问的工作"

---

## 重新定义产品身份

v1 的 Dolphine 是：**"一个帮你分析房源的表单"**

v2 的 Dolphine 是：**"一个由多个专业 AI agent 组成的选房顾问团，他们替你辩论、质疑、模拟，最后给你一个有依据的裁决"**

这个差别决定了整个 UI 语言和信息架构。

---

## Build Direction 对照（v2 版本）

### Build Direction 01：Autonomous & Adaptive AI
**Dolphine 做了什么你没有要求的事？**
- 自动检测 listing 里的警示语言（"utilities negotiable" = 可能被隐性收费）
- 自动发现你没说出口的优先级（"你问了三次安静相关的问题，Dolphine 重新权重了 quietness"）
- 主动告警："这个房源价格比同区同类型低 23%，建议问清楚原因再定"

### Build Direction 02：AI-Native Products
**什么是以前完全不可能做到的？**
- 把一条 WhatsApp agent 消息变成结构化数据 + 生活影响评估，实时完成
- 不是"给你信息"，是"替你做决定的推理过程全透明给你看"
- 多个 AI agent 互相质疑后产生的建议，比单一 AI 更可信

### Build Direction 03：Deep Domain AI
**一个有 10 年经验的房产顾问会知道什么？**
- 租约条款的坑（"1 week notice termination" 是非标准条款）
- 同区 listing 的市场参考价，判断这个价格是否合理
- 哪种生活类型的人会在哪种房型里后悔

---

## 核心架构改变：从"表单"到"对话"

### 现状（v1）
```
用户填表 → 粘贴 listing → 分析 → 结果
```

### v2 目标
```
用户说话 → Dolphine 理解意图 → 多 agent 辩论 → 裁决 + 完整推理链 → 用户自主审计
```

---

## 五个核心前端体验改造

---

### 体验 1：自然语言 Profile 入口（取代表单）

**核心理念：** 真正的 AI-native 产品不应该让用户填下拉菜单。

**新的 landing 交互：**

```
┌──────────────────────────────────────────────────────┐
│  🐬 告诉 Dolphine 你的情况                            │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  我下个月搬到新加坡，在 one-north 上班，预算大概   │  │
│  │  1500 左右，很在意能不能自己煮饭...              │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Dolphine 理解到：                                    │
│  ✓ 工作地点：one-north MRT                           │
│  ✓ 预算：≤ S$1,500/月                               │
│  ✓ 必要条件：cooking allowed                         │
│  ✓ 推断：新来者，优先考虑稳定性 > 极致省钱            │
│                                                      │
│  [这理解正确 →]   [我来补充...]                       │
└──────────────────────────────────────────────────────┘
```

**技术实现：** 一个短 prompt 发到 GPT-4o，返回结构化 Profile JSON，再渲染成确认卡。

**为什么这是冠军级别：** 评审输入一句话，立刻看到 AI 理解了他的意图并结构化——这本身就是 demo moment。

---

### 体验 2：多 Agent 辩论面板（核心差异化）

**核心理念：** 一个建议只有在经历了质疑之后才是可信的。

分析结果不是"Dolphine 给了你一个答案"，而是"5 个专业 agent 开了一场会，你旁听了"。

**UI 设计：**

```
┌─────────────────────────────────────────────────────────┐
│  DOLPHINE AGENT COUNCIL                  🔴 已完成辩论  │
│                                                         │
│  🧭 通勤分析师    Queenstown #1 ✓                       │
│     "12分钟单程，年省 230 小时，强烈支持"                │
│                                                         │
│  💰 财务分析师    Queenstown #1 ✓                       │
│     "真实月成本 S$1,608，高于预算 S$108，但可接受"       │
│                                                         │
│  🏡 生活方式分析师  有异议 ⚡                            │
│     "Dover Master 更符合用户的安静需求，值得考虑"        │
│     → 被否决：Dover 月成本高 S$260，且 cooking 不确定   │
│                                                         │
│  🔍 风险分析师    Queenstown #1 ✓                       │
│     "listing 完整，无异常定价，无危险条款信号"           │
│                                                         │
│  🧠 综合裁决官    最终裁决：Queenstown Common Room       │
│     "4:1 多数，生活方式异议已被财务与风险数据覆盖"       │
│                                                         │
│  [查看完整辩论记录 ↓]                                   │
└─────────────────────────────────────────────────────────┘
```

**为什么这是冠军级别：**
- 直接命中 Build Direction 01（Autonomous AI）
- 让用户看到"异议"和"否决"——这是人类决策信任的核心机制
- 评审不是看到一个 AI 的输出，而是看到一个 AI 系统的推理过程

---

### 体验 3：Listing 真实性检测 + 市场定价审计（Deep Domain）

**核心理念：** 一个有经验的房产顾问会做的第一件事：这个 listing 是否可信？这个价格是否合理？

**在 ExtractedRoomCards 旁边加入：**

```
┌─────────────────────────────────────┐
│  📊 Dolphine 市场审计                │
│                                     │
│  Queenstown Common Room @ S$1,450   │
│  ──────────────────────────────── │
│  同区同类型市场价：S$1,300–S$1,550   │
│  定价位置：▓▓▓▓▓▓▓░░░  中上区间      │
│  合理性：✓ 正常范围内               │
│                                     │
│  Jurong East Common Room @ S$1,100  │
│  ──────────────────────────────── │
│  同区同类型市场价：S$1,050–S$1,200   │
│  定价位置：▓▓▓▓░░░░░░  偏低          │
│  ⚠️  注意：低于区域均价，utilities   │
│     "not included" 可能是真实原因   │
└─────────────────────────────────────┘
```

**Listing 警示系统：**
```
⚠️  Dolphine 检测到以下信号：

Jurong East Common Room
• "utilities not included" — 实际月增 S$60–120，需确认上限
• "5B2B" — 大单位共用空间，隐私体验低于预期
• 无照片描述 — 建议实地看房前要求视频

Punggol Co-living
• 定价比同区低 31% — 异常，可能有隐性费用或管理问题
• "co-living" 字眼 — 通常有额外规定，需确认访客政策
```

**为什么这是冠军级别：**
- 这是真正的"Deep Domain AI"——房产顾问知道这些，普通用户不知道
- 可以直接问评审："99.co 会告诉你这个吗？PropertyGuru 会吗？"
- 完全从 listing 文本推断，不需要外部数据库

---

### 体验 4：决策溯源面板（Decision Provenance）

**核心理念：** 可解释的 AI 才是可信任的 AI。让用户能审计每一步推理。

**在 RankedRoomRecommendations 里，每个房源展开时显示：**

```
┌─────────────────────────────────────────────────────┐
│  Queenstown Common Room — 排名 #1 的完整依据         │
│                                                     │
│  优先级权重（来自你的 profile）                       │
│  ─────────────────────────────────────────────────  │
│  短通勤      40%  × 得分 9/10  = 3.6 分              │
│  近 MRT      25%  × 得分 9/10  = 2.25 分             │
│  健身房      20%  × 得分 7/10  = 1.4 分              │
│  安静环境    15%  × 得分 8/10  = 1.2 分              │
│  ─────────────────────────────────────────────────  │
│  加权总分：8.45 / 10                                 │
│                                                     │
│  必要条件核查                                        │
│  ✓ Aircon — 明确列出                                │
│  ✓ Cooking allowed — 明确列出                       │
│  ✓ No owner staying — 明确列出                      │
│  ✓ WiFi included — 明确列出                         │
│                                                     │
│  Dolphine 的一句话判断：                             │
│  "没有一个必要条件缺失，通勤是你优先级第一，         │
│   这房的通勤是所有候选里最短的之一。"                │
└─────────────────────────────────────────────────────┘
```

**为什么这是冠军级别：**
- 让 AI 的推理"玻璃化"——评审能质疑、能验证
- 这是 Build Direction 01（Autonomous AI）的核心：用户可以信任 AI 的判断，因为他们看得到推理链

---

### 体验 5：后悔免疫报告（Regret Immunization）

**核心理念：** Dolphine 的终极价值不是"找到最好的房"，而是"避免 6 个月后后悔"。把这个做成一个独立的、戏剧性的收尾。

**取代现在的 `DolphineReport`，改成：**

```
┌─────────────────────────────────────────────────────────┐
│  🛡️  DOLPHINE 后悔免疫报告                               │
│                                                         │
│  基于 Queenstown Common Room                            │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  你 6 个月后最可能后悔的事：                             │
│                                                         │
│  1. 共用浴室 （概率 42%）                               │
│     → 缓解：确认浴室共用人数，要求看房时间段            │
│                                                         │
│  2. 租金超预算 S$108 （概率 28%）                       │
│     → 缓解：谈判将 WiFi 费用计入，或首月免租            │
│                                                         │
│  3. Utilities 上限不明 （概率 19%）                     │
│     → 缓解：签约前要求写入 utilities cap ≤ S$80/月     │
│                                                         │
│  如果你改选 Jurong East：                               │
│  后悔概率 ██████████ 71%                               │
│  （主因：通勤疲劳 × 你的 #1 优先级冲突）                │
│                                                         │
│  Dolphine 建议：签 Queenstown，用以下话术谈判 →         │
└─────────────────────────────────────────────────────────┘
```

---

## 新增：隐性偏好检测（Adaptive AI 核心）

**当用户在 chat refinement 里问了某类问题，Dolphine 主动调整：**

```
┌─────────────────────────────────────────────┐
│  🧠 Dolphine 注意到你的偏好变化              │
│                                             │
│  你问了 2 次关于安静环境的问题。             │
│  我已经将"安静环境"的权重从 15% 提升到 25%。 │
│  Queenstown 仍然是 #1，但差距缩小了。        │
│                                             │
│  [确认这个调整]   [保持原来的权重]           │
└─────────────────────────────────────────────┘
```

这是 Build Direction 01 的精髓：**agent 在用户不知道的情况下学习，然后透明地汇报**。

---

## 新结果页架构

```
0. NaturalLanguageInput       ← 新增：自然语言 profile 入口（landing 改造）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 结果页开始 ━━━━━━━━━━━━━
1. AgentCouncilPanel          ← 新增：多 agent 辩论面板（最顶部，最震撼）
2. VerdictCard                ← 新增：裁决卡（30秒版本）
3. TotalLifeCostMatrix        ← 新增：真实总成本对比
4. ListingAuditPanel          ← 新增：真实性检测 + 市场定价
5. RankedRoomRecommendations  ← 现有（加入 Decision Provenance 展开）
6. SelectedRoomDeepDive       ← 现有（加入 Vibe Score Card）
7. FutureLifeSimulator        ← 现有（动态化 + 12个月预测）
8. RegretImmunizationReport   ← 新增：后悔免疫报告（取代旧 DolphineReport）
9. AdaptivePreferenceAlert    ← 新增：隐性偏好检测（chat refinement 旁边）
10. LandlordQuestions          ← 现有（改成可一键发送）
11. DolphineChatRefinement     ← 现有
```

---

## Schema 扩展 v2

```typescript
type RoomListing = {
  // 现有字段保留 ...

  // 市场审计
  marketPriceRange: { min: number; max: number };
  pricingPosition: "below" | "normal" | "above";
  listingWarnings: { severity: "low" | "medium" | "high"; message: string }[];

  // 决策溯源
  priorityScores: { priority: string; weight: number; score: number; weighted: number }[];
  mustHaveChecks: { item: string; status: "found" | "missing" | "unclear" }[];

  // 后悔免疫
  regretProbability: number;
  regretFactors: { description: string; probability: number; mitigation: string }[];

  // 多 agent 投票
  agentVotes: {
    agent: "commute" | "financial" | "lifestyle" | "risk" | "synthesizer";
    vote: string;
    reasoning: string;
    dissent?: string;
  }[];

  // 生活预测
  twelveMonthForecast: string;
  vibeScore: { food: number; transit: number; gym: number; quiet: number; lifestyle: number };
};
```

---

## Demo 走场节奏 v2（5分钟版）

| 时间 | 动作 | 卖点 |
|---|---|---|
| 0:00 | 输入一句自然语言描述 | "AI 读懂我说的话" |
| 0:30 | 看到 Profile 被自动解析 | AI-Native 开场 |
| 0:45 | 粘贴 listing / 用 demo | 真实使用场景 |
| 1:00 | 点 Analyze，看加载 steps | Agent reasoning 可视化 |
| 1:30 | **Agent Council Panel** | "哇，原来有 5 个 AI 在帮我想" |
| 2:00 | **Verdict Card** | 30秒内清楚结论 |
| 2:30 | **Total Life Cost Matrix** | "S$350 其实只便宜 S$183" |
| 3:00 | **Listing Audit** | "这个房的价格为什么低这么多？" |
| 3:30 | 展开 Decision Provenance | "我能质疑 AI 的逻辑" |
| 4:00 | **Regret Immunization** | 情感收尾，memorable |
| 4:30 | 点"生成房东消息" | 实用落地 |

---

## 冠军感从哪来？

1. **多 agent 辩论** → 评审看到的不是一个黑盒输出，而是一个推理系统
2. **可审计的推理链** → AI 说"我信任你"需要理由，这就是理由
3. **自然语言入口** → 没有表单的 AI 产品才是真 AI-native
4. **Regret Immunization** → 这个词本身就是记忆点，评审回家还会想起来
5. **Listing 警示系统** → 这是真正的专业知识，99.co 没有，PropertyGuru 没有

---

## 优先级排序 v2

| 优先级 | 改动 | 时间估算 | 命中维度 |
|---|---|---|---|
| P0 | Agent Council Panel | 3小时 | Build 01 + Originality |
| P0 | VerdictCard | 1小时 | Real-World Value |
| P0 | Listing Audit + Warnings | 2小时 | Build 03 + Insight |
| P1 | Total Life Cost Matrix | 1.5小时 | Build 02 + Real-World |
| P1 | Decision Provenance | 2小时 | Build 01 + Build Quality |
| P1 | Regret Immunization Report | 1.5小时 | Insight + Memorable |
| P2 | Natural Language Profile | 2小时 | Build 02 |
| P2 | Adaptive Preference Alert | 1小时 | Build 01 |
| P3 | Vibe Score Card | 1小时 | Nice-to-have |
