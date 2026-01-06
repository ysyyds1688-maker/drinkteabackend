# 後端環境變數說明

## 📋 必需環境變數

### `GEMINI_API_KEY` ⚠️ **必需**

**用途**：Google Gemini API 金鑰，用於 AI 自動解析功能

**說明**：
- 後台管理系統的「AI 智慧填單」功能需要此 API Key
- 用於解析 Line 文案並自動填充表單

**取得方式**：
1. 訪問 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 登入您的 Google 帳號
3. 點擊「Create API Key」
4. 複製產生的 API Key

**範例**：
```
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 🔧 可選環境變數

### `FRONTEND_URL` (建議設定)

**用途**：前端網站 URL，用於 CORS 配置

**說明**：
- 設定後，只有指定的前端網站可以訪問後端 API
- 如果未設定，預設為 `http://localhost:5173`（開發環境）

**範例**：
```
FRONTEND_URL=https://happynewyears.zeabur.app
```

---

### `PORT` (通常不需要設定)

**用途**：後端服務器監聽的端口

**說明**：
- 默認值：`3001`
- Zeabur 會自動設定此變數，通常不需要手動設定

**範例**：
```
PORT=3001
```

---

### `DATABASE_URL` ⚠️ **必需**（PostgreSQL）

**用途**：PostgreSQL 資料庫連接字串

**說明**：
- 用於連接到 PostgreSQL 資料庫
- 格式：`postgresql://username:password@host:port/database`
- 如果設定了 `DATABASE_URL`，系統會使用 PostgreSQL
- 如果沒有設定，系統會嘗試使用個別環境變數（PGHOST, PGPORT 等）

**範例**：
```
DATABASE_URL=postgresql://root:password@cgk1.clusters.zeabur.com:25867/zeabur
```

---

### `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (可選)

**用途**：PostgreSQL 資料庫連接資訊（如果沒有設定 `DATABASE_URL`）

**說明**：
- 如果沒有設定 `DATABASE_URL`，可以使用這些個別環境變數
- `PGHOST`: 資料庫主機地址
- `PGPORT`: 資料庫端口（預設：5432）
- `PGUSER`: 資料庫用戶名
- `PGPASSWORD`: 資料庫密碼
- `PGDATABASE`: 資料庫名稱

**範例**：
```
PGHOST=cgk1.clusters.zeabur.com
PGPORT=25867
PGUSER=root
PGPASSWORD=your_password
PGDATABASE=zeabur
```

---

### `NODE_ENV` (通常不需要設定)

**用途**：環境模式

**說明**：
- 可選值：`development` 或 `production`
- 默認值：`production`
- 影響錯誤訊息的詳細程度

**範例**：
```
NODE_ENV=production
```

---

## 🚀 在 Zeabur 設定環境變數

### 步驟 1：進入 Zeabur 專案
1. 登入 [Zeabur](https://zeabur.com)
2. 選擇您的後端專案

### 步驟 2：設定環境變數
1. 點擊專案設定（Settings）
2. 找到「Environment Variables」區塊
3. 點擊「Add Variable」

### 步驟 3：新增必需變數
**變數 1：GEMINI_API_KEY**
- Key: `GEMINI_API_KEY`
- Value: 您的 Gemini API Key（從 Google AI Studio 取得）

**變數 2：FRONTEND_URL**（建議設定）
- Key: `FRONTEND_URL`
- Value: `https://happynewyears.zeabur.app`（您的前端網站 URL）

### 步驟 4：重新部署
設定完成後，Zeabur 會自動重新部署您的後端服務。

---

## ✅ 檢查環境變數是否設定成功

### 方法 1：檢查後端日誌
部署後，查看 Zeabur 的日誌輸出，確認沒有出現 `GEMINI_API_KEY is not set` 錯誤。

### 方法 2：測試 AI 解析功能
1. 訪問後台管理系統：`https://backenddrinktea.zeabur.app/admin`
2. 點擊「+ 新增 Profile」
3. 在「AI 智慧填單」區塊貼上測試文案
4. 點擊「解析」按鈕
5. 如果成功，表單會自動填充；如果失敗，會顯示錯誤訊息

---

## 🔒 安全建議

1. **不要將 API Key 提交到 Git**
   - 確保 `.env` 檔案在 `.gitignore` 中
   - 使用 `.env.example` 作為範本

2. **定期更換 API Key**
   - 如果 API Key 洩露，立即在 Google AI Studio 中撤銷並重新生成

3. **限制 API Key 使用範圍**
   - 在 Google AI Studio 中可以設定 API Key 的使用限制

---

## 📝 快速檢查清單

- [ ] `GEMINI_API_KEY` 已設定（必需）
- [ ] `FRONTEND_URL` 已設定（建議）
- [ ] 後端已重新部署
- [ ] AI 解析功能測試成功

