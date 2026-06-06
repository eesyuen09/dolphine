# 算法设计文档（v2 — ARGUS 风格多 Agent 架构）

本文档定义你负责的完整算法流水线，从原始用户输入到最终房源推荐报告的全过程。

**设计灵感来源**：参考了 ARGUS 项目（CS3263 课程项目）的多 Agent 去偏架构，核心思想：
- 每个 Agent 只负责一个维度的证据
- 在推理中主动纠正人类判断容易 miss 的认知偏差
- System 2 内部推理，System 1 外部输出

前提：
- 队友提供 `backend/data/neighbourhoods.json`（社区数据）和 `backend/data/rooms.json`（房源列表）
- LLM 仅用于第一阶段用户输入解析（OpenAI API）
- 最终输出是**房源级别**推荐，附带社区洞察

---

## 流水线总览

```
用户输入（自然语言）
        ↓
  Agent 1: 偏好解析 Agent（LLM）
        — 从自然语言中提取结构化偏好
        ↓
  Agent 2: 认知偏差纠正 Agent（Debias）
        — 主动发现人类判断会 miss 的隐藏成本和误判
        ↓
  Agent 3: 社区评分 Agent
        — 按各维度对每个社区打加权综合分
        ↓
  Agent 4: 房源筛选 & 排序 Agent
        — 在得分最高的社区里筛选符合条件的具体房源
        ↓
  Agent 5: 权衡分析 Agent
        — 比较 Top 2 选项，生成具体的得失清单
        ↓
  Agent 6: 未来生活模拟 Agent
        — 生成真实感的一天生活预览
        ↓
  报告生成器
        — 组装最终结构化输出交给前端
```

---

## Agent 1 — 偏好解析 Agent（LLM）

**目标**：用 LLM 从自然语言中提取结构化偏好，替代正则匹配。

### 输入
用户自然语言字符串，例如："我在 Kent Ridge 上班，预算 1500，不开车，每周去健身房 4 次，喜欢安静的地方，hybrid 工作。"

### LLM 调用方式
使用 OpenAI API，function calling / structured output 模式，强制输出固定 JSON schema，不允许 LLM 自由发挥。

**System Prompt（固定）：**
```
你是一个新加坡住房偏好分析助手。用户会描述他们的工作、预算和生活需求。
你的任务是从用户输入中提取结构化信息。
如果用户没有明确说某个字段，使用 null，不要猜测。
所有输出必须是 JSON 格式。
```

### 输出 Schema
```json
{
  "workplace": "Kent Ridge",
  "budget": 1500,
  "room_type": "common_room",
  "transport_mode": "mrt_only",
  "work_days_per_week": 3,
  "gym_per_week": 4,
  "lifestyle_signals": ["安静", "无车", "健身"],
  "must_haves": ["gym"],
  "nice_to_haves": ["near-nature", "hawker-nearby"],
  "raw_priorities": {
    "commute": "high",
    "budget": "medium",
    "gym": "high",
    "food": "medium",
    "quietness": "high"
  }
}
```

### 降级策略
如果 LLM 调用失败（超时/API 故障），降级到正则提取保证服务可用。

### TODO
- [ ] 配置 OpenAI API key（环境变量 `OPENAI_API_KEY`）
- [ ] 写 system prompt，强制输出 JSON schema（用 `response_format: { type: "json_object" }`）
- [ ] 实现正则降级 parser（预算、workplace、gym 频率、hybrid 天数）
- [ ] 处理 workplace 名称对齐：用户可能说 "NUS"，需映射为 "Kent Ridge"（维护一个别名表）

### 验证
- 用 5 条测试输入覆盖：中文、英文、中英混合、极简输入（"1500 kent ridge"）、只说预算没说 workplace
- 检查未提及的字段是否返回 `null`（不猜测）
- 检查 workplace 别名映射：输入 "NUS" → 输出 `"workplace": "Kent Ridge"`
- 模拟 API 失败，验证降级 parser 正常触发且输出格式一致

---

## Agent 2 — 认知偏差纠正 Agent（Debias Layer）

**目标**：这是本项目相比普通推荐系统的核心差异。主动检测并纠正人类在选房决策中普遍存在的认知偏差，生成"去偏后的偏好对象"和"偏差警告列表"。

