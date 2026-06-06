# 数据集输入要求

本文档定义算法层所需的全部数据输入。分两部分：
1. **社区智能数据**（neighbourhood intelligence）— 队友手工整理
2. **市场房源数据**（market listings）— 来自真实市场（如 PropertyGuru、99.co 等），量级可能是几百到几千条

算法层不关心数据怎么来、谁来提供，只关心拿到的数据符合以下 schema。

---

## 数据架构总览

```
市场房源数据（rooms）          社区智能数据（neighbourhoods）
[{ id, location, rent, ... }]    [{ id, commute, gym, food, ... }]
            ↓                                    ↓
    location → neighbourhood_id 映射表
            ↓
    算法层：join 两个数据集，进行评分、去偏、模拟
```

两个数据集通过 `neighbourhood_id` 关联。

---

## 第一部分：社区智能数据（neighbourhoods.json）

**由队友手工整理，存于 `backend/data/neighbourhoods.json`**

### 顶层结构

```json
[
  { ...社区对象 },
  { ...社区对象 }
]
```

### 社区对象 Schema

```json
{
  "id": "queenstown",
  "name": "Queenstown",

  "rent_benchmark": {
    "common_room": { "min": 950, "max": 1300, "typical": 1100 },
    "master_room": { "min": 1400, "max": 1800, "typical": 1600 }
  },

  "mrt": {
    "nearest_station": "Queenstown MRT",
    "walk_minutes": 5,
    "lines": ["East-West Line"],
    "stations_within_10min": 2
  },

  "commute": {
    "Kent Ridge":    { "minutes": 10, "cost_sgd": 1.20 },
    "Raffles Place": { "minutes": 18, "cost_sgd": 1.60 },
    "Tanjong Pagar": { "minutes": 20, "cost_sgd": 1.60 },
    "Orchard":       { "minutes": 15, "cost_sgd": 1.40 },
    "Jurong East":   { "minutes": 25, "cost_sgd": 1.80 },
    "Paya Lebar":    { "minutes": 31, "cost_sgd": 2.00 },
    "Woodlands":     { "minutes": 45, "cost_sgd": 2.40 },
    "Tampines":      { "minutes": 40, "cost_sgd": 2.20 },
    "Changi":        { "minutes": 50, "cost_sgd": 2.60 },
    "Novena":        { "minutes": 22, "cost_sgd": 1.60 }
  },

  "food": {
    "score": 8,
    "hawker_centres": 2,
    "supermarkets": 1,
    "convenience_stores_24h": 2,
    "restaurants_cafes_count": "many"
  },

  "gyms": {
    "score": 8,
    "activesg_gym": true,
    "private_gyms_within_1km": 1,
    "nearest_gym_walk_minutes": 7
  },

  "parks": {
    "score": 7,
    "nearest_park": "Queenstown Park",
    "nearest_park_walk_minutes": 8,
    "has_large_park": false
  },

  "healthcare": {
    "score": 8,
    "nearest_clinic_walk_minutes": 5,
    "nearest_hospital": "Alexandra Hospital",
    "nearest_hospital_minutes": 10
  },

  "environment": {
    "quietness_score": 7,
    "noise_profile": "以住宅区为主，有少量道路噪音",
    "area_type": "residential"
  },

  "lifestyle_tags": ["mrt-accessible", "hawker-nearby", "gym-friendly", "family-area"]
}
```

### 字段说明

#### `rent_benchmark`（租金基准）
算法用这个做**真实月成本**计算和**社区级别**预算评分。
具体房源的租金来自市场数据（第二部分）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `common_room.min/max/typical` | 整数（新币/月） | 合租公寓普通卧室的市场租金范围 |
| `master_room.min/max/typical` | 整数（新币/月） | 合租公寓主卧的市场租金范围 |

#### `mrt`（地铁）
| 字段 | 类型 | 说明 |
|---|---|---|
| `nearest_station` | 字符串 | 最近地铁站全称 |
| `walk_minutes` | 整数 | 社区中心步行到地铁站的时间 |
| `lines` | 字符串数组 | 途经线路（英文全称，如 "East-West Line"） |
| `stations_within_10min` | 整数 | 步行 10 分钟内可达的站点数 |

#### `commute`（通勤时间表）
这是算法的核心输入之一。键名必须与用户可能输入的 workplace 名称完全匹配。

| 字段 | 类型 | 说明 |
|---|---|---|
| `minutes` | 整数 | 门到门公共交通全程时间（分钟），参考 Google Maps 非高峰时段 |
| `cost_sgd` | 浮点数 | 单程票价（新币），用于计算每月交通支出 |

**必须覆盖的 workplace 目标区域（最低要求）：**

| 区域 | 代表场所 |
|---|---|
| Kent Ridge | NUS、中央医院 |
| Raffles Place | CBD 核心 |
| Tanjong Pagar | 国际商业区 |
| Orchard | 零售/酒店业 |
| Jurong East | 裕廊科技园 |
| Paya Lebar | Paya Lebar Quarter |
| Woodlands | 新柔长堤/北部工业 |
| Tampines | 淡滨尼区域中心 |
| Changi | 樟宜机场/Loyang |
| Novena | 医疗城/Novena Square |

