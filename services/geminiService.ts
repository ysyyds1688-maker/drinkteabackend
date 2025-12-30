import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
type Type = typeof SchemaType;
const Schema = SchemaType;
import { AnalysisMode, AnalysisResult, UserInput, Profile } from "../types";

const getApiKey = (): string => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey === "") return "";
  return apiKey.toString().trim().replace(/^["']|["']$/g, '');
};

const validateAndParseJson = <T>(text: string | undefined): T => {
  if (!text || text === "undefined" || text.trim() === "") {
    throw new Error("AI 暫時無法處理此文案。請嘗試移除敏感字眼或調整內容。");
  }

  try {
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText) as T;
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    throw new Error("AI 回傳格式解析失敗。");
  }
};

export const parseProfileFromText = async (text: string): Promise<Partial<Profile>> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key 未設定");

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `請將以下文案轉換為結構化 JSON 資料。文案內容：\n\n"${text}"`;

  const profileSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      age: { type: Type.INTEGER },
      height: { type: Type.INTEGER },
      weight: { type: Type.INTEGER },
      cup: { type: Type.STRING },
      price: { type: Type.INTEGER },
      nationality: { type: Type.STRING },
      location: { type: Type.STRING, description: "城市，如：台北市" },
      district: { type: Type.STRING, description: "行政區，如：大安區、中正區、西屯區" },
      type: { type: Type.STRING },
      basicServices: { type: Type.ARRAY, items: { type: Type.STRING } },
      addonServices: { type: Type.ARRAY, items: { type: Type.STRING }, description: "所有需加價的項目與金額，如：毒龍+2000" },
      tags: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["name", "age", "height", "weight", "cup", "price", "nationality", "location", "type", "addonServices"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        systemInstruction: "你是一個專業的資料分析員。請從廣告文案中提取女孩資訊。請識別並拆分地址為『location(城市)』與『district(行政區)』。所有文案中提到的額外技術（如：毒龍、69、自拍、雙飛等）且帶有金額標註的，請統一放入 addonServices。國籍請輸出 emoji 國旗。",
        responseMimeType: "application/json",
        responseSchema: profileSchema,
      }
    });

    const raw = validateAndParseJson<any>(response.text);
    
    return {
      ...raw,
      type: (raw.type === 'incall' || raw.type === 'outcall') ? raw.type : 'outcall',
      prices: {
        oneShot: { price: raw.price || 3000, desc: '一節/50min/1S' },
        twoShot: { price: (raw.price || 3000) * 2 - 500, desc: '兩節/100min/2S' }
      }
    };
  } catch (e: any) {
    console.error("Auto-fill extraction error:", e);
    throw new Error(e.message || "解析失敗");
  }
};

export const analyzeName = async (input: UserInput): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  let prompt = `分析名字 "${input.name1}" 的氣質。`;
  
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      luckyColor: { type: Type.STRING },
      luckyItem: { type: Type.STRING },
      keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      poem: { type: Type.STRING },
      stats: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            A: { type: Type.INTEGER },
            fullMark: { type: Type.INTEGER }
          },
          required: ["subject", "A", "fullMark"]
        }
      }
    },
    required: ["score", "title", "description", "luckyColor", "luckyItem", "keywords", "stats", "poem"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema }
  });

  return validateAndParseJson<AnalysisResult>(response.text);
};