**设计参考**：ARGUS 项目中 eWOM Agent 的欺骗折扣机制（deception discount）和 Value Agent 的市场价格参照机制，思路相同——内部纠正偏差，外部告知用户。

### 需要纠正的 6 种认知偏差

---

#### 偏差 1：租金锚定偏差（Rent Anchoring Bias）
**人类行为**：只看月租，忽视每月实际交通支出。

**纠正逻辑**：
```
monthly_transport_cost = commute_minutes * 2 * work_days_per_week * 4.33 * trip_fare_sgd / 60
                         （取目标社区到 workplace 的单程票价估算）

true_monthly_cost = rent_typical + monthly_transport_cost
```

**输出字段**：每个社区附加 `true_monthly_cost`，比较时以此为准而非裸月租。

**对用户的警告**（当偏差显著时输出）：
```
"⚠️ 锚定提示：Jurong East 月租 $1,100 看起来便宜，但每月交通费约 $180，
 实际月成本 $1,280 vs Queenstown 的 $1,250（含交通费）。两者相差不大。"
```

---

#### 偏差 2：通勤时间货币化缺失（Time Value Blindness）
**人类行为**：把"每天多20分钟"当成可以接受的小事，不换算成年度时间成本。

**纠正逻辑**：
```
annual_commute_hours = commute_minutes * 2 * work_days_per_week * 52 / 60
annual_commute_cost_hours_vs_runner_up = annual_hours_winner - annual_hours_runner_up
```

**警告触发条件**：两个选项年度通勤时差 > 50 小时时强制展示。

**对用户的警告**：
```
"⏱ 时间成本：选 Jurong East 省了 $350/月，但每年多花 230 小时通勤。
 按你的时薪估算，这相当于多付了 $X。"
```

---

#### 偏差 3：健身意图-行动落差（Gym Intention-Action Gap）
**人类行为**：说每周去 4 次健身房，但如果最近的健身房步行 25 分钟，实际坚持概率很低。

**纠正逻辑**：
```
如果 gym_per_week >= 3 且 nearest_gym_walk_minutes > 15：
  → 降低该社区的 gym_score（惩罚系数：walk_minutes / 15，上限 2x 惩罚）
  → 触发警告
```

**对用户的警告**：
```
"🏋️ 健身摩擦警告：Clementi 的健身房步行 22 分钟。
 你说每周去 4 次——每次额外 44 分钟路程，坚持难度较高。"
```

---

#### 偏差 4：Hybrid 工作者的通勤过度权重（Hybrid Commute Overweight）
**人类行为**：搜索时默认按 5 天/周通勤计算，但 hybrid 工作者实际只需通勤 3 天。

**纠正逻辑**：
```
如果 work_days_per_week <= 3：
  → 在权重推导中降低 commute 维度权重（从 0.30 → 0.20）
  → 对应提升 food / quietness / gym 权重
  → 触发提示
```

**对用户的提示**：
```
"💡 Hybrid 模式：你每周只通勤 3 天，通勤权重已自动下调。
 生活便利性和环境品质对你更重要。"
```

---

#### 偏差 5：知名社区溢价盲区（Popular Area Premium Blindness）
**人类行为**：倾向于选择"听说过的好地方"（如 Tiong Bahru、Holland Village），但这些地方往往比同等配套的社区贵 20-40%。

**纠正逻辑**：
```
如果某社区属于 "premium" 标签且 rent_typical > user_budget * 0.95：
  → 标记为 "popularity_premium_detected"
  → 在报告中列出同等得分但租金更低的替代社区
```

**对用户的提示**：
```
"✨ 溢价提示：Tiong Bahru 因生活方式口碑溢价约 $300/月。
 Queenstown 各项配套得分相当，租金低 $280。"
```

---

#### 偏差 6：预算舒适度幻觉（Budget Comfort Illusion）
**人类行为**："租金在预算内"就感觉安全，但如果只差 $50 就超出预算，缓冲极小。

**纠正逻辑**：
```
budget_headroom = user_budget - rent_typical
budget_comfort_level = "tight"   if budget_headroom < 100
                     = "ok"      if 100 <= budget_headroom < 300
                     = "comfortable" if budget_headroom >= 300
```

