import { Profile } from '../types.js';
import { profileModel } from '../models/Profile.js';
import { v4 as uuidv4 } from 'uuid';

export interface ImportResult {
  success: Profile[];
  duplicates: Array<{
    profile: Partial<Profile>;
    similar: Profile;
    similarity: number;
  }>;
  errors: Array<{
    profile: Partial<Profile>;
    error: string;
  }>;
}

export const importService = {
  // 批量导入 Profiles（带重复检测）
  async importProfiles(
    profiles: Partial<Profile>[],
    options: {
      autoApprove?: boolean;
      force?: boolean;
      sourceType?: string;
    } = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: [],
      duplicates: [],
      errors: []
    };

    for (const profileData of profiles) {
      try {
        // 检查重复
        const similar = await profileModel.findSimilar(profileData);
        const similarities = similar.map(existing => ({
          profile: existing,
          similarity: profileModel.calculateSimilarity(profileData, existing)
        })).filter(s => s.similarity >= 70); // 70% 阈值

        if (similarities.length > 0 && !options.force && !options.autoApprove) {
          result.duplicates.push({
            profile: profileData,
            similar: similarities[0].profile,
            similarity: similarities[0].similarity
          });
          continue;
        }

        // 验证必需字段
        if (!profileData.name || !profileData.nationality || !profileData.location) {
          throw new Error('Missing required fields: name, nationality, location');
        }

        // 创建 profile
        const profile = await profileModel.create({
          ...profileData,
          id: profileData.id || uuidv4(),
          userId: undefined, // 高级茶
          name: profileData.name,
          nationality: profileData.nationality,
          location: profileData.location,
          age: profileData.age || 20,
          height: profileData.height || 160,
          weight: profileData.weight || 45,
          cup: profileData.cup || 'C',
          type: profileData.type || 'outcall',
          price: profileData.price || 3000,
          imageUrl: profileData.imageUrl || '',
          gallery: profileData.gallery || [],
          albums: profileData.albums || [],
          prices: profileData.prices || {
            oneShot: { price: profileData.price || 3000, desc: '一節/50min/1S' },
            twoShot: { price: (profileData.price || 3000) * 2 - 500, desc: '兩節/100min/2S' }
          },
          tags: profileData.tags || [],
          basicServices: profileData.basicServices || [],
          addonServices: profileData.addonServices || [],
          isNew: profileData.isNew !== undefined ? profileData.isNew : true,
          isAvailable: profileData.isAvailable !== undefined ? profileData.isAvailable : true,
          availableTimes: profileData.availableTimes || {
            today: '12:00~02:00',
            tomorrow: '12:00~02:00'
          }
        } as Profile);
        
        result.success.push(profile);
      } catch (error: any) {
        result.errors.push({
          profile: profileData,
          error: error.message
        });
      }
    }

    return result;
  },

  // 解析 Line 消息格式
  parseLineMessage(text: string): Partial<Profile>[] {
    const profiles: Partial<Profile>[] = [];
    // Line 消息可能包含多个 profile，用分隔符分割
    // 示例：假设每行是一个 profile 的文本描述
    const lines = text.split('\n').filter(l => l.trim());
    
    // 简单解析逻辑，实际应该调用 Gemini API 或使用更复杂的解析
    // 这里先返回空数组，实际使用时需要根据 Line 消息格式实现
    // 可以调用 Gemini API 解析每个 profile
    
    return profiles;
  },

  // 解析 CSV 格式
  parseCSV(csvText: string): Partial<Profile>[] {
    const profiles: Partial<Profile>[] = [];
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) return profiles;
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const profile: Partial<Profile> = {};
      
      headers.forEach((header, index) => {
        const value = values[index];
        if (value) {
          // 映射 CSV 列到 Profile 字段
          switch (header) {
            case 'name':
            case '姓名':
              profile.name = value;
              break;
            case 'age':
            case '年齡':
            case 'age':
              profile.age = parseInt(value) || undefined;
              break;
            case 'height':
            case '身高':
              profile.height = parseInt(value) || undefined;
              break;
            case 'weight':
            case '體重':
              profile.weight = parseInt(value) || undefined;
              break;
            case 'cup':
            case '罩杯':
              profile.cup = value;
              break;
            case 'nationality':
            case '國籍':
              profile.nationality = value;
              break;
            case 'location':
            case '城市':
              profile.location = value;
              break;
            case 'district':
            case '行政區':
              profile.district = value;
              break;
            case 'price':
            case '價格':
              profile.price = parseInt(value) || undefined;
              break;
            case 'type':
            case '類型':
              profile.type = (value === 'outcall' || value === 'incall') ? value as 'outcall' | 'incall' : 'outcall';
              break;
          }
        }
      });
      
      if (profile.name && profile.nationality && profile.location) {
        profiles.push(profile);
      }
    }
    
    return profiles;
  },

  // 解析 Telegram 消息格式
  parseTelegramMessage(data: any): Partial<Profile>[] {
    const profiles: Partial<Profile>[] = [];
    
    // Telegram 消息格式解析
    if (data.message?.text) {
      // 解析文本消息
      // 可以调用 Gemini API 解析
      // 这里先返回空数组，实际使用时需要根据 Telegram bot 的消息格式实现
    } else if (data.message?.photo) {
      // 处理图片消息
    }
    
    return profiles;
  }
};

