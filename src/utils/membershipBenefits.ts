import { MembershipLevel } from '../models/User.js';

/**
 * 根據會員等級和VIP狀態計算可查看的評論數量
 * @param level 會員等級
 * @param isVip 是否為VIP
 * @param isPremiumTea 是否為嚴選好茶（false為特選魚市）
 * @returns 可查看的評論數量，-1表示可查看全部
 */
export const getMaxReviewCount = (
  level: MembershipLevel | undefined,
  isVip: boolean,
  isPremiumTea: boolean
): number => {
  // VIP用戶可以查看全部評論
  if (isVip) {
    return -1; // -1 表示全部
  }

  // 未登入或沒有等級
  if (!level) {
    return 0;
  }

  // 嚴選好茶的評論限制
  if (isPremiumTea) {
    // 嚴選好茶：到御前總茶官（第6級）最多可以看6則
    const premiumTeaLevels: MembershipLevel[] = [
      'tea_guest',           // 1級：茶客
      'tea_scholar',         // 2級：入門茶士
      'royal_tea_scholar',   // 3級：御前茶士
      'royal_tea_officer',   // 4級：御用茶官
      'tea_king_attendant',  // 5級：茶王近侍
      'imperial_chief_tea_officer', // 6級：御前總茶官
    ];

    const levelIndex = premiumTeaLevels.indexOf(level);
    if (levelIndex === -1) {
      return 0; // 不在列表中，返回0
    }

    // 根據等級返回對應的評論數量（最多6則）
    // 1級：1則，2級：2則，3級：3則，4級：4則，5級：5則，6級：6則
    return Math.min(levelIndex + 1, 6);
  }

  // 特選魚市的評論限制
  // 茶客等級：最多到御前總茶官（第6級）可以看10則
  const fishMarketLevels: MembershipLevel[] = [
    'tea_guest',           // 1級：茶客
    'tea_scholar',         // 2級：入門茶士
    'royal_tea_scholar',   // 3級：御前茶士
    'royal_tea_officer',   // 4級：御用茶官
    'tea_king_attendant',  // 5級：茶王近侍
    'imperial_chief_tea_officer', // 6級：御前總茶官
  ];

  const levelIndex = fishMarketLevels.indexOf(level);
  if (levelIndex === -1) {
    return 0; // 不在列表中，返回0
  }

  // 根據等級返回對應的評論數量（最多10則）
  // 1級：1則，2級：2則，3級：3則，4級：4則，5級：5則，6級：10則
  if (levelIndex < 5) {
    return levelIndex + 1;
  }
  return 10; // 第6級（御前總茶官）可以看10則
};

/**
 * 根據會員等級和VIP狀態計算嚴選好茶的每月預約次數上限
 * @param level 會員等級
 * @param isVip 是否為VIP
 * @returns 每月預約次數上限
 */
export const getPremiumTeaBookingLimit = (
  level: MembershipLevel | undefined,
  isVip: boolean
): number => {
  // 基礎限制：每個帳號最多3次
  const baseLimit = 3;

  // 如果未購買VIP，即使升級也不增加次數
  if (!isVip) {
    return baseLimit;
  }

  // 如果沒有等級，返回基礎限制
  if (!level) {
    return baseLimit;
  }

  // 等級權益（需VIP+升級）
  const levelLimits: Record<MembershipLevel, number> = {
    'tea_guest': 3,                    // 1級：茶客 - 3次
    'tea_scholar': 3,                  // 2級：入門茶士 - 3次
    'royal_tea_scholar': 4,            // 3級：御前茶士 - 4次
    'royal_tea_officer': 5,            // 4級：御用茶官 - 5次
    'tea_king_attendant': 6,           // 5級：茶王近侍 - 6次（5+1）
    'imperial_chief_tea_officer': 7,   // 6級：御前總茶官 - 7次（5+2）
    'tea_king_confidant': 8,           // 7級：茶王心腹 - 8次（5+3）
    'tea_king_personal_selection': 9,  // 8級：茶王親選 - 9次（5+4）
    'imperial_golden_seal_tea_officer': 10, // 9級：御賜金印茶官 - 10次（5+5）
    'national_master_tea_officer': 11,  // 10級：國師級茶官 - 11次（5+6）
  };

  return levelLimits[level] || baseLimit;
};

/**
 * 檢查用戶是否可以加入VIP群組
 * @param level 會員等級
 * @returns 是否可以加入VIP群組
 */
export const canJoinVipGroup = (level: MembershipLevel | undefined): boolean => {
  if (!level) {
    return false;
  }

  // 必須等級在"御前總茶官"（imperial_chief_tea_officer）含以上才能加入
  const requiredLevel: MembershipLevel = 'imperial_chief_tea_officer';
  const levelOrder: MembershipLevel[] = [
    'tea_guest',
    'tea_scholar',
    'royal_tea_scholar',
    'royal_tea_officer',
    'tea_king_attendant',
    'imperial_chief_tea_officer',
    'tea_king_confidant',
    'tea_king_personal_selection',
    'imperial_golden_seal_tea_officer',
    'national_master_tea_officer',
  ];

  const userLevelIndex = levelOrder.indexOf(level);
  const requiredLevelIndex = levelOrder.indexOf(requiredLevel);

  return userLevelIndex >= requiredLevelIndex;
};

