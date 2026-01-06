# Redis 配置指南

## 📋 從 Zeabur 獲取 Redis 連接資訊

根據您提供的 Zeabur Redis 服務資訊：

### Redis 連接資訊

- **Redis Connection String**: `redis://:6tzTqAH90051r287lcVuXg4BJMGF3RLE@cgk1.clusters.zeabur.com:24516`
- **Redis Password**: `6tzTqAH90051r287lcVuXg4BJMGF3RLE`
- **Redis Host**: `cgk1.clusters.zeabur.com`
- **Redis Port**: `24516`

## 🔧 Zeabur 環境變數配置

### 方法 1：使用 REDIS_URL（推薦）

在 Zeabur 後端環境變數中添加：

```
REDIS_URL=redis://:6tzTqAH90051r287lcVuXg4BJMGF3RLE@cgk1.clusters.zeabur.com:24516
```

**注意**：連接字串格式為 `redis://:password@host:port`
- 如果密碼為空，格式為 `redis://host:port`
- 如果有密碼，格式為 `redis://:password@host:port`（注意密碼前有冒號）

### 方法 2：使用個別環境變數

如果不想使用完整的連接字串，可以使用：

```
REDIS_HOST=cgk1.clusters.zeabur.com
REDIS_PORT=24516
REDIS_PASSWORD=6tzTqAH90051r287lcVuXg4BJMGF3RLE
```

## ✅ 配置後的優勢

配置 Redis 後，系統將獲得以下優勢：

### 1. 高併發支持
- ✅ 支持 1000+ 併發用戶
- ✅ 多實例部署支持
- ✅ 負載均衡支持

### 2. 驗證碼存儲
- ✅ 驗證碼存儲在 Redis 中
- ✅ 服務重啟後驗證碼不丟失
- ✅ 多實例間共享驗證碼

### 3. API 緩存
- ✅ Profiles 列表緩存（5分鐘）
- ✅ Profile 詳情緩存（10分鐘）
- ✅ Articles 列表緩存（10分鐘）
- ✅ Article 詳情緩存（30分鐘）
- ✅ Forum posts 緩存（2分鐘）

### 4. 會話管理
- ✅ 用戶會話存儲
- ✅ 跨實例會話共享

## 🔍 驗證 Redis 連接

配置完成後，重啟後端服務，查看日誌：

### 成功連接
```
✅ Redis 連接成功
```

### 連接失敗
```
⚠️  Redis 連接失敗，將使用內存緩存: <錯誤訊息>
```

如果連接失敗，系統會自動降級到內存緩存，功能仍可正常使用。

## 📝 配置步驟

1. **在 Zeabur 後端環境變數中添加**：
   ```
   REDIS_URL=redis://:6tzTqAH90051r287lcVuXg4BJMGF3RLE@cgk1.clusters.zeabur.com:24516
   ```

2. **重新部署後端服務**

3. **檢查日誌確認連接狀態**

4. **測試驗證碼功能**：
   - 發送驗證碼應該存儲在 Redis 中
   - 服務重啟後驗證碼仍然有效

## ⚠️ 注意事項

1. **密碼安全**：
   - Redis 密碼是敏感資訊，請妥善保管
   - 不要在代碼中硬編碼密碼
   - 使用環境變數存儲

2. **連接格式**：
   - 確保 `REDIS_URL` 格式正確
   - 密碼前必須有冒號：`redis://:password@host:port`

3. **SSL/TLS**：
   - 如果 Redis 需要 SSL 連接，使用 `rediss://` 而不是 `redis://`
   - 格式：`rediss://:password@host:port`

4. **防火牆**：
   - 確保後端服務可以訪問 Redis 服務器
   - Zeabur 內部服務通常可以直接訪問

## 🚀 高併發性能

配置 Redis 後，系統性能預期：

| 配置 | 併發用戶 | 響應時間 |
|------|---------|---------|
| 內存緩存（當前） | 500-800 | 100-300ms |
| Redis 緩存（配置後） | 1000+ | 50-200ms |

## 📊 監控建議

配置 Redis 後，建議監控：
- Redis 連接狀態
- 緩存命中率
- Redis 內存使用情況
- 響應時間改善情況

