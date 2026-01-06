# 茶王 Backend API

## 📋 目錄

- [快速開始](#快速開始)
- [環境配置](#環境配置)
- [性能優化](#性能優化)
- [Redis 配置](#redis-配置)
- [數據庫配置](#數據庫配置)
- [API 文檔](#api-文檔)
- [部署說明](#部署說明)

## 🚀 快速開始

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
npm run dev
```

### 生產構建

```bash
npm run build
npm start
```

## ⚙️ 環境配置

創建 `.env` 文件並配置以下環境變數：

### 必需配置

```env
# 數據庫連接
DATABASE_URL=postgresql://user:password@host:5432/database
# 或使用個別配置
PGHOST=localhost
PGPORT=5432
PGUSER=your_user
PGPASSWORD=your_password
PGDATABASE=your_database
PGSSLMODE=require

# JWT 密鑰
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key

# 服務器端口
PORT=8080
```

### 可選配置

```env
# 數據庫連接池（支持高併發）
DB_POOL_MAX=300          # 最大連接數（默認：300）
DB_POOL_MIN=20           # 最小連接數（默認：20）
DB_POOL_IDLE_TIMEOUT=30000      # 空閒連接超時（毫秒）
DB_POOL_CONNECTION_TIMEOUT=10000 # 連接超時（毫秒）

# Redis 配置（後續加入，目前使用內存緩存）
# 注意：Redis URL 後續再加入，目前先以內存緩存運行
# REDIS_URL=redis://password@host:6379
# 或使用個別配置
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=your_password

# SMTP 郵件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com

# 請求超時
REQUEST_TIMEOUT=30000  # 30秒
```

## 🚀 性能優化

### 當前優化狀態

本專案已實施以下性能優化以支持 **1000+ 併發用戶**：

#### ✅ 已實施

1. **數據庫連接池優化**
   - 最大連接數：300（可配置）
   - 最小連接數：20（可配置）
   - 自動連接管理

2. **請求限流保護**
   - 全局 API 限流：15分鐘100請求
   - 嚴格限流（登入/註冊）：15分鐘5次
   - 驗證碼限流：1小時5次
   - 上傳限流：1小時20次
   - 論壇發帖限流：1小時10次

3. **HTTP 壓縮**
   - Gzip 壓縮啟用
   - 自動壓縮 JSON 和文本響應

4. **數據庫索引優化**
   - 已為常用查詢字段建立索引
   - 優化 JOIN 查詢性能

5. **緩存機制**
   - Redis 緩存服務（已準備，待配置）
   - 內存緩存後備（目前使用）

#### ⚠️ 內存緩存 vs Redis 緩存

**內存緩存（目前設置）的限制：**

❌ **不支持高併發多實例部署**
- 每個實例有獨立的內存緩存
- 無法在多個服務器實例間共享數據
- 驗證碼、會話等數據無法跨實例訪問

❌ **服務器重啟後數據丟失**
- 內存緩存數據不會持久化
- 重啟後所有緩存數據清空

❌ **單點故障風險**
- 無法實現負載均衡
- 無法水平擴展

**Redis 緩存（後續加入）的優勢：**

✅ **支持分佈式部署**
- 多個服務器實例共享同一個 Redis
- 驗證碼、會話等數據可在實例間共享
- 支持負載均衡和水平擴展

✅ **數據持久化**
- 可配置持久化策略
- 服務器重啟後數據不丟失

✅ **高併發支持**
- Redis 專為高併發設計
- 支持數萬 QPS
- 內存操作，速度極快

**結論：**
- **單實例部署**：內存緩存可以穩定運行，但建議配置 Redis
- **多實例/高併發部署**：**必須使用 Redis**，內存緩存無法支持

### 預期性能

| 配置 | 併發用戶 | 響應時間 | 適用場景 |
|------|---------|---------|---------|
| 單實例 + 內存緩存 | 300-500 | 200-500ms | 開發/測試環境 |
| 單實例 + Redis | 800-1000+ | 50-200ms | 中小型生產環境 |
| 多實例 + Redis | 5000+ | 50-200ms | 大型生產環境 |

## 🔴 Redis 配置

### 為什麼需要 Redis？

1. **分佈式部署支持**：多個服務器實例共享緩存
2. **高併發性能**：專為高併發設計，支持數萬 QPS
3. **數據持久化**：服務器重啟後數據不丟失
4. **驗證碼共享**：多實例間驗證碼可共享

### 配置方式

#### 方式 1：使用 REDIS_URL（推薦）

```env
REDIS_URL=redis://password@host:6379
```

#### 方式 2：使用個別配置

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

### 常見服務商配置

詳細配置說明請參考：[REDIS_SETUP.md](./REDIS_SETUP.md)

### 當前狀態

**注意：Redis URL 後續再加入，目前先以內存緩存運行**

- 系統會自動檢測 Redis 是否配置
- 如果未配置，會自動降級到內存緩存
- 功能正常運行，但僅支持單實例部署

### 啟用 Redis

1. 配置 Redis 服務（本地或雲服務）
2. 在 `.env` 中添加 `REDIS_URL` 或個別配置
3. 重啟服務器
4. 檢查日誌，應該看到：`✅ Redis 連接成功`

## 🗄️ 數據庫配置

### PostgreSQL 連接池

```env
DB_POOL_MAX=300          # 最大連接數（支持1000+併發）
DB_POOL_MIN=20           # 最小連接數
DB_POOL_IDLE_TIMEOUT=30000      # 空閒連接超時（30秒）
DB_POOL_CONNECTION_TIMEOUT=10000 # 連接超時（10秒）
```

### PostgreSQL 服務器配置建議

```sql
-- 增加最大連接數
max_connections = 500

-- 優化內存設置
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

## 📚 API 文檔

### 主要端點

#### 認證相關
- `POST /api/auth/register` - 註冊
- `POST /api/auth/login` - 登入
- `GET /api/auth/me` - 獲取當前用戶信息
- `POST /api/auth/logout` - 登出
- `POST /api/auth/verify-email` - 郵箱驗證
- `POST /api/auth/verify-phone` - 手機驗證

#### Profiles 相關
- `GET /api/profiles` - 獲取所有 Profiles（支持分頁、篩選、搜尋）
- `GET /api/profiles/:id` - 獲取特定 Profile
- `POST /api/profiles` - 創建 Profile（Provider）
- `PUT /api/profiles/:id` - 更新 Profile（Provider）
- `DELETE /api/profiles/:id` - 刪除 Profile（Provider）

#### 預約相關
- `POST /api/bookings` - 創建預約
- `GET /api/bookings/my` - 獲取我的預約
- `PUT /api/bookings/:id/status` - 更新預約狀態（確認/拒絕/完成）
- `GET /api/bookings/:id` - 獲取特定預約詳情

#### 訊息相關（預約確認專用）
- `GET /api/messages/my` - 獲取我的訊息收件箱（對話串列表）
- `GET /api/messages/thread/:threadId` - 獲取對話串詳情
- `POST /api/messages/send` - 發送訊息（僅用於預約確認流程）
- `PUT /api/messages/:id/read` - 標記訊息為已讀
- `PUT /api/messages/read-all` - 標記所有訊息為已讀
- `DELETE /api/messages/:id` - 刪除對話串

#### 評論相關
- `GET /api/reviews/profiles/:profileId/reviews` - 獲取 Profile 的評論
- `POST /api/reviews/profiles/:profileId/reviews` - 創建評論
- `POST /api/reviews/reviews/:reviewId/like` - 點讚評論
- `POST /api/reviews/reviews/:reviewId/reply` - 回復評論
- `GET /api/reviews/users/:userId/reviews` - 獲取用戶的評論（支持茶客評分）

#### 訂閱相關
- `GET /api/subscriptions/my` - 獲取我的訂閱狀態
- `POST /api/subscriptions/subscribe` - 訂閱（支持選擇等級）
- `GET /api/subscriptions/history` - 獲取訂閱歷史
- `POST /api/subscriptions/cancel` - 取消訂閱
- `GET /api/subscriptions/benefits` - 獲取會員等級權益列表

#### 成就與勳章
- `GET /api/achievements/my` - 獲取我的成就
- `GET /api/achievements/definitions` - 獲取所有成就定義
- `POST /api/achievements/check` - 檢查並解鎖成就
- `GET /api/badges/available` - 獲取所有可兌換的勳章
- `GET /api/badges/my` - 獲取我已擁有的勳章
- `POST /api/badges/purchase/:badgeId` - 兌換勳章

#### 任務與統計
- `GET /api/tasks/my` - 獲取我的每日任務進度
- `GET /api/user-stats/my` - 獲取我的統計資訊（積分、經驗值、等級等）

#### 後台管理
- `GET /api/admin/stats` - 獲取後台統計資訊
- `GET /api/admin/users` - 獲取所有用戶
- `GET /api/admin/bookings` - 獲取所有預約
- `GET /admin` - 後台管理介面（可視化）

#### 其他
- `GET /` - API 信息
- `GET /health` - 健康檢查
- `GET /api/articles` - 獲取所有 Articles
- `GET /api/forum/posts` - 獲取論壇帖子
- `POST /api/forum/posts` - 創建論壇帖子

完整 API 文檔請參考各路由文件。

## 🚢 部署說明

### 環境要求

- Node.js 18+
- PostgreSQL 12+
- Redis（可選，但強烈建議）

### 部署步驟

1. **克隆倉庫**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **配置環境變數**
   ```bash
   cp .env.example .env
   # 編輯 .env 文件
   ```

4. **初始化數據庫**
   ```bash
   npm run db:migrate
   ```

5. **構建項目**
   ```bash
   npm run build
   ```

6. **啟動服務**
   ```bash
   npm start
   ```

### 生產環境建議

1. **使用 PM2 管理進程**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name tea-king-backend
   ```

2. **配置 Redis**（必須，如果多實例部署）
   - 使用雲服務商的 Redis（推薦）
   - 或自建 Redis 服務器

3. **配置負載均衡**（多實例部署）
   - 使用 Nginx 或雲服務負載均衡器
   - 確保所有實例共享同一個 Redis

4. **監控和日誌**
   - 配置 APM 監控
   - 設置日誌收集系統

## 📊 性能監控

### 連接池監控

開發環境下，每 30 秒會輸出連接池狀態：

```
📊 連接池狀態: {
  totalCount: 25,
  idleCount: 15,
  waitingCount: 0
}
```

### Redis 連接狀態

啟動時會顯示 Redis 連接狀態：

```
✅ Redis 連接成功
```

或

```
⚠️  Redis 未配置，將使用內存緩存（目前設置，後續會加入 Redis URL）
```

## 🔧 故障排除

### Redis 連接失敗

如果看到 Redis 連接失敗的警告：
1. 檢查 Redis 服務是否運行
2. 檢查 `REDIS_URL` 或個別配置是否正確
3. 檢查網絡連接和防火牆設置
4. 系統會自動降級到內存緩存，功能仍可正常使用

### 數據庫連接失敗

1. 檢查 `DATABASE_URL` 或 PostgreSQL 配置
2. 檢查數據庫服務是否運行
3. 檢查連接池配置是否合理

### 性能問題

1. 檢查數據庫連接池使用率
2. 檢查是否有慢查詢
3. 考慮添加 Redis 緩存
4. 檢查 API 限流是否過於嚴格

## 🎯 最新功能更新

### ✅ 訊息系統（預約確認專用）
- ✅ Email 風格訊息收件箱（列表 + 詳情視圖）
- ✅ 預約確認流程自動化：
  - 茶客發起預約後，系統自動發送確認訊息給茶客
  - 佳麗收到預約請求訊息，可確認或拒絕
  - 佳麗確認後，系統自動發送聯繫方式、預約流程、注意事項給茶客
- ✅ 24小時倒數計時顯示
- ✅ 自動取消機制（24小時未確認自動取消並通知雙方）
- ⚠️ **不支援自由對話**：訊息收件箱僅用於預約確認

### ✅ 預約系統增強
- ✅ 預約日曆系統（顯示可用時間段）
- ✅ 服務時長優先排序（根據服務項目時長建議後續時間段）
- ✅ 台灣時區時間驗證（無法選擇已過期的時間段）
- ✅ 24小時自動取消機制（未確認的預約自動取消）
- ✅ 預約狀態管理（pending、accepted、rejected、completed、cancelled）

### ✅ 評論系統增強
- ✅ 茶客評分系統（佳麗可評論茶客）
- ✅ 茶客平均評分顯示（5星評分系統）
- ✅ 評論分類（嚴選好茶、特選魚市）

### ✅ 自動化任務
- ✅ 24小時自動取消未確認預約（Cron Job）
- ✅ 預約凍結規則自動執行
- ✅ 成就自動解鎖檢查
- ✅ 每日任務自動重置

## 📝 相關文檔

- [性能分析報告](./PERFORMANCE_ANALYSIS.md) - 詳細的性能分析和優化建議
- [性能分析與優化](./PERFORMANCE_ANALYSIS.md) - 高併發性能分析與優化實施狀態
- [Redis 配置指南](./REDIS_SETUP.md) - Redis 詳細配置說明
- [SMTP 配置指南](./EMAIL_CONFIG.md) - 郵件服務配置說明
- [環境變數說明](./ENV_VARIABLES.md) - 完整的環境變數配置說明
- [上線前檢查清單](../PRE_LAUNCH_CHECKLIST.md) - 上線前必須完成的檢查項目 ⭐

## 📄 許可證

ISC
