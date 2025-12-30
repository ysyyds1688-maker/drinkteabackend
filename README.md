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
│   │   ├── Subscription.ts     # 訂閱模型
│   │   ├── Review.ts            # 評論模型
│   │   ├── Booking.ts           # 預約模型
│   │   ├── UserStats.ts         # 用戶統計模型（積分、經驗值、成就統計）
│   │   ├── Achievement.ts       # 成就模型
│   │   ├── Badge.ts             # 勳章模型
│   │   └── Tasks.ts             # 每日任務模型
│   ├── routes/                   # API 路由
│   │   ├── profiles.ts          # 公開 API - Profiles
│   │   ├── articles.ts          # 公開 API - Articles
│   │   ├── gemini.ts            # 公開 API - Gemini AI
│   │   ├── auth.ts              # 認證 API - 登入/註冊
│   │   ├── reviews.ts           # 評論 API
│   │   ├── subscriptions.ts     # 訂閱 API
│   │   ├── bookings.ts          # 預約 API
│   │   ├── achievements.ts      # 成就 API
│   │   ├── badges.ts            # 勳章 API
│   │   ├── tasks.ts             # 每日任務 API
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
- ✅ **多級會員系統**（茶客、入門茶士、御前茶士、御用茶官、茶王近侍等 10 個等級）
- ✅ **驗證勳章系統**（郵箱驗證、手機驗證）
- ✅ **積分與經驗值系統**（積分用於兌換勳章，經驗值用於升級等級）
- ✅ **成就系統**（自動解鎖，發放積分和經驗值）
- ✅ **勳章系統**（使用積分兌換，展示身分象徵）
- ✅ **每日任務系統**（完成任務獲得積分和經驗值）
- ✅ 訂閱管理（訂閱、取消、歷史記錄、權益查詢）

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
- ✅ 用戶管理（查看所有用戶資料、會員等級、驗證勳章和預約狀況）
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
- Users 表（包含會員等級和驗證勳章）
- Subscriptions 表（訂閱記錄）
- Reviews 表
- Review Replies 表
- Review Likes 表
- Bookings 表
- User Sessions 表
- Verification Codes 表
- User Stats 表（用戶統計：積分、經驗值、成就統計）
- Achievements 表（成就記錄）
- User Badges 表（用戶已兌換的勳章）
- Daily Tasks 表（每日任務進度）

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
- `GET /api/subscriptions/my` - 取得當前用戶的訂閱狀態（包含等級和勳章，需要 Token）
- `POST /api/subscriptions/subscribe` - 訂閱會員（支持選擇等級，需要 Token）
- `GET /api/subscriptions/history` - 取得訂閱歷史記錄（需要 Token）
- `POST /api/subscriptions/cancel` - 取消訂閱（需要 Token）
- `GET /api/subscriptions/benefits` - 取得會員等級權益列表

**請求範例：**
```json
// 訂閱
POST /api/subscriptions/subscribe
{
  "membershipLevel": "bronze",  // bronze, silver, gold, diamond
  "duration": 30  // 天數，預設 30 天
}

// 響應
{
  "message": "訂閱成功",
  "membershipLevel": "bronze",
  "membershipExpiresAt": "2024-02-01T00:00:00.000Z",
  "subscription": { ... }
}
```

### 預約 API

#### 預約管理
- `POST /api/bookings` - 創建預約（需要 Client 身份）
- `GET /api/bookings/my` - 取得我的預約（Provider 或 Client）
- `GET /api/bookings/all` - 取得所有預約（僅 Admin）
- `PUT /api/bookings/:id/status` - 更新預約狀態（完成時會發放經驗值）
- `DELETE /api/bookings/:id` - 刪除預約

### 成就 API

#### 成就管理
- `GET /api/achievements/my` - 取得我的成就（需要 Token）
- `GET /api/achievements/definitions` - 取得所有成就定義
- `POST /api/achievements/check` - 檢查並解鎖成就（通常由系統自動調用）

**成就分類**：
- 🟦 **茶席互動**：論壇相關成就（初次獻帖、活躍作者、人望之星、茶會核心）
- 🟦 **嚴選好茶**：高級茶預約成就（初嚐御茶、御茶常客、品鑑達人）
- 🟦 **特選魚市**：個人小姐預約成就（初次入席、專屬熟客、茶王座上賓）
- 🟦 **茶客資歷**：忠誠/時間成就（守席之人、老茶客、茶王舊識）

### 勳章 API

#### 勳章管理
- `GET /api/badges/available` - 取得所有可兌換的勳章
- `GET /api/badges/my` - 取得我已擁有的勳章（需要 Token）
- `POST /api/badges/purchase/:badgeId` - 兌換勳章（需要 Token，會扣除積分）

**勳章分類**：
- 🟨 **身分稱號**：茶客、雅客、貴客、御選貴客
- 🟨 **品味風格**：品茶行家、夜茶派、靜品派、御茶鑑賞
- 🟨 **座上地位**：御茶常客、專屬座上、座上之賓、茶王座上
- 🟨 **皇室御印**：茶王心腹、御賜金印、國師級茶官

### 每日任務 API

#### 任務管理
- `GET /api/tasks/my` - 取得我的每日任務進度（需要 Token）
- `POST /api/tasks/update/:taskType` - 更新任務進度（通常由系統自動調用）

**任務類型**：
- `daily_login` - 每日登入
- `create_post` - 發表帖子
- `reply_post` - 回覆帖子
- `like_content` - 點讚內容
- `browse_profiles` - 瀏覽個人資料

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
- `GET /api/admin/users` - 取得所有用戶（包含會員等級和驗證勳章，僅 Admin）
- `GET /api/admin/users/:userId` - 取得用戶詳情（包含預約記錄、會員等級、驗證勳章）

