import nodemailer from 'nodemailer';

// 追蹤是否已輸出 SMTP 配置日誌（避免重複輸出）
let smtpConfigLogged = false;

// 創建郵件傳輸器
const createTransporter = () => {
  // 檢查 SMTP 是否啟用
  const smtpEnabled = process.env.SMTP_ENABLED !== 'false'; // 默認啟用，除非明確設置為 false
  if (!smtpEnabled) {
    console.warn('⚠️  SMTP_ENABLED 設置為 false，郵件發送功能已禁用');
    return null;
  }
  
  // 檢查 SMTP 配置
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  // 只在開發環境或首次初始化時輸出詳細日誌
  if (process.env.NODE_ENV === 'development' && !smtpConfigLogged) {
    console.log('📧 SMTP 配置檢查:', {
      SMTP_ENABLED: smtpEnabled ? 'true (已啟用)' : 'false (已禁用)',
      SMTP_HOST: smtpHost ? '已設置 (' + smtpHost + ')' : '未設置',
      SMTP_PORT: process.env.SMTP_PORT || '587 (預設)',
      SMTP_USER: smtpUser ? '已設置 (' + smtpUser + ')' : '未設置',
      SMTP_PASS: smtpPass ? '已設置 (長度: ' + smtpPass.length + ')' : '未設置',
      SMTP_FROM: process.env.SMTP_FROM || '未設置 (將使用 SMTP_USER)',
      NODE_ENV: process.env.NODE_ENV || '未設置',
    });
    smtpConfigLogged = true;
  }
  
  // 如果配置了 SMTP，使用 SMTP
  if (smtpHost && smtpUser && smtpPass) {
    // 清理 SMTP_PASS（移除空格，Gmail 應用程式密碼可能有空格）
    const cleanedPass = smtpPass.replace(/\s+/g, '');
    
    // 驗證清理後的密碼長度（Gmail 應用程式密碼通常是 16 個字符）
    if (cleanedPass.length < 10) {
      console.warn('⚠️  警告: SMTP_PASS 清理後長度過短，可能不正確');
    }
    
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = port === 465;
    
    // 對於 Gmail，使用更寬鬆的配置
    const transporterConfig: any = {
      host: smtpHost,
      port: port,
      secure: secure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: cleanedPass, // 使用清理後的密碼
      },
      // TLS 配置
      tls: {
        rejectUnauthorized: false,
      },
    };
    
    // Gmail 特殊配置
    if (smtpHost.includes('gmail.com')) {
      transporterConfig.service = 'gmail';
      // 對於 Gmail，不需要指定 host 和 port，使用 service 即可
      // 但我們保留 host 和 port 以便靈活配置
    }
    
    return nodemailer.createTransport(transporterConfig);
  }
  
  // 如果沒有配置 SMTP，使用開發環境的測試配置（使用 Gmail 等）
  // 或者返回 null 表示不發送郵件
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  未配置 SMTP，郵件發送功能不可用');
    return null;
  }
  
  // 生產環境：如果 SMTP_ENABLED 為 true 但配置不完整，拋出錯誤
  if (smtpEnabled) {
    throw new Error('SMTP 配置未設置，無法發送郵件。請設置 SMTP_HOST、SMTP_USER 和 SMTP_PASS');
  }
  
  // 如果 SMTP_ENABLED 為 false，返回 null（不發送郵件）
  return null;
};

// 發送郵件
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.warn(`[開發環境] 模擬發送郵件到 ${to}`);
      console.warn(`主題: ${subject}`);
      console.warn(`內容: ${text || html}`);
      return;
    }
    
    // 發送郵件
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com',
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // 純文字版本
      html, // HTML 版本
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ 郵件已發送到 ${to}，Message ID: ${info.messageId}`);
  } catch (error: any) {
    console.error('❌ 發送郵件失敗:', error);
    console.error('錯誤詳情:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    
    // Gmail 認證錯誤的詳細診斷
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.error('🔐 Gmail 認證失敗診斷:');
      console.error('   1. 確認已啟用「兩步驟驗證」');
      console.error('   2. 確認使用的是「應用程式密碼」，不是 Gmail 帳戶密碼');
      console.error('   3. 確認應用程式密碼正確（已自動移除空格）');
      console.error('   4. 檢查 Gmail 帳戶是否被鎖定或需要額外驗證');
      console.error('   5. 如果使用 Gmail，請訪問: https://myaccount.google.com/apppasswords');
      console.error('   6. SMTP_USER:', process.env.SMTP_USER);
      console.error('   7. SMTP_PASS 長度:', process.env.SMTP_PASS?.length || 0);
    }
    
    throw new Error(`發送郵件失敗: ${error.message || '未知錯誤'}`);
  }
};

// 發送驗證碼郵件
export const sendVerificationEmail = async (email: string, code: string): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin: 20px 0;
          }
          .code {
            font-size: 32px;
            font-weight: bold;
            color: #1a5f3f;
            text-align: center;
            padding: 20px;
            background-color: #fff;
            border-radius: 5px;
            margin: 20px 0;
            letter-spacing: 5px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>郵箱驗證</h2>
          <p>您好，</p>
          <p>您正在驗證您的郵箱地址。請使用以下驗證碼：</p>
          <div class="code">${code}</div>
          <p>此驗證碼將在 <strong>10 分鐘</strong> 後過期。</p>
          <p>如果您沒有請求此驗證碼，請忽略此郵件。</p>
          <div class="footer">
            <p>此為自動發送的郵件，請勿回覆。</p>
            <p>© 2025 茶王 保留所有權利</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  const text = `您的驗證碼是: ${code}，有效期10分鐘。如果您沒有請求此驗證碼，請忽略此郵件。`;
  
  await sendEmail(
    email,
    '【茶王】郵箱驗證碼',
    html,
    text
  );
};
