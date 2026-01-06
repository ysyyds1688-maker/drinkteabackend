# 郵件發送配置說明

## 📧 SMTP 配置

要啟用郵件發送功能，需要在 `.env` 文件中配置以下環境變數：

### 必需的環境變數

```env
# SMTP 服務器配置
SMTP_HOST=smtp.gmail.com          # SMTP 服務器地址
SMTP_PORT=587                      # SMTP 端口（通常為 587 或 465）
SMTP_USER=your-email@gmail.com     # SMTP 用戶名（通常是郵箱地址）
SMTP_PASS=your-app-password        # SMTP 密碼（可能是應用程式密碼）
SMTP_FROM=noreply@example.com      # 發件人郵箱（可選，默認為 SMTP_USER）
```

### 常用郵件服務商配置範例

#### Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password  # 需要在 Google 帳戶中生成應用程式密碼
SMTP_FROM=your-email@gmail.com
```

**注意：Gmail 需要使用應用程式密碼，而不是普通密碼。**

#### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com
```

#### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=your-verified-sender@example.com
```

#### Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-smtp-password
SMTP_FROM=your-verified-sender@your-domain.com
```

#### Brevo (Sendinblue) - 推薦：每天 300 封免費

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-email@example.com
SMTP_PASS=your-brevo-smtp-password
SMTP_FROM=your-verified-email@example.com
```

#### Resend - 推薦：每月 3,000 封免費

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=your-resend-api-key
SMTP_FROM=noreply@your-domain.com
```

#### Zoho Mail

```env
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=your-email@zoho.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=your-email@zoho.com
```

### 開發環境行為

如果未配置 SMTP（開發環境），系統會：
- ✅ 仍然生成驗證碼
- ✅ 在控制台輸出驗證碼（方便測試）
- ✅ 在 API 響應中返回驗證碼（僅開發環境）
- ⚠️ 不會實際發送郵件

### 生產環境

在生產環境中（`NODE_ENV=production`）：
- ✅ 必須配置 SMTP
- ❌ 如果 SMTP 未配置，會返回錯誤
- ❌ API 響應不會包含驗證碼（安全考慮）

### 測試郵件發送

1. 確保 `.env` 文件已配置 SMTP 參數
2. 重啟後端服務器
3. 在前端點擊「發送驗證碼」按鈕
4. 檢查郵箱收件箱（包括垃圾郵件文件夾）
5. 檢查後端控制台日誌是否有錯誤信息

### 故障排除

#### 問題：郵件未收到

1. **檢查 SMTP 配置**：確保所有環境變數都正確設置
2. **檢查垃圾郵件**：郵件可能被歸類為垃圾郵件
3. **檢查後端日誌**：查看是否有錯誤信息
4. **測試 SMTP 連接**：可以手動測試 SMTP 連接是否正常

#### 問題：驗證碼在開發環境返回，但郵件未發送

這是正常的開發環境行為。如果需要實際發送郵件：
1. 配置 SMTP 環境變數
2. 重啟後端服務器
3. 再次測試

#### 問題：Gmail 認證失敗

- 確保已啟用「兩步驟驗證」
- 生成並使用「應用程式密碼」而不是普通密碼
- 確保在 Google 帳戶中啟用了「允許安全性較低的應用程式」（不推薦，建議使用應用程式密碼）

