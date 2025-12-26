# 茶王 Backend API

這是茶王專案的後端 API 伺服器，包含**後端 API** 和**後台管理系統**。

## 📁 專案結構

```
backend/
├── src/
│   ├── db/                       # 資料庫相關
│   │   └── database.ts          # PostgreSQL 連接和初始化
│   ├── models/                   # 資料模型
│   │   ├── Profile.ts           # 個人資料模型
│   │   ├── Article.ts           # 文章模型
│   │   ├── User.ts              # 用戶模型
│   │   ├── Review.ts            # 評論模型
│   │   └── Booking.ts           # 預約模型
│   ├── routes/                   # API 路由
│   │   ├── profiles.ts          # 公開 API - Profiles
│   │   ├── articles.ts          # 公開 API - Articles
│   │   ├── gemini.ts            # 公開 API - Gemini AI
│   │   ├── auth.ts              # 認證 API - 登入/註冊
│   │   ├── reviews.ts           # 評論 API
│   │   ├── subscriptions.ts     # 訂閱 API
│   │   ├── bookings.ts          # 預約 API
│   │   ├── admin.ts             # 後台管理系統 API
│   │   ├── admin-users.ts       # 用戶管理 API
│   │   └── admin-panel.ts      # 後台管理系統頁面
│   ├── services/                 # 服務層
│   │   └── authService.ts      # JWT 認證服務
│   ├── types.ts                  # TypeScript 類型定義
│   └── server.ts                 # 主伺服器
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 功能特色

### 核心功能
- ✅ RESTful API 設計
- ✅ PostgreSQL 資料庫持久化
- ✅ Gemini AI 整合（用於文案解析和名字分析）
- ✅ CORS 支援（跨域請求）
- ✅ TypeScript 類型安全
- ✅ 完整的 CRUD 操作

### 用戶系統
- ✅ 用戶註冊/登入（Email 或手機號）
- ✅ JWT Token 認證
- ✅ 角色管理（Provider、Client、Admin）
- ✅ 會員訂閱系統

### 評論系統
- ✅ 5星評分系統
- ✅ 評論內容管理
- ✅ 評論回復功能
- ✅ 評論點讚功能
- ✅ 評論可見性控制（訪客/登入用戶/訂閱用戶）

### 預約系統
- ✅ 預約創建和管理
- ✅ 預約狀態追蹤（待處理/已接受/已完成/已取消）
- ✅ Provider 和 Client 預約管理

### 後台管理系統
- ✅ 可視化後台管理介面
- ✅ Profile 管理（上架/編輯/下架）
- ✅ Article 管理（發布/編輯/刪除）
- ✅ 用戶管理（查看所有用戶資料和預約狀況）
- ✅ 預約管理（查看和管理所有預約）
- ✅ 統計資訊儀表板

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

建立 `.env` 檔案：

```bash
# 資料庫連接（PostgreSQL）
DATABASE_URL=postgresql://user:password@localhost:5432/drinkstea

# Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# JWT Secret（用於 Token 加密）
JWT_SECRET=your_jwt_secret_key_here

# 伺服器設定
PORT=3001
NODE_ENV=development

# 前端網域（用於 CORS）
FRONTEND_URL=http://localhost:5173
```

### 3. 初始化資料庫

資料庫會在首次啟動時自動初始化，包括：
- Profiles 表
- Articles 表
- Users 表
- Reviews 表
- Review Replies 表
- Review Likes 表
- Bookings 表
- User Sessions 表
- Verification Codes 表

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

### 認證 API

#### 用戶認證
- `POST /api/auth/register` - 用戶註冊
- `POST /api/auth/login` - 用戶登入
- `GET /api/auth/me` - 取得當前用戶資訊（需要 Token）
- `POST /api/auth/logout` - 登出（撤銷 Token）

**請求範例：**
```json
// 註冊
POST /api/auth/register
{
  "email": "user@example.com",
  "phoneNumber": "0912345678",
  "password": "password123",
  "role": "client" // 或 "provider"
}

// 登入
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 評論 API

