// API 配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backenddrinktea.zeabur.app';

// API 端點
export const API_ENDPOINTS = {
  // 公開 API
  profiles: `${API_BASE_URL}/api/profiles`,
  articles: `${API_BASE_URL}/api/articles`,
  gemini: {
    parseProfile: `${API_BASE_URL}/api/gemini/parse-profile`,
    analyzeName: `${API_BASE_URL}/api/gemini/analyze-name`,
  },
  // 後台管理 API
  admin: {
    stats: `${API_BASE_URL}/api/admin/stats`,
    profiles: `${API_BASE_URL}/api/admin/profiles`,
    articles: `${API_BASE_URL}/api/admin/articles`,
  },
  // 認證 API
  auth: {
    base: `${API_BASE_URL}/api/auth`,
    register: `${API_BASE_URL}/api/auth/register`,
    login: `${API_BASE_URL}/api/auth/login`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    me: `${API_BASE_URL}/api/auth/me`,
    updateMe: `${API_BASE_URL}/api/auth/me`,
  },
  // 評論 API
  reviews: {
    getByProfile: (profileId: string) => `${API_BASE_URL}/api/reviews/profiles/${profileId}/reviews`,
    create: (profileId: string) => `${API_BASE_URL}/api/reviews/profiles/${profileId}/reviews`,
    update: (reviewId: string) => `${API_BASE_URL}/api/reviews/reviews/${reviewId}`,
    delete: (reviewId: string) => `${API_BASE_URL}/api/reviews/reviews/${reviewId}`,
    like: (reviewId: string) => `${API_BASE_URL}/api/reviews/reviews/${reviewId}/like`,
    reply: (reviewId: string) => `${API_BASE_URL}/api/reviews/reviews/${reviewId}/reply`,
  },
  // 訂閱 API
  subscriptions: {
    my: `${API_BASE_URL}/api/subscriptions/my`,
    subscribe: `${API_BASE_URL}/api/subscriptions/subscribe`,
    history: `${API_BASE_URL}/api/subscriptions/history`,
    cancel: `${API_BASE_URL}/api/subscriptions/cancel`,
    benefits: `${API_BASE_URL}/api/subscriptions/benefits`,
  },
  // 用戶統計 API
  userStats: {
    me: `${API_BASE_URL}/api/user-stats/me`,
  },
  // 任務 API
  tasks: {
    daily: `${API_BASE_URL}/api/tasks/daily`,
    definitions: `${API_BASE_URL}/api/tasks/definitions`,
  },
  // 論壇 API
  forum: {
    posts: `${API_BASE_URL}/api/forum/posts`,
    post: (id: string) => `${API_BASE_URL}/api/forum/posts/${id}`,
    replies: (postId: string) => `${API_BASE_URL}/api/forum/posts/${postId}/replies`,
    likes: `${API_BASE_URL}/api/forum/likes`,
  },
  // 勳章 API
  badges: {
    available: `${API_BASE_URL}/api/badges/available`,
    my: `${API_BASE_URL}/api/badges/my`,
    purchase: (badgeId: string) => `${API_BASE_URL}/api/badges/purchase/${badgeId}`,
  },
  // 成就 API
  achievements: {
    my: `${API_BASE_URL}/api/achievements/my`,
    definitions: `${API_BASE_URL}/api/achievements/definitions`,
    check: `${API_BASE_URL}/api/achievements/check`,
  },
};