**对用户的提示**（当 tight 时）：
```
"⚠️ 预算余量：该房源典型租金 $1,480，距你预算仅 $20 缓冲。
 租金波动或押金可能导致超支。"
```

---

### Agent 2 输出

在原有偏好对象基础上，增加以下字段：

```json
{
  "debias_adjustments": {
    "effective_work_days": 3,
    "commute_weight_adjusted": true,
    "gym_friction_threshold": 15
  },
  "bias_warnings": [
    {
      "type": "rent_anchoring",
      "severity": "high",
      "message": "Jurong East 实际月成本 $1,280（含交通），非裸租 $1,100"
    },
    {
      "type": "hybrid_commute_overweight",
      "severity": "medium",
      "message": "Hybrid 模式已下调通勤权重，生活质量维度权重上升"
    }
  ]
}
```

### TODO
- [ ] 每种偏差写成独立函数：`detectRentAnchoring()`、`detectGymFriction()`、`detectHybridOverweight()`、`detectPopularityPremium()`、`detectBudgetComfortIllusion()`、`detectTimeValueBlindness()`
- [ ] `true_monthly_cost` 计算：需要从 neighbourhoods 数据里提前查 `commute[workplace].cost_sgd`（Agent 2 需要拿到社区数据作为输入）
- [ ] Hybrid 权重调整后做归一化，确保 5 个维度权重之和仍为 1.0
- [ ] 为每条 bias_warning 定义触发阈值常量（便于后期调参）：
  ```
  RENT_ANCHORING_MIN_DIFF = 50       // 实际月成本差 > $50 才触发
  TIME_VALUE_MIN_HOURS = 50          // 年通勤时差 > 50 小时才触发
  GYM_FRICTION_WALK_LIMIT = 15       // 步行 > 15 分钟触发摩擦惩罚
  BUDGET_TIGHT_THRESHOLD = 100       // 余量 < $100 触发提示
  PREMIUM_RENT_RATIO = 0.95          // 租金 > 预算 95% 触发溢价检测
  ```

### 验证
- 关键 spot check（用 Project-ideas.md 的示例）：Kent Ridge 上班、预算 $1500、hybrid 3天
  - Jurong East 裸租 $1,100 → true_monthly_cost 应 ≈ $1,280（加交通费）
  - Queenstown true_monthly_cost 应 ≈ $1,250 → 两者差 $30，触发 rent_anchoring 警告
  - hybrid 模式触发，commute 权重从 0.30 → 0.20
- 验证权重调整后仍然 sum = 1.0（写一个 assertion）
- 验证 gym 摩擦：步行 22 分钟 → friction_penalty = (22-15)/15 * 2 = 0.93，gym_score 下降
- 验证 bias_warnings 在阈值以下时不触发（不要误报）

---

## Agent 3 — 社区评分 Agent

**目标**：对每个社区按去偏后的权重进行多维打分，输出 0–100 综合分。

### 权重推导（去偏后）

**基础推导规则**（从 Agent 1 的 raw_priorities 出发）：

| 信号 | 权重调整 |
|---|---|
| gym_per_week ≥ 4 | gym → 0.25 |
| lifestyle_signals 包含"安静" | quietness → 0.20 |
| budget 信号为 "high" | budget → 0.30 |
| commute 信号为 "high" | commute → 0.35 |
| food 信号为 "high" | food → 0.25 |
| work_days_per_week ≤ 3（Hybrid，来自 Agent 2 纠正） | commute → 最大 0.20 |

权重归一化：所有调整后的值之和缩放为 1.0。

**默认权重**：
```
commute:   0.30
budget:    0.25
gym:       0.15
food:      0.15
quietness: 0.15
```

### 各维度评分公式

**预算评分**（使用 true_monthly_cost，非裸月租）：
```
budget_score = max(0, 10 - max(0, true_monthly_cost - user_budget) / 100)
```

**通勤评分**：
```
commute_score = max(0, 10 - commute_minutes / 6)
```

**健身评分**（含健身摩擦惩罚，来自 Agent 2）：
```
raw_gym_score = neighbourhood.gyms.score + (0.5 if activesg_gym else 0)
friction_penalty = max(0, (nearest_gym_walk_minutes - 15) / 15) * 2  # 超 15 分钟开始扣分
gym_score = max(0, min(10, raw_gym_score - friction_penalty))
```