#### 評論管理
- `GET /api/reviews/profiles/:profileId/reviews` - 取得 Profile 的評論（根據用戶權限顯示）
- `POST /api/reviews/profiles/:profileId/reviews` - 創建評論（需要 Client 身份）
- `PUT /api/reviews/reviews/:reviewId` - 更新評論
- `DELETE /api/reviews/reviews/:reviewId` - 刪除評論
- `POST /api/reviews/reviews/:reviewId/like` - 點讚/取消點讚評論
- `POST /api/reviews/reviews/:reviewId/reply` - 回復評論（Provider 或 Admin）

**評論可見性規則：**
- 訪客：無法查看評論
- 登入用戶：可查看 2 則評論
- 訂閱用戶：可查看所有評論

### 訂閱 API

#### 訂閱管理
- `GET /api/subscriptions/my` - 取得當前用戶的訂閱狀態（需要 Token）
- `POST /api/subscriptions/subscribe` - 訂閱會員（需要 Token）

### 預約 API

#### 預約管理
- `POST /api/bookings` - 創建預約（需要 Client 身份）
- `GET /api/bookings/my` - 取得我的預約（Provider 或 Client）
- `GET /api/bookings/all` - 取得所有預約（僅 Admin）
- `PUT /api/bookings/:id/status` - 更新預約狀態
- `DELETE /api/bookings/:id` - 刪除預約

### ⭐ 後台管理系統 API

#### 統計資訊
- `GET /api/admin/stats` - 取得後台統計資訊（包含用戶數、預約數等）

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

#### 用戶管理
- `GET /api/admin/users` - 取得所有用戶（僅 Admin）
- `GET /api/admin/users/:userId` - 取得用戶詳情（包含預約記錄）

### Health Check
- `GET /health` - 檢查伺服器狀態

## 🎯 後台管理系統說明

### 位置
- **檔案**：`src/routes/admin-panel.ts`
- **網頁介面**：`/admin`
- **API 路由**：`/api/admin/*`

### 功能
後台管理系統與後端 API 在**同一個 Express 伺服器**中，包含：
- ✅ 上架新茶（支援 AI 智慧填單）
- ✅ 編輯茶茶
- ✅ 下架茶茶
- ✅ 發布新文章
- ✅ 編輯文章
- ✅ 批量操作
- ✅ 統計資訊儀表板
- ✅ **用戶管理**（查看所有註冊用戶）
- ✅ **預約管理**（查看和管理所有預約）

### 訪問方式
訪問 `http://localhost:3001/admin` 即可使用後台管理系統。

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
- 後台管理: `https://backenddrinktea.zeabur.app/admin`
- 後台 API: `https://backenddrinktea.zeabur.app/api/admin`

### 環境變數設定

在 Zeabur Dashboard 設定以下環境變數：

- `DATABASE_URL` - PostgreSQL 連接字串（必填）
- `GEMINI_API_KEY` - 你的 Gemini API Key（必填）
- `JWT_SECRET` - JWT Token 加密密鑰（必填，建議使用強密碼）
- `NODE_ENV=production`
- `PORT` - 伺服器端口（Zeabur 會自動設定）
- `FRONTEND_URL` - 前端網域（用於 CORS，可選）

### 資料庫設定

專案使用 PostgreSQL 資料庫，需要在 Zeabur 中：
1. 添加 PostgreSQL 服務
2. 設定 `DATABASE_URL` 環境變數
3. 確保資料庫持久化（Zeabur 會自動處理）

## 🔐 安全說明

### JWT Token
- Token 有效期：7 天
- Refresh Token 有效期：30 天
- Token 存儲在 `user_sessions` 表中，支援撤銷

### 密碼安全
- 使用 bcrypt 進行密碼雜湊
- 密碼最小長度：6 個字符

### CORS 設定
- 預設允許所有來源（`origin: '*'`）
- 生產環境建議設定特定的前端網域

## 📚 更多文檔

- [API.md](./API.md) - 完整 API 文檔（如果存在）
- [STRUCTURE.md](./STRUCTURE.md) - 專案結構說明（如果存在）

## 授權

ISC
