# 茶王 Backend API

這是茶王專案的後端 API 伺服器，包含**後端 API** 和**後台管理系統**。

## 📁 專案結構

```
backend/
├── src/
│   ├── db/                       # 資料庫相關
│   ├── models/                   # 資料模型
│   ├── routes/                   # API 路由
│   │   ├── profiles.ts          # 公開 API - Profiles
│   │   ├── articles.ts          # 公開 API - Articles
│   │   ├── gemini.ts            # 公開 API - Gemini AI
│   │   └── admin.ts             # ⭐ 後台管理系統 API
│   ├── types.ts
│   └── server.ts                 # 主伺服器
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 功能特色

- ✅ RESTful API 設計
- ✅ SQLite 資料庫持久化
- ✅ Gemini AI 整合（用於文案解析和名字分析）
- ✅ CORS 支援
- ✅ TypeScript 類型安全
- ✅ 完整的 CRUD 操作
- ✅ **後台管理系統**（上架新茶、發布文章等）

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

建立 `.env` 檔案：

```bash
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DB_PATH=./data/database.db
```

### 3. 初始化資料庫

```bash
npm run db:migrate
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

伺服器將在 `http://localhost:3001` 啟動。

## 📡 API 端點

### 公開 API（前端使用）

#### Profiles（個人資料）
- `GET /api/profiles` - 取得所有個人資料
- `GET /api/profiles/:id` - 取得特定個人資料
- `POST /api/profiles` - 建立新個人資料
- `PUT /api/profiles/:id` - 更新個人資料
- `DELETE /api/profiles/:id` - 刪除個人資料

#### Articles（文章）
- `GET /api/articles` - 取得所有文章
- `GET /api/articles/:id` - 取得特定文章（會自動增加瀏覽次數）
- `POST /api/articles` - 建立新文章
- `PUT /api/articles/:id` - 更新文章
- `DELETE /api/articles/:id` - 刪除文章

#### Gemini AI
- `POST /api/gemini/parse-profile` - 從文案解析個人資料
- `POST /api/gemini/analyze-name` - 分析名字

### ⭐ 後台管理系統 API

#### 統計資訊
- `GET /api/admin/stats` - 取得後台統計資訊

#### Profile 管理（上架新茶）
- `GET /api/admin/profiles` - 取得所有 profiles（管理用）
- `GET /api/admin/profiles/:id` - 取得單一 profile
- `POST /api/admin/profiles` - **上架新茶** ⭐
- `PUT /api/admin/profiles/:id` - **編輯茶茶** ⭐
- `PATCH /api/admin/profiles/:id` - 部分更新
- `DELETE /api/admin/profiles/:id` - **下架茶茶** ⭐
- `POST /api/admin/profiles/batch` - **批量操作** ⭐

#### Article 管理（發布新文章）
- `GET /api/admin/articles` - 取得所有 articles（管理用）
- `GET /api/admin/articles/:id` - 取得單一 article
- `POST /api/admin/articles` - **發布新文章** ⭐
- `PUT /api/admin/articles/:id` - **編輯文章** ⭐
- `DELETE /api/admin/articles/:id` - **刪除文章** ⭐
- `POST /api/admin/articles/batch` - **批量操作** ⭐

### Health Check
- `GET /health` - 檢查伺服器狀態

詳細 API 文檔請參考 [API.md](./API.md)

## 🎯 後台管理系統說明

### 位置
- **檔案**：`src/routes/admin.ts`
- **API 路由**：`/api/admin/*`

### 功能
後台管理系統與後端 API 在**同一個 Express 伺服器**中，包含：
- 上架新茶
- 編輯茶茶
- 下架茶茶
- 發布新文章
- 編輯文章
- 批量操作
- 統計資訊

## 📦 建置生產版本

```bash
npm run build
npm start
```

## 🚀 部署資訊

### 後端網域

**Base URL**: `https://backenddrinktea.zeabur.app`

### 可用的端點

- Health Check: `https://backenddrinktea.zeabur.app/health`
- API Base: `https://backenddrinktea.zeabur.app/api`
- 後台管理: `https://backenddrinktea.zeabur.app/api/admin`

### 環境變數設定

在 Zeabur Dashboard 設定以下環境變數：

- `GEMINI_API_KEY` - 你的 Gemini API Key（必填）
- `NODE_ENV=production`
- `FRONTEND_URL` - 前端網域（用於 CORS，可選）

詳細 API 端點請參考 [API_ENDPOINTS.md](./API_ENDPOINTS.md)

## 📚 更多文檔

- [API.md](./API.md) - 完整 API 文檔
- [CHECKLIST.md](./CHECKLIST.md) - GitHub 上傳檢查清單
- [STRUCTURE.md](./STRUCTURE.md) - 專案結構說明

## 授權

ISC