**饮食评分**：
```
food_score = neighbourhood.food.score
```

**安静评分**：
```
quietness_score = neighbourhood.environment.quietness_score
```

**综合分**：
```
total = (
  budget_score   * weights.budget   +
  commute_score  * weights.commute  +
  gym_score      * weights.gym      +
  food_score     * weights.food     +
  quietness_score * weights.quietness
) * 10   → 结果 0–100，降序排列
```

### TODO
- [ ] 加载 `neighbourhoods.json`，做一次 schema 校验（必须字段是否存在、是否为 null）
- [ ] 实现 workplace 不在 commute 表时的降级：commute_score = 5（中位数），并在 warnings 里提示"未找到该 workplace 的通勤数据"
- [ ] 权重推导写成纯函数 `deriveWeights(preferences, debiasAdjustments)` → 返回归一化权重对象
- [ ] 每个维度评分函数独立：`scoreBudget()`、`scoreCommute()`、`scoreGym()`、`scoreFood()`、`scoreQuietness()`

### 验证
- **黄金测试用例**（每次改动后必跑）：Kent Ridge 上班、预算 $1500、gym 4次/周 → Queenstown 综合分应高于 Jurong East
- 验证所有社区分数在 0–100 范围内（不能出现负数或超 100）
- 验证社区排序是降序（最高分在前）
- 边界测试：预算极低（$600）→ 所有社区 budget_score 应接近 0，但其他维度正常打分
- 边界测试：workplace 输入 "NUS"（别名）→ 确认映射为 "Kent Ridge" 后正常评分

---

## Agent 4 — 房源筛选 & 排序 Agent

**目标**：在 Top 2–3 社区中筛选具体房源，按用户需求排序，输出房源级别推荐。

### 输入
- Agent 3 输出：社区排名（取 Top 3）
- 队友提供的 `rooms.json`（房源列表，每个房源关联 `neighbourhood_id`）
- 用户偏好：must_haves、budget、room_type

### 房源筛选规则（硬过滤）
```
1. neighbourhood_id 在 Top 3 社区中
2. rent <= user_budget（必须）
3. room_type 匹配（common_room / master_room）
4. must_haves 全部满足（如需要健身房 → has_gym_nearby = true）
```

### 房源排序（软评分）
在通过硬过滤的房源中，用以下加权排序：
```
room_score = neighbourhood_score * 0.60   # 社区得分权重最高
           + budget_headroom_score * 0.20  # 预算余量
           + feature_match_score * 0.20    # 房源特有功能匹配（aircon, 私浴等）

feature_match_score = Σ(matched_nice_to_have) / total_nice_to_haves * 10
```

### 输出
最多返回 5 个房源，每个附带：
- 所属社区名称和社区综合分
- 房源月租 + true_monthly_cost
- 功能匹配情况（aircon、wifi、cooking、private_bath）
- room_score（0–100）

### TODO
- [ ] 加载 `listings.json`，按 `neighbourhood_id` 建索引（Map 结构），避免每次全量遍历
- [ ] 硬过滤顺序：先按 neighbourhood_id（最快过滤），再按 rent，再按 room_type，最后 must_haves
- [ ] 处理"0 个房源通过过滤"的情况：返回空数组 + 提示 "当前预算或条件在该社区暂无匹配房源，建议放宽预算 $X"
- [ ] `feature_match_score` 只基于 nice_to_haves（非 must_haves），must_haves 已在硬过滤阶段处理
- [ ] 将 `true_monthly_cost` 挂到每个房源对象上（用房源实际租金重新算，而非社区典型值）

### 验证
- 验证硬过滤：插入一条租金 $2000 的房源，预算 $1500 → 该房源不应出现在结果中
- 验证 room_type 过滤：查 common_room → master_room 不出现
- 验证"0 结果"降级提示正常触发
- 验证 neighbourhood_score 在 room_score 中权重 0.60（同等配套的房源，社区更好的排前面）
- 验证最多返回 5 条（即使有 50 条通过过滤）

---

## Agent 5 — 权衡分析 Agent

**目标**：比较 Top 2 候选（社区/房源），生成具体可量化的得失清单。

**设计参考**：ARGUS 的 Decision Agent——tie margin 机制（差距太小不强行推荐）+ 偏差警告透传。

### 得失判断规则

