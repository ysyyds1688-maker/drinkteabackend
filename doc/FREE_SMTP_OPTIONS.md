# 免費 SMTP 郵件服務選項

除了 Gmail，以下是其他免費的 SMTP 郵件服務選項，可用於發送驗證郵件：

## 🆓 免費 SMTP 服務比較

| 服務名稱 | 免費額度 | SMTP 主機 | 端口 | 優點 | 缺點 |
|---------|---------|----------|------|------|------|
| **Outlook/Hotmail** | 無限制 | smtp-mail.outlook.com | 587 | 完全免費，無需 API Key | 需要 Microsoft 帳戶，可能被標記為垃圾郵件 |
| **SendGrid** | 100 封/月 | smtp.sendgrid.net | 587 | 專業，送達率高 | 免費額度較少 |
| **Mailgun** | 5,000 封/月（前3個月） | smtp.mailgun.org | 587 | 額度高，API 友好 | 需要驗證域名 |
| **Resend** | 3,000 封/月 | smtp.resend.com | 587 | 現代化，易用 | 需要驗證域名 |
| **Brevo (Sendinblue)** | 300 封/天 | smtp-relay.brevo.com | 587 | 額度充足，易用 | 需要驗證發件人 |
| **Zoho Mail** | 25 封/天 | smtp.zoho.com | 587 | 免費，穩定 | 需要驗證，額度較少 |

---

## 📧 詳細設置指南

### 1. Outlook/Hotmail（推薦：完全免費）

**優點：**
- ✅ 完全免費，無發送限制
- ✅ 不需要 API Key
- ✅ 使用 Microsoft 帳戶即可

**設置步驟：**

1. **註冊 Microsoft 帳戶**
   - 前往：https://outlook.live.com/
   - 註冊一個新的 Outlook 或 Hotmail 帳戶

2. **配置 .env 文件**
   ```env
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_USER=your-email@outlook.com
   SMTP_PASS=your-microsoft-password
   SMTP_FROM=your-email@outlook.com
   ```

3. **注意事項：**
   - 使用您的 Microsoft 帳戶密碼（不是應用程式密碼）
   - 如果啟用了兩步驟驗證，需要生成應用程式密碼
   - 應用程式密碼生成：https://account.microsoft.com/security

---

### 2. SendGrid（推薦：專業服務）

**優點：**
- ✅ 專業的郵件服務
- ✅ 送達率高
- ✅ 提供詳細的統計數據

**設置步驟：**

1. **註冊 SendGrid 帳戶**
   - 前往：https://signup.sendgrid.com/
   - 註冊免費帳戶（每月 100 封郵件）

2. **創建 API Key**
   - 登入後，前往「Settings」→「API Keys」
   - 點擊「Create API Key」
   - 選擇「Full Access」或「Restricted Access」（僅郵件發送）
   - 複製生成的 API Key

3. **驗證發件人（可選，但建議）**
   - 前往「Settings」→「Sender Authentication」
   - 驗證您的發件人郵箱