#### `food`（饮食配套）
| 字段 | 类型 | 说明 |
|---|---|---|
| `score` | 整数（0–10） | 综合饮食便利性评分 |
| `hawker_centres` | 整数 | 步行 15 分钟内熟食中心数量 |
| `supermarkets` | 整数 | 步行 15 分钟内超市数量 |
| `convenience_stores_24h` | 整数 | 步行 10 分钟内 24 小时便利店数量 |
| `restaurants_cafes_count` | 字符串 | `"few"` / `"some"` / `"many"` |

#### `gyms`（健身配套）
| 字段 | 类型 | 说明 |
|---|---|---|
| `score` | 整数（0–10） | 综合健身配套评分 |
| `activesg_gym` | 布尔值 | 步行 15 分钟内是否有 ActiveSG（每次 $2.50，算法中视为重要加分项） |
| `private_gyms_within_1km` | 整数 | 1 公里内商业健身房数量（Anytime Fitness、Fitness First 等） |
| `nearest_gym_walk_minutes` | 整数 | 步行到最近健身房的时间（算法用此计算健身摩擦惩罚） |

#### `parks`（公园绿化）
| 字段 | 类型 | 说明 |
|---|---|---|
| `score` | 整数（0–10） | 绿化和户外环境评分 |
| `nearest_park` | 字符串 | 最近公园或公园连道名称 |
| `nearest_park_walk_minutes` | 整数 | 步行时间 |
| `has_large_park` | 布尔值 | 是否有大型公园（宏茂桥公园、东海岸公园、碧山公园等级别） |

#### `healthcare`（医疗）
| 字段 | 类型 | 说明 |
|---|---|---|
| `score` | 整数（0–10） | 综合医疗便利性评分 |
| `nearest_clinic_walk_minutes` | 整数 | 步行到最近 GP 诊所/综合诊疗所的时间 |
| `nearest_hospital` | 字符串 | 最近医院名称 |
| `nearest_hospital_minutes` | 整数 | 公交到最近医院的时间 |

#### `environment`（环境）
| 字段 | 类型 | 说明 |
|---|---|---|
| `quietness_score` | 整数（0–10） | 10 = 非常安静住宅区，1 = 繁忙商业区 |
| `noise_profile` | 字符串 | 一句话描述（如"以住宅为主，早晨有巴刹噪音"） |
| `area_type` | 字符串 | `"residential"` / `"mixed"` / `"commercial"` / `"industrial-adjacent"` |

#### `lifestyle_tags`（生活标签）
用于匹配用户生活方式关键词。从以下标签集选用（可多选）：

`mrt-accessible` `hawker-nearby` `gym-friendly` `family-area` `quiet` `student-friendly` `near-nature` `nightlife` `pet-friendly` `expat-popular` `budget-friendly` `premium`

### 最低社区覆盖要求

| 区域 | 社区 |
|---|---|
| 中部 | Queenstown、Tiong Bahru、Toa Payoh、Bishan |
| 西部 | Clementi、Jurong East、Buona Vista |
| 东部 | Paya Lebar、Tampines、Bedok |
| 北部 | Woodlands、Yishun、Ang Mo Kio |
| 东北部 | Hougang、Punggol、Sengkang |

---

## 第二部分：市场房源数据（listings）

**来源：市场真实数据（PropertyGuru、99.co 等），量级不限。**

算法对房源数量无上限要求，内部会先做预过滤再排序，不会全量跑评分。

### 输入方式
以下任一格式均可，算法层会做统一 normalize：

- `backend/data/listings.json`（JSON 数组）
- `backend/data/listings.csv`（CSV，列名见下方）
- SQLite 表（表名 `listings`，列名见下方）

### 房源对象 Schema

```json
{
  "id": "pg_12345678",
  "source": "propertyguru",

  "location": {
    "neighbourhood_id": "queenstown",
    "address": "Stirling Road, Queenstown",
    "postal_code": "141xxx",
    "latitude": 1.2966,
    "longitude": 103.8062
  },

  "listing": {
    "room_type": "common_room",
    "rent": 1100,
    "lease_term_months": 12,
    "available_from": "2026-07-01"
  },

  "amenities": {
    "aircon": true,
    "wifi": true,
    "cooking": true,
    "private_bath": false,
    "furnished": true,
    "washing_machine": true
  },

  "property": {
    "type": "HDB",
    "floor_level": "mid",
    "facing": "north"
  },

  "media": {
    "image_url": "https://...",
    "listing_url": "https://..."
  },

  "metadata": {
    "posted_date": "2026-06-01",
    "agent_name": null,
    "is_direct_landlord": true
  }
}
```

### 字段说明

#### 必须字段（算法硬依赖，缺失则跳过该房源）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | 字符串 | 唯一标识符（可用平台 listing ID） |
| `location.neighbourhood_id` | 字符串 | 对应社区智能数据的 `id` 字段（见下方映射说明） |
| `listing.rent` | 整数 | 月租金（新币） |
| `listing.room_type` | 字符串 | `"common_room"` 或 `"master_room"` |

