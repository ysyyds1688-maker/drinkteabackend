import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Profile, UserInput, AnalysisResult } from '../types.js';

const router = Router();

const getApiKey = (): string => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  return apiKey;
};

// POST /api/gemini/parse-profile - Parse profile from text
router.post('/parse-profile', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const apiKey = getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `請將以下文案轉換為結構化 JSON 資料。文案內容：\n\n"${text}"`;

    const profileSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
        height: { type: 'integer' },
        weight: { type: 'integer' },
        cup: { type: 'string' },
        price: { type: 'integer' },
        twoShotPrice: { type: 'integer', description: '兩節價格（選填，如果文案中有明確列出兩節價格則填入）' },
        nationality: { type: 'string' },
        location: { type: 'string', description: '城市，如：台北市' },
        district: { type: 'string', description: '行政區，如：大安區、中正區、西屯區' },
        type: { type: 'string' },
        basicServices: { type: 'array', items: { type: 'string' } },
        addonServices: { type: 'array', items: { type: 'string' }, description: '所有需加價的項目與金額，如：毒龍+2000' },
        tags: { type: 'array', items: { type: 'string' } }
      },
      required: ['name', 'age', 'height', 'weight', 'cup', 'price', 'nationality', 'location', 'type', 'addonServices']
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: profileSchema as any,
      },
      systemInstruction: '你是一個專業的資料分析員。請從廣告文案中提取女孩資訊。請識別並拆分地址為「location(城市)」與「district(行政區)」。所有文案中提到的額外技術（如：毒龍、69、自拍、雙飛等）且帶有金額標註的，請統一放入 addonServices，格式為「服務名稱+金額」（例如：毒龍+2000）。國籍請輸出 emoji 國旗。如果文案中有明確列出「兩節」或「兩節/100min/2S」的價格，請填入 twoShotPrice 欄位；如果沒有明確列出兩節價格，則不要填入 twoShotPrice（留空即可）。',
    });

    const response = await result.response;
    let raw;
    try {
      raw = JSON.parse(response.text());
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', response.text());
      throw new Error('AI 回傳格式錯誤，請稍後再試');
    }

    // 清理 addonServices：移除價格部分（如 "+2000", "+3000" 等）
    const cleanedAddonServices = (raw.addonServices || []).map((service: string) => {
      // 移除 "+數字" 格式的價格部分
      // 例如："毒龍+2000" -> "毒龍", "口爆+2000" -> "口爆"
      return service.replace(/\+\d+/g, '').trim();
    }).filter((service: string) => service.length > 0); // 過濾空字串

    // 優先使用解析出的兩節價格，如果沒有則套用公式
    const basePrice = raw.price || 3000;
    const twoShotPrice = raw.twoShotPrice && raw.twoShotPrice > 0 
      ? raw.twoShotPrice  // 優先使用解析出的兩節價格
      : basePrice * 2 - 500;  // 如果沒有則套用公式

    const profile: Partial<Profile> = {
      ...raw,
      type: (raw.type === 'incall' || raw.type === 'outcall') ? raw.type : 'outcall',
      addonServices: cleanedAddonServices, // 使用清理後的加值服務
      prices: {
        oneShot: { price: basePrice, desc: '一節/50min/1S' },
        twoShot: { price: twoShotPrice, desc: '兩節/100min/2S' }
      }
    };

    res.json(profile);
  } catch (error: any) {
    console.error('Gemini parse-profile error:', error);
    
    // 提供更友好的錯誤訊息
    let errorMessage = '解析失敗';
    if (error.message?.includes('GEMINI_API_KEY')) {
      errorMessage = 'GEMINI_API_KEY 未設定，請檢查環境變數';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Gemini API Key 無效，請檢查環境變數設定';
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorMessage = '無法連接到 Gemini API，請檢查網絡連線';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

// POST /api/gemini/analyze-name - Analyze name
router.post('/analyze-name', async (req, res) => {
  try {
    const input: UserInput = req.body;
    
    if (!input.name1) {
      return res.status(400).json({ error: 'name1 is required' });
    }

    const apiKey = getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    let prompt = `分析名字 "${input.name1}" 的氣質。`;

    const responseSchema = {
      type: 'object',
      properties: {
        score: { type: 'integer' },
        title: { type: 'string' },
        description: { type: 'string' },
        luckyColor: { type: 'string' },
        luckyItem: { type: 'string' },
        keywords: { type: 'array', items: { type: 'string' } },
        poem: { type: 'string' },
        stats: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              A: { type: 'integer' },
              fullMark: { type: 'integer' }
            },
            required: ['subject', 'A', 'fullMark']
          }
        }
      },
      required: ['score', 'title', 'description', 'luckyColor', 'luckyItem', 'keywords', 'stats', 'poem']
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any,
      },
    });

    const response = await result.response;
    const analysisResult: AnalysisResult = JSON.parse(response.text());

    res.json(analysisResult);
  } catch (error: any) {
    console.error('Gemini analyze-name error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze name' });
  }
});

export default router;
