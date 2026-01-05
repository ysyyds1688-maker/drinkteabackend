import nodemailer from 'nodemailer';

// 創建郵件傳輸器
const createTransporter = () => {
  // 如果配置了 SMTP，使用 SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // 開發環境可能不需要 TLS
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  
  // 如果沒有配置 SMTP，使用開發環境的測試配置（使用 Gmail 等）
  // 或者返回 null 表示不發送郵件
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  未配置 SMTP，郵件發送功能不可用');
    return null;
  }
  
  throw new Error('SMTP 配置未設置，無法發送郵件');
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

