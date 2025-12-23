# 茶湯匯 Backend API 文檔

## 基礎資訊

- Base URL: `http://localhost:3001/api` (開發環境)
- Content-Type: `application/json`
- 所有時間格式: ISO 8601 (例如: `2025-01-20T10:30:00.000Z`)

---

## 公開 API

### Profiles（個人資料）

#### GET /api/profiles
取得所有個人資料列表

**回應範例:**
```json
[
  {
    "id": "1",
    "name": "小愛",
    "nationality": "🇹🇼",
    "age": 23,
    "height": 165,
    "weight": 48,
    "cup": "D",
    "location": "台北市",
    "district": "大安區",
    "type": "outcall",
    "imageUrl": "https://...",
    "gallery": ["https://..."],
    "price": 6000,
    "prices": {
      "oneShot": { "price": 6000, "desc": "一節/50min/1S" },
      "twoShot": { "price": 11000, "desc": "兩節/100min/2S" }
    },
    "tags": ["氣質高雅"],
    "basicServices": ["聊天", "按摩"],
    "addonServices": [],
    "isNew": true,
    "isAvailable": true,
    "availableTimes": {
      "today": "14:00~02:00",
      "tomorrow": "14:00~02:00"
    }
  }
]
```

#### GET /api/profiles/:id
取得特定個人資料

#### POST /api/profiles
建立新個人資料（需要完整資料）

#### PUT /api/profiles/:id
更新個人資料

#### DELETE /api/profiles/:id
刪除個人資料

---

### Articles（文章）

#### GET /api/articles
取得所有文章列表

**回應範例:**
```json
[
  {
    "id": "1",
    "title": "為什麼選擇 茶湯匯？",
    "summary": "在繁忙的都市生活中...",
    "imageUrl": "https://...",
    "tag": "高端服務",
    "date": "2025-12-15",
    "views": 1205,
    "content": "茶湯匯致力於..."
  }
]
```

#### GET /api/articles/:id
取得特定文章（會自動增加瀏覽次數）

#### POST /api/articles
建立新文章

#### PUT /api/articles/:id
更新文章

#### DELETE /api/articles/:id
刪除文章

---

### Gemini AI

#### POST /api/gemini/parse-profile
從文案解析個人資料

**請求:**
```json
{
  "text": "小愛，23歲，165cm，48kg，D罩杯，台北市大安區，外送，6000元..."
}
```

**回應:**
```json
{
  "name": "小愛",
  "age": 23,
  "height": 165,
  "weight": 48,
  "cup": "D",
  "location": "台北市",
  "district": "大安區",
  "type": "outcall",
  "price": 6000,
  "nationality": "🇹🇼",
  "basicServices": ["聊天", "按摩"],
  "addonServices": ["毒龍+2000"],
  "tags": ["氣質高雅"],
  "prices": {
    "oneShot": { "price": 6000, "desc": "一節/50min/1S" },
    "twoShot": { "price": 11000, "desc": "兩節/100min/2S" }
  }
}
```

#### POST /api/gemini/analyze-name
分析名字

**請求:**
```json
{
  "name1": "小愛",
  "mode": "PERSONALITY"
}
```

**回應:**
```json
{
  "score": 85,
  "title": "溫柔優雅",
  "description": "...",
  "luckyColor": "粉紅色",
  "luckyItem": "玫瑰",
  "keywords": ["溫柔", "優雅"],
  "stats": [
    { "subject": "魅力", "A": 85, "fullMark": 100 }
  ],
  "poem": "..."
}
```

---

## 後台管理 API

### 統計資訊

#### GET /api/admin/stats
取得後台統計資訊

**回應範例:**
```json
{
  "profiles": {
    "total": 10,
    "available": 8,
    "unavailable": 2,
    "new": 3,
    "byType": {
      "outcall": 6,
      "incall": 4
    },
    "byLocation": {
      "台北市": 5,
      "台中市": 3,
      "高雄市": 2
    }
  },
  "articles": {
    "total": 7,
    "totalViews": 35000,
    "byTag": {
      "新手必看": 2,
      "防雷專區": 1,
      "老司機心得": 4
    }
  },
  "updatedAt": "2025-01-20T10:30:00.000Z"
}
```

---

### Profile 管理

#### GET /api/admin/profiles
取得所有 profiles（管理用）

#### GET /api/admin/profiles/:id
取得單一 profile

