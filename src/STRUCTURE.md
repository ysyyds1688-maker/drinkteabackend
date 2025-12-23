# 專案結構說明

## 📦 專案分配

### 前端專案（不動）
- **位置**：根目錄（與 backend 資料夾平行）
- **狀態**：保留不動，不上傳到後端 GitHub
- **包含**：React 前端應用程式

### 後端 + 後台管理系統專案（一起）
- **位置**：`backend/` 資料夾
- **狀態**：同一個專案，同一個 GitHub，一起部署
- **包含**：
  - 後端 API（公開 API）
  - 後台管理系統 API（管理功能）

---

## 🗂️ 後端專案結構

```
backend/
│
├── src/                          # 原始碼
│   ├── db/                       # 資料庫相關
│   │   ├── database.ts          # 資料庫初始化
│   │   └── migrate.ts           # 資料庫遷移腳本
│   │
│   ├── models/                   # 資料模型
│   │   ├── Profile.ts          # Profile 資料模型
│   │   └── Article.ts           # Article 資料模型
│   │
│   ├── routes/                   # API 路由
│   │   ├── profiles.ts          # 公開 API - Profiles
│   │   ├── articles.ts           # 公開 API - Articles
│   │   ├── gemini.ts            # 公開 API - Gemini AI
│   │   └── admin.ts             # ⭐ 後台管理系統 API
│   │
│   ├── types.ts                  # TypeScript 類型定義
│   └── server.ts                 # 主伺服器（整合所有路由）
│
├── package.json                  # 專案依賴和腳本
├── package-lock.json             # 鎖定依賴版本
├── tsconfig.json                 # TypeScript 配置
│
├── README.md                      # 專案說明
├── API.md                        # API 文檔
├── GIT_UPLOAD_GUIDE.md           # GitHub 上傳指南
├── STRUCTURE.md                  # 本檔案
│
├── Dockerfile                    # Docker 配置（備用）
├── .dockerignore                 # Docker 忽略檔案
├── .gitignore                    # Git 忽略檔案
└── zeabur.json                   # Zeabur 配置
```

---

## 🎯 後台管理系統詳細說明

### 位置
**檔案**：`backend/src/routes/admin.ts`

### 功能分類

#### 1. 統計資訊 API
```typescript
GET /api/admin/stats
```
- 取得後台統計資訊
- Profiles 統計（總數、可用/不可用、新上架、按類型/地區分類）
- Articles 統計（總數、總瀏覽次數、按標籤分類）

#### 2. Profile 管理 API（上架新茶）
```typescript
GET    /api/admin/profiles           # 取得所有 profiles
GET    /api/admin/profiles/:id       # 取得單一 profile
POST   /api/admin/profiles           # ⭐ 上架新茶
PUT    /api/admin/profiles/:id       # ⭐ 編輯茶茶（完整更新）
PATCH  /api/admin/profiles/:id       # 部分更新（例如只更新可用狀態）
DELETE /api/admin/profiles/:id       # ⭐ 下架茶茶
POST   /api/admin/profiles/batch     # ⭐ 批量操作
```

#### 3. Article 管理 API（發布新文章）
```typescript
GET    /api/admin/articles           # 取得所有 articles
GET    /api/admin/articles/:id       # 取得單一 article
POST   /api/admin/articles           # ⭐ 發布新文章
PUT    /api/admin/articles/:id       # ⭐ 編輯文章
DELETE /api/admin/articles/:id       # ⭐ 刪除文章
POST   /api/admin/articles/batch      # ⭐ 批量操作
```

### 與後端的整合

在 `backend/src/server.ts` 中：

```typescript
// 公開 API（前端使用）
app.use('/api/profiles', profilesRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/gemini', geminiRouter);

// ⭐ 後台管理系統 API（管理功能）
app.use('/api/admin', adminRouter);
```

**重點：**
- 後台管理系統是後端的一部分
- 使用同一個 Express 伺服器
- 使用同一個資料庫
- 部署時會一起部署

---

## 🔄 資料流程

### 前端 → 後端 API
```
前端應用程式
  ↓ HTTP Request
後端 API (/api/profiles, /api/articles)
  ↓
資料庫 (SQLite)
```

### 後台管理系統 → 後端 API
```
管理工具 / n8n / 其他系統
  ↓ HTTP Request
後台管理 API (/api/admin/*)
  ↓
資料庫 (SQLite)
```

### 後端 API 和後台管理系統的關係
```
同一個 Express 伺服器
├── 公開 API (前端使用)
│   ├── /api/profiles
│   ├── /api/articles
│   └── /api/gemini
│
└── 後台管理系統 (管理功能)
    └── /api/admin
        ├── /admin/stats
        ├── /admin/profiles
        └── /admin/articles
```

---

## 📝 檔案說明

### 核心檔案

| 檔案 | 說明 | 是否後台管理系統 |
|------|------|----------------|
| `src/server.ts` | 主伺服器，整合所有路由 | 包含後台管理路由 |
| `src/routes/admin.ts` | 後台管理系統 API | ✅ 是 |
| `src/routes/profiles.ts` | 公開 Profiles API | ❌ 否 |
| `src/routes/articles.ts` | 公開 Articles API | ❌ 否 |
| `src/routes/gemini.ts` | Gemini AI API | ❌ 否 |
| `src/models/Profile.ts` | Profile 資料模型 | 共用 |
| `src/models/Article.ts` | Article 資料模型 | 共用 |
| `src/db/database.ts` | 資料庫初始化 | 共用 |

### 配置檔案

| 檔案 | 說明 |
|------|------|
| `package.json` | 專案依賴和腳本 |
| `tsconfig.json` | TypeScript 配置 |
| `zeabur.json` | Zeabur 部署配置 |
| `.gitignore` | Git 忽略檔案清單 |
| `Dockerfile` | Docker 配置（備用） |

---

## 🚀 部署說明

### 部署到 Zeabur

1. **上傳到 GitHub**：整個 `backend/` 資料夾
2. **Zeabur 自動偵測**：`.zeabur.yaml` 配置
3. **設定環境變數**：
   - `GEMINI_API_KEY`
   - `NODE_ENV=production`
4. **部署結果**：
   - 後端 API 上線
   - 後台管理系統 API 上線
   - 同一個服務，不同路由

### 服務端點

部署後，所有 API 都在同一個網域下：

```
https://your-backend.zeabur.app
├── /health                      # Health Check
├── /api/profiles                # 公開 API
├── /api/articles               # 公開 API
├── /api/gemini                  # 公開 API
└── /api/admin                   # ⭐ 後台管理系統
    ├── /admin/stats
    ├── /admin/profiles
    └── /admin/articles
```

---

## ✅ 總結

1. **前端**：不動，不上傳到後端 GitHub
2. **後端 + 後台管理系統**：同一個專案，同一個 GitHub，一起部署
3. **後台管理系統位置**：`backend/src/routes/admin.ts`
4. **後台管理系統功能**：所有 `/api/admin/*` 路由
5. **部署**：後端和後台管理系統會一起部署到 Zeabur

