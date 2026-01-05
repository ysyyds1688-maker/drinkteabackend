// Type definitions for backend
export enum AnalysisMode {
  PERSONALITY = 'PERSONALITY',
  LOVE_MATCH = 'LOVE_MATCH',
  FUTURE_LUCK = 'FUTURE_LUCK'
}

export interface ChartDataPoint {
  subject: string;
  A: number;
  fullMark: number;
}

export interface AnalysisResult {
  score: number;
  title: string;
  description: string;
  luckyColor: string;
  luckyItem: string;
  keywords: string[];
  stats: ChartDataPoint[];
  poem: string;
}

export interface UserInput {
  name1: string;
  name2?: string;
  mode: AnalysisMode;
  gender1?: string;
  gender2?: string;
}

export interface Album {
  category: string;
  images: string[];
}

export interface Profile {
  id: string;
  userId?: string; // 關聯到 users 表的 id
  name: string;
  nationality: string;
  age: number;
  height: number;
  weight: number;
  cup: string;
  location: string;
  district?: string;
  type: 'outcall' | 'incall';
  imageUrl: string;
  gallery: string[];
  albums: Album[];
  
  price: number;
  prices: {
    oneShot: { price: number; desc: string };
    twoShot: { price: number; desc: string };
    threeShot?: { price: number; desc: string };
  };

  tags: string[];
  basicServices: string[];
  addonServices: string[];
  
  // 聯絡方式
  contactInfo?: {
    line?: string;
    phone?: string;
    email?: string;
    telegram?: string;
    // 社群账号（动态对象，key为平台名称，value为账号/链接）
    socialAccounts?: {
      [platform: string]: string;
    };
    // 首选联系方式
    preferredMethod?: 'line' | 'phone' | 'email' | 'telegram';
    // 联系说明
    contactInstructions?: string;
  };
  
  // 備註
  remarks?: string;
  
  // 作品影片（僅嚴選好茶）
  videos?: Array<{
    url: string;
    code?: string;     // 番号
    title?: string;    // 影片标题
  }>;
  
  // 預約流程說明（僅特選鮮魚）
  bookingProcess?: string;
  
  isNew?: boolean;
  isAvailable?: boolean;

  availableTimes: {
    today: string;
    tomorrow: string;
  };
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  tag: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  tag: string;
  date: string;
  views: number;
  content?: string;
}

export interface FilterCriteria {
  type: 'all' | 'outcall' | 'incall';
  location: string;
  nationalities: string[];
  bodyTypes: string[];
  personalities: string[];
  ageRange: [number, number];
  priceRange: [number, number];
  cup: string[];
}
