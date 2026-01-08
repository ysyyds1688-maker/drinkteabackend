import crypto from 'crypto';

// 加密密鑰（從環境變數獲取，如果沒有則使用默認值，生產環境必須設置）
const ENCRYPTION_KEY = process.env.PASSWORD_ENCRYPTION_KEY || 'default-encryption-key-32-characters!!';
const ALGORITHM = 'aes-256-cbc';

// 加密密碼（用於存儲原始密碼，僅用於密碼提示功能）
export const encryptPassword = (password: string): string => {
  try {
    // 確保密鑰長度為 32 字節（AES-256 要求）
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16); // 初始化向量
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // 返回 iv + 加密後的密碼（iv 用於解密）
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('加密密碼失敗:', error);
    throw new Error('加密失敗');
  }
};

// 解密密碼
export const decryptPassword = (encryptedPassword: string): string => {
  try {
    const parts = encryptedPassword.split(':');
    if (parts.length !== 2) {
      throw new Error('無效的加密格式');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // 確保密鑰長度為 32 字節
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('解密密碼失敗:', error);
    throw new Error('解密失敗');
  }
};