| 条件 | 输出 |
|---|---|
| annual_hours_saved > 50 | 得：每年节省 X 小时通勤 |
| true_cost_winner > true_cost_runner_up | 失：实际月成本高 S$X（含交通费） |
| gym_score 差 > 1.5（含摩擦惩罚后） | 得/失：健身配套差异 |
| mrt_walk 差 > 3 分钟 | 得：MRT 更近 X 分钟 |
| food_score 差 > 1 | 得：饮食选择更丰富 |
| quietness 差 > 1 | 失：环境相对较吵 |
| budget_headroom 差 > $200 | 得：预算余量更充裕 |

**Tie 机制**（参考 ARGUS）：
```
如果 |winner_score - runner_up_score| <= 5：
  → verdict = "相近选择，根据个人偏好决定"
  → 不强制推荐
```

### 输出
```json
{
  "winner": "Queenstown - Room A",
  "runner_up": "Clementi - Room B",
  "verdict": "recommend_winner",
  "gains": ["每年节省 230 小时通勤", "健身房步行 7 分钟（无摩擦）"],
  "losses": ["实际月成本高 S$120（含交通费）"],
  "annual_commute_hours_saved": 230,
  "true_cost_difference": 120,
  "confidence": "high"
}
```

### TODO
- [ ] 每个得失条件写成独立判断函数，返回 `{ type, direction, message }` 对象
- [ ] `annual_commute_hours_saved` 统一用公式 `(minutes * 2 * work_days * 52) / 60` 计算，确保与 Agent 2 一致（抽成共享工具函数）
- [ ] Tie 机制实现：score 差 ≤ 5 时设 `verdict = "too_close_to_call"`，`confidence = "low"`
- [ ] gains/losses 各自至少要有 1 条（即使两者非常接近），保证报告不空

### 验证
- 手算验证：Queenstown 10 分钟 vs Jurong East 35 分钟，5天/周 → 年差 = (35-10)*2*5*52/60 = **216.7 小时**（≈ 217 小时，确认代码输出匹配）
- Tie 测试：两个社区综合分差 3 分 → verdict 应为 "too_close_to_call"
- 验证 true_cost_difference 正负方向正确（winner 贵时为正，便宜时为负）
- 验证 gains 和 losses 都不能同时为空

---

## Agent 6 — 未来生活模拟 Agent

**目标**：生成住在推荐房源的真实感工作日预览，让用户从"比较数据"变成"想象自己住在那里"。

### 生成规则

| 时间段 | 事件 | 数据来源 |
|---|---|---|
| 早上出发 | 假设 9 点到达工作地，向前推算 | `commute.minutes` |
| 早上到达 | 出发 + 通勤分钟数 | — |
| 午饭 | 有熟食中心 → 熟食，否则餐厅 | `food.hawker_centres` |
| 傍晚健身 | gym_per_week ≥ 3 时出现 | `gyms.nearest_gym_walk_minutes` |
| 晚饭 | 健身后或下班后 | `food` 数据 |
| 到家 | 根据日程推算 | — |

结尾附上：
```
今日通勤：XX 分钟
vs 次选方案每天节省 XX 分钟 → 全年节省 XXX 小时
```

### TODO
- [ ] 实现时间推算函数：`departureTime = "09:00" - commute_minutes`（注意分钟跨小时处理）
- [ ] 健身日程表：3次/周 → `["Monday", "Wednesday", "Friday"]`，4次/周 → 加 `"Saturday"`
- [ ] 午饭事件：`hawker_centres > 0` → "在附近熟食中心吃午饭（步行 X 分钟）"，否则 → "在附近餐厅吃午饭"
- [ ] 结尾 summary 行：调用共享工具函数 `calcAnnualHours()` 保持与 Agent 5 数字一致

### 验证
- 通勤 10 分钟 → 出发时间应为 08:50
- 通勤 45 分钟 → 出发时间应为 08:15
- gym_per_week = 4 → 健身出现在 Mon/Wed/Fri/Sat，不出现在 Tue/Thu
- gym_per_week = 0 → 没有健身事件，晚饭直接在下班后
- 验证结尾 summary 的小时数与 Agent 5 的 `annual_commute_hours_saved` 完全一致（同一个函数算出来）

---

## 报告生成器

