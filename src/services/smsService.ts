// SMS 發送服務
// 支持多種 SMS 服務提供商：Twilio、AWS SNS、或其他自定義服務

import { logger } from '../middleware/logger.js';

// 追蹤是否已輸出 SMS 配置日誌（避免重複輸出）
let smsConfigLogged = false;

// 發送 SMS 驗證碼
export const sendSMS = async (phoneNumber: string, message: string): Promise<void> => {
  try {
    // 檢查 SMS 是否啟用
    const smsEnabled = process.env.SMS_ENABLED !== 'false'; // 默認啟用，除非明確設置為 false
    if (!smsEnabled) {
      logger.warn('⚠️  SMS_ENABLED 設置為 false，SMS 發送功能已禁用');
      return;
    }

    // 檢查 SMS 服務提供商配置
    const smsProvider = process.env.SMS_PROVIDER?.toLowerCase() || 'twilio';
    
    // 只在開發環境或首次初始化時輸出詳細日誌
    if (process.env.NODE_ENV === 'development' && !smsConfigLogged) {
      logger.info('📱 SMS 配置檢查:', {
        SMS_ENABLED: smsEnabled ? 'true (已啟用)' : 'false (已禁用)',
        SMS_PROVIDER: smsProvider,
        TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? '已設置' : '未設置',
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? '已設置' : '未設置',
        TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER ? '已設置' : '未設置',
        AWS_SNS_REGION: process.env.AWS_SNS_REGION ? '已設置' : '未設置',
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '已設置' : '未設置',
        NODE_ENV: process.env.NODE_ENV || '未設置',
      });
      smsConfigLogged = true;
    }

    // 根據配置的服務提供商發送 SMS
    switch (smsProvider) {
      case 'twilio':
        await sendViaTwilio(phoneNumber, message);
        break;
      case 'aws-sns':
        await sendViaAWSSNS(phoneNumber, message);
        break;
      case 'custom':
        await sendViaCustom(phoneNumber, message);
        break;
      default:
        // 開發環境：如果未配置，只記錄日誌
        if (process.env.NODE_ENV === 'development') {
          logger.warn(`⚠️  [開發環境] 模擬發送 SMS 到 ${phoneNumber}`);
          logger.warn(`內容: ${message}`);
          return;
        }
        throw new Error(`不支持的 SMS 服務提供商: ${smsProvider}`);
    }

    logger.info(`✅ SMS 已發送到 ${phoneNumber}`);
  } catch (error: any) {
    logger.error('❌ 發送 SMS 失敗:', error);
    logger.error('錯誤詳情:', {
      message: error.message,
      code: error.code,
      phoneNumber: phoneNumber.substring(0, 4) + '****', // 只顯示前4位，保護隱私
    });
    throw error;
  }
};

// 使用 Twilio 發送 SMS
const sendViaTwilio = async (phoneNumber: string, message: string): Promise<void> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️  Twilio 未配置，模擬發送 SMS');
      logger.warn(`到: ${phoneNumber}, 內容: ${message}`);
      return;
    }
    throw new Error('Twilio 配置未設置，無法發送 SMS。請設置 TWILIO_ACCOUNT_SID、TWILIO_AUTH_TOKEN 和 TWILIO_PHONE_NUMBER');
  }

  try {
    // 動態導入 Twilio（如果已安裝）
    const twilio = await import('twilio');
    const client = twilio.default(accountSid, authToken);

    await client.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber,
    });

    logger.info(`✅ Twilio SMS 已發送到 ${phoneNumber}`);
  } catch (error: any) {
    // 如果 Twilio 未安裝，在開發環境中模擬發送
    if (error.code === 'MODULE_NOT_FOUND' && process.env.NODE_ENV === 'development') {
      logger.warn('⚠️  Twilio 套件未安裝，模擬發送 SMS');
      logger.warn(`到: ${phoneNumber}, 內容: ${message}`);
      logger.warn('💡 要使用真實的 Twilio 服務，請運行: npm install twilio');
      return;
    }
    throw error;
  }
};

// 使用 AWS SNS 發送 SMS
const sendViaAWSSNS = async (phoneNumber: string, message: string): Promise<void> => {
  const region = process.env.AWS_SNS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️  AWS SNS 未配置，模擬發送 SMS');
      logger.warn(`到: ${phoneNumber}, 內容: ${message}`);
      return;
    }
    throw new Error('AWS SNS 配置未設置，無法發送 SMS。請設置 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY');
  }

  try {
    // 動態導入 AWS SDK（如果已安裝）
    // @ts-ignore - @aws-sdk/client-sns 是可選依賴，可能未安裝
    const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns');
    const client = new SNSClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await client.send(new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
    }));

    logger.info(`✅ AWS SNS SMS 已發送到 ${phoneNumber}`);
  } catch (error: any) {
    // 如果 AWS SDK 未安裝，在開發環境中模擬發送
    if (error.code === 'MODULE_NOT_FOUND' && process.env.NODE_ENV === 'development') {
      logger.warn('⚠️  AWS SDK 未安裝，模擬發送 SMS');
      logger.warn(`到: ${phoneNumber}, 內容: ${message}`);
      logger.warn('💡 要使用真實的 AWS SNS 服務，請運行: npm install @aws-sdk/client-sns');
      return;
    }
    throw error;
  }
};

// 使用自定義 SMS 服務發送
const sendViaCustom = async (phoneNumber: string, message: string): Promise<void> => {
  const customSmsUrl = process.env.CUSTOM_SMS_URL;
  const customSmsApiKey = process.env.CUSTOM_SMS_API_KEY;

  if (!customSmsUrl || !customSmsApiKey) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️  自定義 SMS 服務未配置，模擬發送 SMS');
      logger.warn(`到: ${phoneNumber}, 內容: ${message}`);
      return;
    }
    throw new Error('自定義 SMS 服務配置未設置，無法發送 SMS。請設置 CUSTOM_SMS_URL 和 CUSTOM_SMS_API_KEY');
  }

  try {
    const axios = (await import('axios')).default;
    await axios.post(customSmsUrl, {
      phone: phoneNumber,
      message: message,
    }, {
      headers: {
        'Authorization': `Bearer ${customSmsApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info(`✅ 自定義 SMS 服務已發送到 ${phoneNumber}`);
  } catch (error: any) {
    logger.error('自定義 SMS 服務發送失敗:', error);
    throw error;
  }
};

