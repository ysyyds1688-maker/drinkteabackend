# 茶湯匯 Backend API

這是茶湯匯專案的後端 API 伺服器，使用 Express.js、TypeScript 和 SQLite 資料庫。

## 功能特色

- ✅ RESTful API 設計
- ✅ SQLite 資料庫持久化
- ✅ Gemini AI 整合（用於文案解析和名字分析）
- ✅ CORS 支援
- ✅ TypeScript 類型安全
- ✅ 完整的 CRUD 操作

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 並建立 `.env` 檔案：

```bash
cp .env.example .env
```

編輯 `.env` 檔案，填入你的 Gemini API Key：

```
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. 初始化資料庫

執行資料庫遷移腳本（會自動建立資料庫和初始資料）：

```bash
npm run db:migrate
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

伺服器將在 `http://localhost:3001` 啟動。

### 5. 建置生產版本

```bash
npm run build
npm start
```

## API 端點

### 公開 API

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
  - Body: `{ "text": "文案內容..." }`
- `POST /api/gemini/analyze-name` - 分析名字
  - Body: `{ "name1": "名字", "mode": "PERSONALITY" }`

### 後台管理 API

#### 統計資訊
- `GET /api/admin/stats` - 取得後台統計資訊

#### Profile 管理（上架新茶）
- `GET /api/admin/profiles` - 取得所有 profiles（管理用）
- `GET /api/admin/profiles/:id` - 取得單一 profile
- `POST /api/admin/profiles` - 上架新茶
- `PUT /api/admin/profiles/:id` - 編輯茶茶（完整更新）
- `PATCH /api/admin/profiles/:id` - 部分更新（例如只更新可用狀態）
- `DELETE /api/admin/profiles/:id` - 下架茶茶
- `POST /api/admin/profiles/batch` - 批量操作（刪除、更新、切換可用狀態）

#### Article 管理（發布新文章）
- `GET /api/admin/articles` - 取得所有 articles（管理用）
- `GET /api/admin/articles/:id` - 取得單一 article
- `POST /api/admin/articles` - 發布新文章
- `PUT /api/admin/articles/:id` - 編輯文章
- `DELETE /api/admin/articles/:id` - 刪除文章
- `POST /api/admin/articles/batch` - 批量操作

### Health Check
- `GET /health` - 檢查伺服器狀態

詳細 API 文檔請參考 [API.md](./API.md)

## 專案結構

```
backend/
├── src/
│   ├── db/
│   │   ├── database.ts      # 資料庫初始化
│   │   └── migrate.ts       # 資料庫遷移腳本
│   ├── models/
│   │   ├── Profile.ts       # Profile 資料模型
│   │   └── Article.ts       # Article 資料模型
│   ├── routes/
│   │   ├── profiles.ts      # Profile 路由
│   │   ├── articles.ts      # Article 路由
│   │   └── gemini.ts        # Gemini AI 路由
│   ├── types.ts             # 類型定義
│   └── server.ts            # 主伺服器檔案
├── package.json
├── tsconfig.json
└── README.md
```

## 環境變數說明

- `PORT`: 伺服器端口（預設：3001）
- `NODE_ENV`: 環境模式（development/production）
- `FRONTEND_URL`: 前端應用程式 URL（用於 CORS）
- `DB_PATH`: SQLite 資料庫檔案路徑
- `GEMINI_API_KEY`: Google Gemini API 金鑰

## 開發注意事項

1. 資料庫檔案會自動建立在 `data/database.db`
2. 開發模式下使用 `tsx watch` 自動重新載入
3. 所有 API 回應都是 JSON 格式
4. 錯誤處理會自動記錄到控制台

## 部署到 Zeabur

### 方法 1: 使用 Zeabur Dashboard

1. 將專案推送到 GitHub
2. 在 Zeabur Dashboard 中選擇 "New Project"
3. 選擇你的 GitHub Repository
4. Zeabur 會自動偵測並使用 `.zeabur.yaml` 配置
5. 設定環境變數：
   - `GEMINI_API_KEY` - 你的 Gemini API Key
   - `PORT` - 3001（通常自動設定）
   - `NODE_ENV` - production

### 方法 2: 使用 Zeabur CLI

```bash
# 安裝 Zeabur CLI
npm i -g @zeabur/cli

# 登入
zeabur login

# 部署
zeabur deploy
```

### 環境變數設定

在 Zeabur Dashboard 中設定以下環境變數：

- `GEMINI_API_KEY` - Google Gemini API 金鑰（必填）
- `DB_PATH` - 資料庫路徑（可選，預設: `./data/database.db`）
- `FRONTEND_URL` - 前端 URL（用於 CORS，可選）

### 注意事項

- Zeabur 會自動處理資料庫持久化
- 首次部署會自動執行資料庫初始化
- 建議使用 Zeabur 的環境變數管理功能

## n8n 整合

所有後台管理 API 都可以直接與 n8n 整合使用。詳細範例請參考 [API.md](./API.md) 中的「n8n 整合範例」章節。

主要使用場景：
- 使用 Webhook 接收新茶上架通知
- 使用 Webhook 接收新文章發布
- 定期同步資料統計
- 自動化批量操作

## 授權

ISC