4. **配置 .env 文件**
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=你的SendGrid-API-Key
   SMTP_FROM=your-verified-email@example.com
   ```

---

### 3. Mailgun（推薦：額度高）

**優點：**
- ✅ 前 3 個月每月 5,000 封免費
- ✅ 之後每月 1,000 封免費（需要驗證域名）
- ✅ API 友好，功能強大

**設置步驟：**

1. **註冊 Mailgun 帳戶**
   - 前往：https://signup.mailgun.com/
   - 註冊免費帳戶

2. **獲取 SMTP 憑證**
   - 登入後，前往「Sending」→「Domain Settings」
   - 選擇「SMTP credentials」
   - 創建新的 SMTP 用戶名和密碼

3. **驗證域名（可選，但建議）**
   - 驗證域名後可獲得更多免費額度

4. **配置 .env 文件**
   ```env
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=postmaster@your-domain.mailgun.org
   SMTP_PASS=你的Mailgun-SMTP-密碼
   SMTP_FROM=noreply@your-domain.com
   ```

---

### 4. Resend（推薦：現代化服務）

**優點：**
- ✅ 現代化的郵件服務
- ✅ 每月 3,000 封免費
- ✅ 易於使用，文檔清晰

**設置步驟：**

1. **註冊 Resend 帳戶**
   - 前往：https://resend.com/signup
   - 註冊免費帳戶

2. **獲取 API Key**
   - 登入後，前往「API Keys」
   - 創建新的 API Key
   - 複製 API Key

3. **驗證域名（可選，但建議）**
   - 驗證域名後可獲得更多功能

4. **配置 .env 文件**
   ```env
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USER=resend
   SMTP_PASS=你的Resend-API-Key
   SMTP_FROM=noreply@your-domain.com
   ```

---

### 5. Brevo (Sendinblue)（推薦：額度充足）

**優點：**
- ✅ 每天 300 封免費（每月約 9,000 封）
- ✅ 額度充足
- ✅ 易於使用

**設置步驟：**

1. **註冊 Brevo 帳戶**
   - 前往：https://www.brevo.com/
   - 註冊免費帳戶

2. **獲取 SMTP 憑證**
   - 登入後，前往「SMTP & API」
   - 選擇「SMTP」
   - 複製 SMTP 服務器、端口、用戶名和密碼

3. **驗證發件人**
   - 前往「Senders & IP」
   - 驗證您的發件人郵箱

4. **配置 .env 文件**
   ```env
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=your-brevo-email@example.com
   SMTP_PASS=你的Brevo-SMTP-密碼
   SMTP_FROM=your-verified-email@example.com
   ```

---

### 6. Zoho Mail（推薦：穩定可靠）

**優點：**
- ✅ 免費且穩定
- ✅ 適合個人和小型企業

**設置步驟：**

1. **註冊 Zoho Mail 帳戶**
   - 前往：https://www.zoho.com/mail/
   - 註冊免費帳戶

2. **啟用 SMTP**
   - 登入後，前往「Settings」→「Mail」→「POP/IMAP Access」
   - 啟用「IMAP Access」
   - 生成應用程式專用密碼

3. **配置 .env 文件**
   ```env
   SMTP_HOST=smtp.zoho.com
   SMTP_PORT=587
   SMTP_USER=your-email@zoho.com
   SMTP_PASS=你的應用程式專用密碼
   SMTP_FROM=your-email@zoho.com
   ```

---

## 🎯 推薦選擇

### 對於個人項目或小型應用：
1. **Outlook/Hotmail** - 完全免費，無限制
2. **Brevo** - 每天 300 封，額度充足

### 對於需要專業服務的項目：
1. **SendGrid** - 專業，送達率高
2. **Resend** - 現代化，易於使用

### 對於需要高額度的項目：
1. **Mailgun** - 前 3 個月 5,000 封/月
2. **Brevo** - 每天 300 封（約 9,000 封/月）

---

## ⚠️ 重要注意事項

1. **垃圾郵件問題**
   - 使用免費服務時，郵件可能被標記為垃圾郵件
   - 建議驗證發件人身份以提高送達率
   - 使用專業服務（SendGrid、Mailgun）可降低被標記為垃圾郵件的風險

2. **發送限制**
   - 免費服務通常有發送限制
   - 如果超過限制，需要升級到付費方案

3. **安全性**
   - 不要將 API Key 或密碼提交到 Git
   - 使用環境變數存儲敏感信息
   - 定期更換密碼或 API Key

4. **測試建議**
   - 先在小規模測試
   - 檢查郵件是否進入垃圾郵件文件夾
   - 監控發送成功率

---

## 🔧 快速切換配置

如果您想切換到不同的 SMTP 服務，只需修改 `.env` 文件中的配置：

```env
# 切換到 Outlook
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com

# 或切換到 SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=your-verified-email@example.com
```

重啟後端服務器後，新的配置就會生效。

