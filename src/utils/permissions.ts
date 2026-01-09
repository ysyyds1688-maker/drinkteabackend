/**
 * 權限檢查工具
 * 
 * 身份（role）：基礎身份，如 'provider'（後宮佳麗）、'client'（品茶客）、'admin'（管理員）
 * 職務（userTags）：額外的職務標記，如 'admin'（管理員）、'moderator'（版主）、'sub_moderator'（副版主）等
 * 
 * 注意：職務標記可以與身份同時存在，例如：
 * - 一個用戶可以是 'provider'（後宮佳麗）身份，同時擁有 'admin'（管理員）職務
 * - 一個用戶可以是 'client'（品茶客）身份，同時擁有 'moderator'（版主）職務
 */

import { User } from '../models/User.js';

/**
 * 檢查用戶是否有管理員權限
 * 條件：role === 'admin' 或 userTags 包含 'admin'
 */
export function hasAdminPermission(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // 檢查基礎身份
  if (user.role === 'admin') return true;
  
  // 檢查職務標記
  const userTags = (user as any).userTags || [];
  if (Array.isArray(userTags) && userTags.includes('admin')) return true;
  
  return false;
}

/**
 * 檢查用戶是否有版主權限
 * 條件：userTags 包含 'moderator' 或 'sub_moderator'
 */
export function hasModeratorPermission(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // 管理員自動擁有版主權限
  if (hasAdminPermission(user)) return true;
  
  // 檢查版主職務標記
  const userTags = (user as any).userTags || [];
  if (!Array.isArray(userTags)) return false;
  
  return userTags.includes('moderator') || userTags.includes('sub_moderator');
}

/**
 * 檢查用戶是否有特定職務
 */
export function hasRole(user: User | null | undefined, role: string): boolean {
  if (!user) return false;
  
  // 檢查基礎身份
  if (user.role === role) return true;
  
  // 檢查職務標記
  const userTags = (user as any).userTags || [];
  if (Array.isArray(userTags) && userTags.includes(role)) return true;
  
  return false;
}

/**
 * 獲取用戶的所有職務標記
 */
export function getUserRoles(user: User | null | undefined): string[] {
  if (!user) return [];
  
  const roles: string[] = [];
  
  // 添加基礎身份
  if (user.role) {
    roles.push(user.role);
  }
  
  // 添加職務標記
  const userTags = (user as any).userTags || [];
  if (Array.isArray(userTags)) {
    roles.push(...userTags);
  }
  
  return roles;
}