### 用戶統計 API

#### 統計管理
- `GET /api/user-stats/my` - 取得我的統計資訊（積分、經驗值、等級等，需要 Token）

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
- ✅ **用戶管理**（查看所有註冊用戶、會員等級、驗證勳章）
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

## 🎖️ 會員等級、積分、經驗值與成就系統

### 會員等級系統（基於經驗值）

系統支持 10 個會員等級（基於經驗值自動升級）：

1. **茶客（tea_guest）** - 0 經驗值
2. **入門茶士（tea_scholar）** - 100 經驗值
3. **御前茶士（royal_tea_scholar）** - 500 經驗值
4. **御用茶官（royal_tea_officer）** - 2,000 經驗值
5. **茶王近侍（tea_king_attendant）** - 10,000 經驗值
6. **御前總茶官（imperial_chief_tea_officer）** - 50,000 經驗值
7. **茶王心腹（tea_king_confidant）** - 100,000 經驗值
8. **茶王親選（tea_king_personal_selection）** - 200,000 經驗值
9. **御賜金印茶官（imperial_golden_seal_tea_officer）** - 500,000 經驗值
10. **國師級茶官（national_master_tea_officer）** - 1,000,000 經驗值

### 積分與經驗值系統

**積分（Points）**：
- 用途：用於兌換勳章
- 獲取方式：完成每日任務、解鎖成就
- 特點：相對較難獲得，代表用戶的活躍貢獻度

**經驗值（Experience Points）**：
- 用途：用於提升會員等級
- 獲取方式：完成每日任務、解鎖成就、即時活動獎勵（發表帖子、回覆、獲得點讚、完成預約、驗證郵箱等）
- 特點：相對較容易獲得，確保用戶能持續感受到成長

### 成就系統（Achievement）

**特點**：
- 由用戶行為自動解鎖
- 解鎖後永久存在
- 不消耗積分
- 解鎖時會發放積分和經驗值

**成就分類**：
- 🟦 **茶席互動**：論壇相關成就
- 🟦 **嚴選好茶**：高級茶預約成就
- 🟦 **特選魚市**：個人小姐預約成就
- 🟦 **茶客資歷**：忠誠/時間成就

詳細成就列表請參考 `ACHIEVEMENT_SYSTEM_README.md`。

### 勳章系統（Badge）

**特點**：
- 由用戶使用積分兌換
- 兌換後積分會被扣除
- 可自由選擇是否兌換
- 用於展示身分象徵

**勳章分類**：
- 🟨 **身分稱號**：基本身分識別
- 🟨 **品味風格**：代表個人風格
- 🟨 **座上地位**：消費地位象徵
- 🟨 **皇室御印**：最高榮譽勳章

詳細勳章列表請參考 `# 茶王勳章系統（Tea King Badges）.ini.md`。

### 每日任務系統

**任務類型**：
- 每日登入
- 發表帖子
- 回覆帖子
- 點讚內容
- 瀏覽個人資料

**獎勵**：
- 每個任務完成後會獲得積分和經驗值
- 經驗值獎勵通常是積分的 1.5 倍

### 驗證勳章系統

系統支持以下驗證勳章：

- **email_verified** - 郵箱驗證勳章
- **phone_verified** - 手機驗證勳章

驗證勳章存儲在 `users.verification_badges` 欄位中（JSON 格式）。

### 訂閱記錄

每次訂閱都會在 `subscriptions` 表中創建記錄，包含：
- 用戶 ID
- 會員等級
- 開始時間
- 到期時間
- 是否活躍

### 數據遷移

系統會自動將現有的 `subscribed` 用戶遷移到 `bronze` 等級，確保數據一致性。

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

## 🚧 待完成事項

### 高優先級

1. **評論路由成就檢查** ⚠️
   - [x] 後端已實作評論時根據 `category` 參數更新統計
   - [ ] **前端需要配合**：在評論 API 調用時傳遞 `category` 參數（'premium_tea' 或 'lady_booking'）
   - [ ] 根據 profile 類別自動判斷並傳遞正確的 category

2. **預約完成成就檢查** ⚠️
   - [ ] 在預約狀態更新為 'completed' 時觸發成就檢查
   - [ ] 判斷預約類型（高級茶 vs 個人小姐）
   - [ ] 更新相應的統計計數

### 中優先級

3. **Provider 系統整合** ⚠️
   - [ ] Provider 評分系統實作
   - [ ] Provider 給 Client 評分時觸發成就檢查
   - [ ] Provider 專屬成就定義
   - [ ] Provider 專屬勳章定義
   - [ ] Provider 等級與階級制度設計
   - 詳細設計請參考 `PROVIDER_SYSTEM_PROPOSAL.md`

4. **判斷標準擴展** ⚠️
   - [ ] 添加更多高級茶判斷標準（除評論外）
   - [ ] 添加更多個人小姐判斷標準（除評論外）
   - [ ] 完善重複預約判斷邏輯

### 低優先級

5. **系統優化**
   - [ ] 成就解鎖通知系統
   - [ ] 成就進度顯示優化
   - [ ] 勳章展示優先順序設定

詳細的未完成事項請參考 `ACHIEVEMENT_SYSTEM_README.md`。

## 📚 更多文檔

- [ACHIEVEMENT_SYSTEM_README.md](../ACHIEVEMENT_SYSTEM_README.md) - 成就系統判斷標準與未完成事項
- [PROVIDER_SYSTEM_PROPOSAL.md](../PROVIDER_SYSTEM_PROPOSAL.md) - Provider 系統預留設計提案
- [ACHIEVEMENT_BADGE_SYSTEM_UPDATE.md](../ACHIEVEMENT_BADGE_SYSTEM_UPDATE.md) - 成就與勳章系統更新總結

## 授權

ISC