### 最终输出 Schema
```json
{
  "recommendation": {
    "room_id": "qst_001",
    "room_name": "Queenstown Common Room @ Stirling Road",
    "neighbourhood": "Queenstown",
    "score": 87,
    "headline": "Queenstown 每年为你节省 230 小时通勤，实际月成本 $1,250（含交通）。",
    "why": [
      "到 Kent Ridge 仅需 10 分钟（Jurong East 需 35 分钟）",
      "ActiveSG 健身房步行 7 分钟，匹配你每周 4 次的计划",
      "实际月成本 $1,250 vs Jurong East 的 $1,280（含交通费）"
    ]
  },
  "bias_warnings": [
    { "type": "rent_anchoring", "message": "Jurong East 裸租看起来便宜 $200，但加上交通费实际相差不大" }
  ],
  "tradeoffs": { ... },
  "lifestyle_simulation": "星期一\n\n08:15 出门...",
  "all_rooms": [ ... ],
  "weights_used": { "commute": 0.30, "budget": 0.20, "gym": 0.20, "food": 0.15, "quietness": 0.15 }
}
```

### 标题生成优先级
1. annual_hours_saved > 100 → 以通勤节省为标题
2. bias_warnings 中有 rent_anchoring → 标题中点明真实成本
3. gym_friction 被纠正 → 标题中提健身配套
4. 默认 → "X 是你在通勤、预算和生活方式上的最佳选择。"

### TODO
- [ ] 实现 `buildHeadline(recommendation, tradeoffs, biasWarnings)` 按优先级返回标题字符串
- [ ] `why` 列表从各 Agent 输出中提取最显著的 3 条，优先级：通勤节省 > 健身配套 > 饮食 > 预算余量
- [ ] 确保 `bias_warnings` 从 Agent 2 直接透传，不重复生成
- [ ] 确保 `all_rooms` 包含所有通过 Agent 4 硬过滤的房源（不只是 Top 1），让前端展示完整列表

### 验证
- 端到端 golden test：输入 `"我在 Kent Ridge 上班，预算 1500，每周健身 4 次，hybrid 3 天"` → 输出 JSON 必须包含：
  - `recommendation.neighbourhood` = "Queenstown"（或 Clementi，取决于数据）
  - `bias_warnings` 至少含 `rent_anchoring` 和 `hybrid_commute_overweight`
  - `lifestyle_simulation` 包含 08:xx 出发时间
  - `tradeoffs.annual_commute_hours_saved` > 0
- 验证 `weights_used` 字段与实际计算权重完全一致（对外展示和内部计算同一套）

---

## Next Step — Adaptive What-if Agent（冠军版改造）

**目标**：把当前 `recommend()` 从一次性推荐升级成可持续对话的 relocation decision agent。评委需要看到 Dolphine 不是 property filter，而是在模拟用户未来生活，并能根据用户反馈即时重新推理。

这个 Agent 不替代前面的 6 个 Agent，而是包在外层做 orchestration：

```text
用户输入
  ↓
检查信息完整度
  ↓
缺关键字段 → 主动追问
  ↓
信息足够 → 调用现有 6-Agent pipeline
  ↓
输出推荐报告
  ↓
用户提出 what-if / 反驳 / 新偏好
  ↓
更新约束或权重
  ↓
重新执行评分、排序、tradeoff、生活模拟
  ↓
解释排名为什么改变
```

### 必须支持的互动场景

| 用户输入 | 系统行为 |
|---|---|
| "我更想省钱" | 提高 budget 权重，必要时把 budget 变成硬约束，重新排序 |
| "我不想每天 MRT 太久" | 提高 commute 权重，重新计算年度通勤负担 |
| "这个推荐太贵了" | 找更低 true_monthly_cost 的次优方案，并解释牺牲项 |
| "我每周健身 5 次" | 提高 gym 权重，更新 gym friction 和生活模拟 |
| "我其实一周只去公司 2 天" | 降低 commute 权重，重新计算 annual_hours |
| "为什么不是 Jurong East?" | 生成 winner vs Jurong East 的针对性 tradeoff |

### 缺失信息追问规则

