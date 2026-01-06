# 📧 信箱驗證測試檢查清單

## ✅ 環境變數配置檢查

請確認以下環境變數已在 Zeabur 後端環境變數中設置：

### 必需環境變數

1. **SMTP_HOST** ⚠️ **必需**
   - SMTP 服務器地址
   - 範例：`smtp.gmail.com`、`smtp-mail.outlook.com`、`smtp-relay.brevo.com`

2. **SMTP_PORT** ⚠️ **必需**
   - SMTP 端口號
   - 常見值：`587`（TLS）或 `465`（SSL）
   - 預設值：`587`

3. **SMTP_USER** ⚠️ **必需**
   - SMTP 用戶名（通常是郵箱地址）
   - 範例：`your-email@gmail.com`

4. **SMTP_PASS** ✅ **已設置**
   - SMTP 密碼（應用程式密碼）
   - 您已經設置此變數

5. **SMTP_FROM** （可選）
   - 發件人郵箱地址
   - 如果未設置，會使用 `SMTP_USER` 的值
   - 建議設置：`noreply@teakingom.com` 或您的郵箱

### 其他相關環境變數

6. **NODE_ENV** （建議設置）
   - 環境類型：`production` 或 `development`
   - 在生產環境中，如果 SMTP 未配置會返回錯誤
   - 在開發環境中，如果 SMTP 未配置會在 API 響應中返回驗證碼

7. **REDIS_URL** （可選，但建議設置）
   - Redis 連接 URL（用於存儲驗證碼）
   - 如果未設置，會使用內存 Map 存儲（重啟後會丟失）
   - 格式：`redis://username:password@host:port` 或 `rediss://...`（SSL）

---

## 🔍 測試步驟

### 1. 確認環境變數已設置

在 Zeabur 後端環境變數中確認：
- ✅ `SMTP_HOST` 已設置
- ✅ `SMTP_PORT` 已設置（預設 587）
- ✅ `SMTP_USER` 已設置
- ✅ `SMTP_PASS` 已設置（您已完成）
- ⚠️ `SMTP_FROM` 建議設置（可選）

### 2. 重啟後端服務

在 Zeabur 中：
- 修改環境變數後需要重新部署或重啟服務
- 確保新的環境變數已生效

### 3. 測試發送驗證碼

**API 端點**：`POST /api/auth/send-verification-email`

**請求頭**：
```
Authorization: Bearer <用戶登入 token>
```

**預期響應**：
```json
{
  "message": "驗證碼已發送到您的郵箱"
}
```

**注意**：
- 如果 `NODE_ENV=development`，響應中會包含 `code` 欄位（方便測試）
- 如果 `NODE_ENV=production`，響應中不會包含驗證碼（安全考慮）

### 4. 檢查郵件

- ✅ 檢查收件箱
- ✅ 檢查垃圾郵件文件夾
- ✅ 檢查郵件是否來自正確的發件人（`SMTP_FROM` 或 `SMTP_USER`）

### 5. 測試驗證碼驗證

**API 端點**：`POST /api/auth/verify-email`

**請求頭**：
```
Authorization: Bearer <用戶登入 token>
```

**請求體**：
```json
{
  "code": "123456"
}
```

**預期響應**：
```json
{
  "message": "郵箱驗證成功",
  "user": {
    "id": "...",
    "email": "...",
    "emailVerified": true,
    "verificationBadges": ["email_verified"]
  },
  "experienceEarned": 10
}
```

---

## ⚠️ 常見問題與解決方案

### 問題 1：郵件未收到

**可能原因**：
1. SMTP 配置錯誤
2. 郵件被歸類為垃圾郵件
3. SMTP 服務商限制（如 Gmail 需要應用程式密碼）

**解決方案**：
- 檢查 Zeabur 後端日誌，查看是否有錯誤信息
- 確認 `SMTP_PASS` 是應用程式密碼（Gmail）而不是帳戶密碼
- 檢查垃圾郵件文件夾
- 確認 SMTP 服務商允許從該 IP 發送郵件

### 問題 2：驗證碼過期或無效

**可能原因**：
1. 驗證碼有效期為 10 分鐘
2. 如果使用內存 Map 存儲，服務重啟後會丟失

**解決方案**：
- 重新發送驗證碼
- 如果使用 Redis，確認 `REDIS_URL` 已正確配置

### 問題 3：SMTP 認證失敗

**可能原因**：
1. `SMTP_USER` 或 `SMTP_PASS` 錯誤
2. Gmail 需要使用應用程式密碼
3. 某些服務商需要啟用「允許安全性較低的應用程式」

**解決方案**：
- 確認 `SMTP_USER` 和 `SMTP_PASS` 正確
- 對於 Gmail，確保使用應用程式密碼
- 檢查 SMTP 服務商的文檔

### 問題 4：生產環境返回驗證碼

**原因**：
- `NODE_ENV` 未設置為 `production`
- 或 SMTP 配置錯誤導致回退到開發模式

**解決方案**：
- 在 Zeabur 環境變數中設置 `NODE_ENV=production`
- 確認所有 SMTP 環境變數已正確設置

---

## 📋 驗證碼存儲機制

### 優先使用 Redis（如果配置）

如果設置了 `REDIS_URL`：
- ✅ 驗證碼存儲在 Redis 中
- ✅ 服務重啟後驗證碼仍然有效
- ✅ 支持多實例部署

### 後備使用內存 Map（如果未配置 Redis）

如果未設置 `REDIS_URL`：
- ⚠️ 驗證碼存儲在內存 Map 中
- ⚠️ 服務重啟後驗證碼會丟失
- ⚠️ 不適合多實例部署

**建議**：在生產環境中配置 Redis

---

## 🔐 安全注意事項

1. **不要在前端顯示驗證碼**
   - 生產環境中，API 不會返回驗證碼
   - 開發環境中返回驗證碼僅供測試

2. **驗證碼有效期**
   - 預設有效期：10 分鐘
   - 過期後需要重新發送

3. **限流保護**
   - 驗證端點有嚴格的限流保護
   - 防止暴力破解

4. **環境變數安全**
   - 確保 `SMTP_PASS` 等敏感信息不會洩露
   - 不要在代碼中硬編碼密碼

---

## 📝 測試帳號建議

測試時可以使用以下帳號：
- `admin@teakingom.com`
- `provider@teakingom.com`
- `client@teakingom.com`

這些帳號的 `emailVerified` 狀態可以通過後台管理系統查看和重置。

---

## ✅ 完成檢查

測試前請確認：
- [ ] `SMTP_HOST` 已設置
- [ ] `SMTP_PORT` 已設置（或使用預設 587）
- [ ] `SMTP_USER` 已設置
- [ ] `SMTP_PASS` 已設置 ✅
- [ ] `SMTP_FROM` 建議設置（可選）
- [ ] `NODE_ENV` 建議設置為 `production`
- [ ] `REDIS_URL` 建議設置（可選但推薦）
- [ ] 後端服務已重啟/重新部署
- [ ] 測試帳號已準備好