#### 强烈建议字段（影响房源排序得分）

| 字段 | 类型 | 说明 |
|---|---|---|
| `amenities.aircon` | 布尔值 | 有无空调 |
| `amenities.wifi` | 布尔值 | 是否含 WiFi |
| `amenities.cooking` | 布尔值 | 是否可煮食 |
| `amenities.private_bath` | 布尔值 | 是否独立浴室 |
| `listing.available_from` | 字符串（ISO 日期） | 可入住日期 |
| `media.image_url` | 字符串 | 前端展示用 |

#### 可选字段（有则用，无则忽略）

| 字段 | 类型 | 说明 |
|---|---|---|
| `amenities.furnished` | 布尔值 | 是否全套家具 |
| `amenities.washing_machine` | 布尔值 | 是否有洗衣机 |
| `property.type` | 字符串 | `"HDB"` / `"Condo"` / `"Landed"` |
| `property.floor_level` | 字符串 | `"low"` / `"mid"` / `"high"` |
| `metadata.is_direct_landlord` | 布尔值 | 直接房东还是中介 |
| `media.listing_url` | 字符串 | 原始平台链接 |

---

## 第三部分：neighbourhood_id 映射表

这是两个数据集之间的关键桥梁。市场房源的地址需要映射到社区 ID。

### 映射策略（按优先级）

**方案 A（推荐）：平台数据本身带区域标签**
如果市场数据里已经有"区域"或"规划区"字段，直接用字符串映射。

```json
{
  "Queenstown": "queenstown",
  "Tiong Bahru": "tiong_bahru",
  "Clementi": "clementi",
  "Jurong East": "jurong_east",
  "Buona Vista": "buona_vista",
  "Paya Lebar": "paya_lebar",
  "Bedok": "bedok",
  "Tampines": "tampines",
  "Woodlands": "woodlands",
  "Yishun": "yishun",
  "Ang Mo Kio": "ang_mo_kio",
  "Toa Payoh": "toa_payoh",
  "Bishan": "bishan",
  "Hougang": "hougang",
  "Punggol": "punggol",
  "Sengkang": "sengkang"
}
```

**方案 B：通过邮政编码映射**
新加坡邮政编码前两位对应大区，可用邮政编码区间粗粒度映射。提供一个 `postal_to_neighbourhood.json` 映射表。

**方案 C（后备）：经纬度 + 简单半径匹配**
每个社区有一个中心坐标，房源坐标落在哪个社区 2km 半径内就归属那个社区。精度够用于 hackathon。

```json
{
  "queenstown": { "lat": 1.2966, "lng": 103.8062, "radius_km": 1.5 },
  "tiong_bahru": { "lat": 1.2847, "lng": 103.8279, "radius_km": 1.2 },
  ...
}
```

**算法层要求**：
- 无论用哪个方案，映射结果都存入 `location.neighbourhood_id`
- 如果一个房源无法映射到任何社区（地点过于偏僻或数据缺失），标记为 `neighbourhood_id: null`，算法跳过

---

## 第四部分：大量房源的预过滤策略

当市场房源有几百甚至几千条时，算法采用**两阶段处理**，不全量跑评分。

### 阶段一：硬过滤（在算法评分前）

以下条件任意一项不满足，直接剔除，不进入评分队列：

```
1. listing.rent <= user_budget                         （预算硬上限）
2. listing.room_type == user_preference.room_type      （房型匹配）
3. location.neighbourhood_id != null                   （有效社区）
4. listing.available_from <= user_preferred_date       （可入住时间，如无此偏好则忽略）
```

预估过滤比例：一般可将候选池从几千条压缩到几十条。

### 阶段二：软排序（只对过滤后的候选房源）

对候选房源关联的社区打综合分（社区评分 Agent），再在同一社区内按房源特征排序：

```
room_score = neighbourhood_score * 0.60
           + budget_headroom_score * 0.20   # 租金离预算上限越远越好
           + feature_match_score * 0.20     # must_haves / nice_to_haves 匹配度
```

最终返回 Top 5 房源（跨多个社区）。

---

## 第五部分：数据质量要求

| 要求 | 说明 |
|---|---|
| **社区 ID 一致性** | `neighbourhoods.json` 和 `listings` 中的 `neighbourhood_id` 必须完全一致，算法用此做 join |
| **通勤目标区域一致性** | `commute` 的键名必须与用户可能输入的 workplace 名称匹配（大小写敏感） |
| **缺失字段用 null** | 不确定的字段填 `null`，不要猜测或省略键名 |
| **租金单位** | 统一为新币/月，不含水电 |
| **通勤时间** | 门到门公共交通，Google Maps 非高峰时段 |
| **评分范围** | 所有 score 字段为 **0–10 整数** |

---

## 文件路径总结

```
backend/
  data/
    neighbourhoods.json          ← 社区智能数据（队友手工整理）
    listings.json                ← 市场房源数据（来自市场，大量）
    postal_to_neighbourhood.json ← 邮编映射表（如用方案 B）
```