| 缺失字段 | 追问方式 |
|---|---|
| workplace | "你主要去哪里上班/上课？可以填 Kent Ridge、Raffles Place、One-North 等。" |
| budget | "你的月租预算大概是多少？例如 S$1,200–S$1,800。" |
| room_type | 默认 `common_room`，同时在报告中标注假设 |
| work_days_per_week | 默认 5 天，但提示 hybrid 会显著影响通勤权重 |
| lifestyle_signals | 使用默认权重，并提示可补充健身、安静、饮食、自然等偏好 |

### What-if Reranking 输出 Schema

```json
{
  "mode": "what_if_rerank",
  "user_message": "我更想省钱",
  "updated_constraints": {
    "budget_is_hard_limit": true
  },
  "changed_weights": {
    "budget": { "from": 0.20, "to": 0.35 },
    "commute": { "from": 0.30, "to": 0.25 }
  },
  "ranking_change": [
    {
      "room_id": "cle_002",
      "previous_rank": 2,
      "new_rank": 1,
      "reason": "实际月成本更低，且通勤仍在可接受范围内"
    },
    {
      "room_id": "qst_001",
      "previous_rank": 1,
      "new_rank": 2,
      "reason": "通勤更短，但预算压力更高"
    }
  ],
  "updated_report": { "...": "同最终输出 Schema" }
}
```

### 冠军 Demo 必须呈现

1. 自然语言输入 → 结构化偏好与权重
2. Debias Agent 揭示隐藏生活成本
3. 首次推荐展示年度通勤小时、真实月成本、生活模拟
4. 用户一句 what-if → 即时重新排序
5. 系统解释"为什么排名变了"

### 对应比赛方向

| Build Direction | Dolphine 的冠军表达 |
|---|---|
| Autonomous & Adaptive AI | 主动追问缺失信息，并根据用户反馈自适应重算 |
| AI-Native Products & Operations | 不只是查房，而是生成未来生活模拟和决策解释 |
| Deep Domain AI | 内建新加坡租房、MRT、hawker、ActiveSG、hybrid 通勤等本地知识 |

---

## API 接口约定

```
POST /api/recommend
```

**请求体：**
```json
{
  "user_input": "我在 Kent Ridge 上班，预算 1500，不开车，每周健身 4 次，喜欢安静，hybrid 工作 3 天"
}
```

**响应**：上方报告 Schema。

---

## OpenAI API Key 配置

**绝对不要把 API key 写进任何代码文件或文档。** key 一旦进入 git 历史就永远泄露。

### 正确做法：.env 文件

在项目根目录创建 `.env`（已在 `.gitignore` 中，不会被提交）：

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx
```

代码中读取：
```js
// backend/algorithm/preferenceAgent.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

启动时加载（在 `backend/server.js` 顶部）：
```js
import "dotenv/config";
```

安装 dotenv：
```bash
cd backend && npm install dotenv openai
```

### 验证 key 有效
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```
返回 model 列表说明 key 有效。

---

## 文件结构

```
backend/
  data/
    neighbourhoods.json       ← 队友提供（社区数据）
    listings.json             ← 市场房源数据
  algorithm/
    preferenceAgent.js        ← Agent 1：LLM 解析偏好
    debiasAgent.js            ← Agent 2：认知偏差纠正（核心差异化）
    neighbourhoodScorer.js    ← Agent 3：社区评分
    roomRanker.js             ← Agent 4：房源筛选 & 排序
    tradeoffAnalyser.js       ← Agent 5：权衡分析
    lifeSimulator.js          ← Agent 6：生活模拟
    reportBuilder.js          ← 报告组装
    utils.js                  ← 共享工具函数（calcAnnualHours 等）
    index.js                  ← 串联所有 Agent，导出 recommend()
.env                          ← OPENAI_API_KEY=sk-... （不进 git）
```

---

## 设计哲学总结（来自 ARGUS）

| 原则 | 在 Dolphine 中的体现 |
|---|---|
| 每个 Agent 只管一个维度 | 6 个 Agent 职责清晰，可独立测试 |
| 内部 System 2，外部 System 1 | 算法内部多维推理，用户看到一句话结论 |
| 主动去偏而非被动展示 | Debias Agent 主动纠正 6 种认知偏差 |
| 置信度驱动，不强行决策 | Tie 机制，数据不足时返回 "相近选择" |
| 可审计 | bias_warnings 字段明确列出哪些偏差被纠正 |
