# Gmail 郵件發送設置指南

## 📧 使用 Gmail (tk.teaking@gmail.com) 發送認證郵件

### 步驟 1：啟用兩步驟驗證

1. 登入您的 Google 帳戶：https://myaccount.google.com/
2. 前往「安全性」頁面：https://myaccount.google.com/security
3. 在「登入 Google」區塊中，找到「兩步驟驗證」
4. 如果尚未啟用，請點擊「開始使用」並按照指示完成設置

### 步驟 2：生成應用程式密碼

1. 在「安全性」頁面中，找到「應用程式密碼」
   - 如果找不到，請先完成「兩步驟驗證」
   - 直接連結：https://myaccount.google.com/apppasswords

2. 選擇應用程式和裝置：
   - **應用程式**：選擇「郵件」
   - **裝置**：選擇「其他（自訂名稱）」，輸入「茶王後端服務器」

3. 點擊「產生」
4. Google 會生成一個 **16 位數的應用程式密碼**（格式：`xxxx xxxx xxxx xxxx`）
5. **重要**：立即複製這個密碼，因為之後無法再次查看！

### 步驟 3：配置 .env 文件

在 `backend/.env` 文件中添加以下配置：

```env
# Gmail SMTP 配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tk.teaking@gmail.com
SMTP_PASS=你的16位應用程式密碼  # 將空格移除，例如：xxxx xxxx xxxx xxxx -> xxxxxxxxxxxxxxxx
SMTP_FROM=tk.teaking@gmail.com
```

**注意事項：**
- `SMTP_PASS` 必須使用**應用程式密碼**，不是您的 Gmail 帳戶密碼
- 應用程式密碼中的空格可以保留或移除，都可以正常使用
- 如果應用程式密碼格式是 `xxxx xxxx xxxx xxxx`，可以寫成 `xxxx xxxx xxxx xxxx` 或 `xxxxxxxxxxxxxxxx`

### 步驟 4：重啟後端服務器

配置完成後，需要重啟後端服務器才能生效：

```bash
# 如果使用 npm
npm run dev

# 或如果使用生產環境
npm start
```

### 步驟 5：測試郵件發送

1. 在前端登入您的帳戶
2. 前往個人資料頁面
3. 點擊「發送驗證碼」按鈕
4. 檢查您的郵箱（tk.teaking@gmail.com）收件箱
5. 如果沒收到，請檢查「垃圾郵件」文件夾

### 故障排除

#### 問題 1：認證失敗
- ✅ 確認已啟用「兩步驟驗證」
- ✅ 確認使用的是「應用程式密碼」，不是帳戶密碼
- ✅ 確認應用程式密碼沒有過期或被撤銷

#### 問題 2：郵件未收到
- ✅ 檢查垃圾郵件文件夾
- ✅ 檢查後端控制台日誌是否有錯誤
- ✅ 確認 SMTP 配置正確

#### 問題 3：連接超時
- ✅ 確認網路連接正常
- ✅ 確認防火牆允許 SMTP 連接（端口 587）
- ✅ 嘗試使用端口 465（需要設置 `SMTP_PORT=465`）

### 安全建議

1. **不要將應用程式密碼提交到 Git**
   - 確保 `.env` 文件在 `.gitignore` 中
   - 在 Zeabur 等部署平台使用環境變數設置

2. **定期更換應用程式密碼**
   - 如果懷疑密碼洩露，立即在 Google 帳戶中撤銷並重新生成

3. **限制應用程式密碼權限**
   - 只授予必要的權限（郵件發送）

### Zeabur 部署配置

如果您在 Zeabur 部署，需要在 Zeabur 後台設置環境變數：

1. 登入 Zeabur 控制台
2. 選擇您的後端服務
3. 前往「Environment Variables」頁面
4. 添加以下環境變數：
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=tk.teaking@gmail.com`
   - `SMTP_PASS=你的應用程式密碼`
   - `SMTP_FROM=tk.teaking@gmail.com`
5. 保存並重新部署服務