#### POST /api/admin/profiles
上架新茶

**請求範例:**
```json
{
  "name": "小愛",
  "nationality": "🇹🇼",
  "age": 23,
  "height": 165,
  "weight": 48,
  "cup": "D",
  "location": "台北市",
  "district": "大安區",
  "type": "outcall",
  "imageUrl": "https://...",
  "gallery": ["https://..."],
  "price": 6000,
  "prices": {
    "oneShot": { "price": 6000, "desc": "一節/50min/1S" },
    "twoShot": { "price": 11000, "desc": "兩節/100min/2S" }
  },
  "tags": ["氣質高雅"],
  "basicServices": ["聊天", "按摩"],
  "addonServices": [],
  "isNew": true,
  "isAvailable": true,
  "availableTimes": {
    "today": "14:00~02:00",
    "tomorrow": "14:00~02:00"
  }
}
```

#### PUT /api/admin/profiles/:id
編輯茶茶（完整更新）

#### PATCH /api/admin/profiles/:id
部分更新（例如只更新可用狀態）

**請求範例:**
```json
{
  "isAvailable": false
}
```

#### DELETE /api/admin/profiles/:id
下架茶茶

#### POST /api/admin/profiles/batch
批量操作

**請求範例 - 批量刪除:**
```json
{
  "action": "delete",
  "ids": ["1", "2", "3"]
}
```

**請求範例 - 批量更新:**
```json
{
  "action": "update",
  "ids": ["1", "2"],
  "data": {
    "isAvailable": false
  }
}
```

**請求範例 - 批量切換可用狀態:**
```json
{
  "action": "toggle-availability",
  "ids": ["1", "2", "3"]
}
```

---

### Article 管理

#### GET /api/admin/articles
取得所有 articles（管理用）

#### GET /api/admin/articles/:id
取得單一 article

#### POST /api/admin/articles
發布新文章

**請求範例:**
```json
{
  "title": "2025 喝茶攻略",
  "summary": "對新手來說，最大的問題只有一個...",
  "imageUrl": "https://...",
  "tag": "新手必看",
  "date": "2025-01-20",
  "content": "對新手來說，最大的問題只有一個..."
}
```

#### PUT /api/admin/articles/:id
編輯文章

#### DELETE /api/admin/articles/:id
刪除文章

#### POST /api/admin/articles/batch
批量操作

**請求範例:**
```json
{
  "action": "delete",
  "ids": ["1", "2"]
}
```

---

## n8n 整合範例

### 使用 Webhook 接收新茶上架通知

在 n8n 中設定 HTTP Request 節點：

**URL:** `POST https://your-api.com/api/admin/profiles`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "name": "{{ $json.name }}",
  "nationality": "{{ $json.nationality }}",
  "age": {{ $json.age }},
  "height": {{ $json.height }},
  "weight": {{ $json.weight }},
  "cup": "{{ $json.cup }}",
  "location": "{{ $json.location }}",
  "type": "{{ $json.type }}",
  "price": {{ $json.price }},
  "imageUrl": "{{ $json.imageUrl }}"
}
```

### 使用 Webhook 接收新文章發布

**URL:** `POST https://your-api.com/api/admin/articles`

**Body:**
```json
{
  "title": "{{ $json.title }}",
  "summary": "{{ $json.summary }}",
  "imageUrl": "{{ $json.imageUrl }}",
  "tag": "{{ $json.tag }}",
  "content": "{{ $json.content }}"
}
```

### 定期同步資料

使用 n8n 的 Schedule Trigger 定期呼叫：

**URL:** `GET https://your-api.com/api/admin/stats`

---

## 錯誤處理

所有錯誤回應格式：

```json
{
  "error": "錯誤訊息"
}
```

常見 HTTP 狀態碼：
- `200` - 成功
- `201` - 建立成功
- `204` - 刪除成功（無內容）
- `400` - 請求錯誤（缺少必要欄位）
- `404` - 資源不存在
- `500` - 伺服器錯誤

---

## 注意事項

1. 所有日期格式使用 ISO 8601
2. 圖片 URL 可以是 base64 編碼或 HTTP URL
3. 批量操作建議一次不超過 100 筆
4. Gemini API 需要設定 `GEMINI_API_KEY` 環境變數
5. 資料庫會自動建立，無需手動初始化（首次啟動時）

