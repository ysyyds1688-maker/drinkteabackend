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

### Profiles（個人資料）

- `GET /api/profiles` - 取得所有個人資料
- `GET /api/profiles/:id` - 取得特定個人資料
- `POST /api/profiles` - 建立新個人資料
- `PUT /api/profiles/:id` - 更新個人資料
- `DELETE /api/profiles/:id` - 刪除個人資料

### Articles（文章）

- `GET /api/articles` - 取得所有文章
- `GET /api/articles/:id` - 取得特定文章（會自動增加瀏覽次數）
- `POST /api/articles` - 建立新文章
- `PUT /api/articles/:id` - 更新文章
- `DELETE /api/articles/:id` - 刪除文章

### Gemini AI

- `POST /api/gemini/parse-profile` - 從文案解析個人資料
  - Body: `{ "text": "文案內容..." }`
- `POST /api/gemini/analyze-name` - 分析名字
  - Body: `{ "name1": "名字", "mode": "PERSONALITY" }`

### Health Check

- `GET /health` - 檢查伺服器狀態

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

## 授權

ISC
