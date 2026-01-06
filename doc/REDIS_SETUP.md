# Redis 配置與部署指南

## 📋 Redis URL 格式說明

`REDIS_URL` 不能直接複製貼上，需要根據你的實際 Redis 服務配置來設置。

### 格式

```
redis://[password@]host[:port][/database]
```

### 範例

#### 1. 本地 Redis（無密碼）
```env
REDIS_URL=redis://localhost:6379
```

#### 2. 本地 Redis（有密碼）
```env
REDIS_URL=redis://your_password@localhost:6379
```

#### 3. 遠程 Redis（有密碼）
```env
REDIS_URL=redis://your_password@redis.example.com:6379
```

#### 4. 使用 SSL/TLS（Redis Cloud、AWS ElastiCache 等）
```env
REDIS_URL=rediss://your_password@redis.example.com:6380
```
注意：`rediss://`（兩個 s）表示使用 SSL

### 替代方案：使用個別配置項

如果你不想使用 `REDIS_URL`，也可以使用個別配置項：

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

系統會自動組合這些配置項。

## 🚀 Zeabur 部署步驟

### 1. 在 Zeabur 部署 Redis

1. 點擊「建立服務」（Create Service）
2. 搜索「Redis」
3. 選擇第一個 `Redis` 模板（不要選擇 WordPress 模板）
4. 點擊「Deploy」
5. 等待部署完成

### 2. 獲取 Redis 連接信息

部署完成後，Zeabur 會提供：
- Redis Host
- Redis Port
- Redis Password（如果有）

Zeabur 通常會提供類似這樣的連接字符串：

```
redis://default:your_password@your-redis-service.zeabur.app:6379
```

### 3. 配置環境變數

在 `drinkteabackend` 服務的環境變數頁面：

1. 點擊「新增環境變數」（Add New Environment Variable）
2. Key: `REDIS_URL`
3. Value: 從 Redis 服務複製的連接字符串
4. 點擊「+」添加

### 4. 重啟服務

配置完成後，重啟 `drinkteabackend` 服務。

### 5. 驗證連接

查看服務日誌，應該看到：

```
✅ Redis 連接成功
```

如果看到：

```
⚠️  Redis 未配置，將使用內存緩存（目前設置，後續會加入 Redis URL）
```

表示 Redis 未配置或連接失敗，系統會自動使用內存緩存。

## 🔗 常見服務商的配置

### Redis Cloud（免費版）
```env
REDIS_URL=redis://default:your_password@redis-xxxxx.cloud.redislabs.com:xxxxx
```

### AWS ElastiCache
```env
REDIS_URL=redis://your-cluster.xxxxx.cache.amazonaws.com:6379
```

### Railway
```env
REDIS_URL=redis://default:password@containers-us-west-xxx.railway.app:xxxxx
```

### Render
```env
REDIS_URL=redis://red-xxxxx:password@xxxxx.redis.render.com:6379
```

### Upstash
```env
REDIS_URL=redis://default:password@xxxxx.upstash.io:6379
```

## ⚠️ 注意事項

1. **不要將 Redis 密碼提交到 Git**：環境變數應該只在 Zeabur 控制台配置
2. **服務間連接**：如果 Redis 和 Backend 都在 Zeabur，通常會自動配置內部網絡連接
3. **自動降級**：如果 Redis 連接失敗，系統會自動使用內存緩存，不會影響功能
4. **密碼中的特殊字符**：如果密碼包含特殊字符（如 `@`, `:`, `/`），需要進行 URL 編碼
   - `@` → `%40`
   - `:` → `%3A`
   - `/` → `%2F`

## 📝 當前狀態

**注意：Redis URL 後續再加入，目前先以內存緩存運行**

- 系統已準備好 Redis 支持
- 配置 Redis URL 後會自動啟用
- 未配置時會自動使用內存緩存

## 🎯 內存緩存 vs Redis

| 場景 | 內存緩存 | Redis | 建議 |
|------|---------|-------|------|
| 開發/測試 | ✅ 可用 | ✅ 可用 | 內存緩存即可 |
| 單實例生產（<500 併發） | ⚠️ 可用但不推薦 | ✅ 推薦 | 建議使用 Redis |
| 多實例/高併發（1000+） | ❌ 不支持 | ✅ 必須 | 必須使用 Redis |

**結論**：內存緩存可以穩定運行單實例，但無法支持多實例高併發。要達到 1000+ 併發用戶，建議配置 Redis。