/**
 * 根據會員等級和VIP狀態計算收藏夾數量上限（嚴選好茶和特選魚市分別計算）
 * @param level 會員等級
 * @param isVip 是否為VIP
 * @param profileType 檔案類型：'premium' 為嚴選好茶，'featured' 為特選魚市
 * @returns 收藏夾數量上限，-1表示無限制
 */
export const getMaxFavoriteCount = (
  level: MembershipLevel | undefined,
  isVip: boolean,
  profileType: 'premium' | 'featured' = 'premium'
): number => {
  // 如果沒有等級
  if (!level) {
    // 如果用戶有VIP但在御用茶官等級前，各5個
    if (isVip) {
      return 5;
    }
    // 預設：嚴選好茶2位、特選魚市2位
    return 2;
  }

  const levelOrder: MembershipLevel[] = [
    'tea_guest',           // 1級：茶客
    'tea_scholar',         // 2級：入門茶士
    'royal_tea_scholar',   // 3級：御前茶士
    'royal_tea_officer',   // 4級：御用茶官
    'tea_king_attendant',  // 5級：茶王近侍
    'imperial_chief_tea_officer', // 6級：御前總茶官
    'tea_king_confidant',  // 7級：茶王心腹
    'tea_king_personal_selection', // 8級：茶王親選
    'imperial_golden_seal_tea_officer', // 9級：御賜金印茶官
    'national_master_tea_officer', // 10級：國師級茶官
  ];

  const levelIndex = levelOrder.indexOf(level);
  const royalTeaOfficerIndex = levelOrder.indexOf('royal_tea_officer');

  // 如果等級在御用茶官之前
  if (levelIndex < royalTeaOfficerIndex) {
    // 如果用戶有VIP但在御用茶官等級前，預設數量為各5個
    if (isVip) {
      return 5;
    }
    // 預設：嚴選好茶2位、特選魚市2位
    return 2;
  }

  // 如果用戶有VIP且達到御用茶官等級或以上，收藏夾無限制
  if (isVip && levelIndex >= royalTeaOfficerIndex) {
    return -1; // -1 表示無限制
  }

  // 從御用茶官開始，依序增加收藏數量（非VIP用戶）
  // 御用茶官（4級）：嚴選好茶3位、特選魚市3位
  // 茶王近侍（5級）：嚴選好茶4位、特選魚市4位
  // 御前總茶官（6級）：嚴選好茶5位、特選魚市5位
  // 之後每級+1
  const baseCount = 3; // 御用茶官的基礎數量
  const additionalCount = levelIndex - royalTeaOfficerIndex; // 超過御用茶官的級數
  return baseCount + additionalCount;
};

/**
 * 根據會員等級計算可查看的嚴選好茶相簿照片數量（包括寫真照片和作品集）
 * @param level 會員等級
 * @param isVip 是否為VIP
 * @returns 可查看的照片數量，-1表示全部解鎖，0表示無法查看
 */
export const getMaxGalleryPhotoCount = (
  level: MembershipLevel | undefined,
  isVip: boolean
): number => {
  const levelOrder: MembershipLevel[] = [
    'tea_guest',           // 1級：茶客
    'tea_scholar',         // 2級：入門茶士
    'royal_tea_scholar',   // 3級：御前茶士
    'royal_tea_officer',   // 4級：御用茶官
    'tea_king_attendant',  // 5級：茶王近侍
    'imperial_chief_tea_officer', // 6級：御前總茶官
    'tea_king_confidant',  // 7級：茶王心腹
    'tea_king_personal_selection', // 8級：茶王親選
    'imperial_golden_seal_tea_officer', // 9級：御賜金印茶官
    'national_master_tea_officer', // 10級：國師級茶官
  ];

  // 如果沒有等級，返回0（未登入用戶）
  if (!level) {
    return 0;
  }

  const levelIndex = levelOrder.indexOf(level);
  if (levelIndex === -1) {
    return 0; // 不在列表中，返回0
  }

  // VIP用戶的邏輯
  if (isVip) {
    // VIP：入門茶士（2級）2張，御前茶士（3級）3張，御用茶官（4級）含之後全部解鎖
    if (levelIndex === 1) { // 入門茶士（2級）
      return 2;
    } else if (levelIndex === 2) { // 御前茶士（3級）
      return 3;
    } else if (levelIndex >= 3) { // 御用茶官（4級）含之後
      return -1; // 全部解鎖
    }
    // 茶客（1級）無法查看
    return 0;
  }

  // 非VIP用戶的邏輯
  // 非VIP：茶客（1級）無法查看，入門茶士（2級）1張，御前茶士（3級）2張，
  // 御用茶官（4級）2張（與前一個等級相同），茶王近侍（5級）3張，
  // 御前總茶官（6級）3張（與前一個等級相同），茶王心腹（7級）之後全部解鎖
  if (levelIndex === 0) { // 茶客（1級）
    return 0; // 無法查看
  } else if (levelIndex === 1) { // 入門茶士（2級）
    return 1;
  } else if (levelIndex === 2) { // 御前茶士（3級）
    return 2;
  } else if (levelIndex === 3) { // 御用茶官（4級）
    return 2; // 與前一個等級相同
  } else if (levelIndex === 4) { // 茶王近侍（5級）
    return 3;
  } else if (levelIndex === 5) { // 御前總茶官（6級）
    return 3; // 與前一個等級相同
  } else if (levelIndex >= 6) { // 茶王心腹（7級）之後
    return -1; // 全部解鎖
  }
  
  return 0;
};

