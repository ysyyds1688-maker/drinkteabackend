import { Profile, Article, User, LoginCredentials, RegisterData, Review, ReviewsResponse, Subscription, SubscriptionStatus, SubscriptionHistory, MembershipBenefits, MembershipLevel, Favorite, UserStatsResponse, DailyTask, ForumPost, ForumReply, Badge, UserBadge, Achievement } from '../types';
import { API_ENDPOINTS, API_BASE_URL } from '../config/api';

// API 請求輔助函數
const apiRequest = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Profiles API
export const profilesApi = {
  getAll: (): Promise<Profile[]> => {
    return apiRequest<Profile[]>(API_ENDPOINTS.profiles);
  },

  getById: (id: string): Promise<Profile> => {
    return apiRequest<Profile>(`${API_ENDPOINTS.profiles}/${id}`);
  },

  create: (profile: Profile): Promise<Profile> => {
    return apiRequest<Profile>(API_ENDPOINTS.profiles, {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },

  update: (id: string, profile: Partial<Profile>): Promise<Profile> => {
    return apiRequest<Profile>(`${API_ENDPOINTS.profiles}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  delete: (id: string): Promise<void> => {
    return apiRequest<void>(`${API_ENDPOINTS.profiles}/${id}`, {
      method: 'DELETE',
    });
  },
};

// Articles API
export const articlesApi = {
  getAll: (): Promise<Article[]> => {
    return apiRequest<Article[]>(API_ENDPOINTS.articles);
  },

  getById: (id: string): Promise<Article> => {
    return apiRequest<Article>(`${API_ENDPOINTS.articles}/${id}`);
  },

  create: (article: Article): Promise<Article> => {
    return apiRequest<Article>(API_ENDPOINTS.articles, {
      method: 'POST',
      body: JSON.stringify(article),
    });
  },

  update: (id: string, article: Partial<Article>): Promise<Article> => {
    return apiRequest<Article>(`${API_ENDPOINTS.articles}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(article),
    });
  },

  delete: (id: string): Promise<void> => {
    return apiRequest<void>(`${API_ENDPOINTS.articles}/${id}`, {
      method: 'DELETE',
    });
  },
};

// Gemini API
export const geminiApi = {
  parseProfile: (text: string): Promise<Partial<Profile>> => {
    return apiRequest<Partial<Profile>>(API_ENDPOINTS.gemini.parseProfile, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  analyzeName: (input: { name1: string; mode?: string }): Promise<any> => {
    return apiRequest(API_ENDPOINTS.gemini.analyzeName, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};

// Admin API
export const adminApi = {
  getStats: () => {
    return apiRequest(API_ENDPOINTS.admin.stats);
  },

  // Profiles 管理
  profiles: {
    getAll: (): Promise<Profile[]> => {
      return apiRequest<Profile[]>(API_ENDPOINTS.admin.profiles);
    },

    getById: (id: string): Promise<Profile> => {
      return apiRequest<Profile>(`${API_ENDPOINTS.admin.profiles}/${id}`);
    },

    create: (profile: Profile): Promise<Profile> => {
      return apiRequest<Profile>(API_ENDPOINTS.admin.profiles, {
        method: 'POST',
        body: JSON.stringify(profile),
      });
    },

    update: (id: string, profile: Partial<Profile>): Promise<Profile> => {
      return apiRequest<Profile>(`${API_ENDPOINTS.admin.profiles}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
    },

    delete: (id: string): Promise<void> => {
      return apiRequest<void>(`${API_ENDPOINTS.admin.profiles}/${id}`, {
        method: 'DELETE',
      });
    },

    batch: (action: string, ids: string[], data?: any) => {
      return apiRequest(`${API_ENDPOINTS.admin.profiles}/batch`, {
        method: 'POST',
        body: JSON.stringify({ action, ids, data }),
      });
    },
  },

  // Articles 管理
  articles: {
    getAll: (): Promise<Article[]> => {
      return apiRequest<Article[]>(API_ENDPOINTS.admin.articles);
    },

    getById: (id: string): Promise<Article> => {
      return apiRequest<Article>(`${API_ENDPOINTS.admin.articles}/${id}`);
    },

    create: (article: Article): Promise<Article> => {
      return apiRequest<Article>(API_ENDPOINTS.admin.articles, {
        method: 'POST',
        body: JSON.stringify(article),
      });
    },

    update: (id: string, article: Partial<Article>): Promise<Article> => {
      return apiRequest<Article>(`${API_ENDPOINTS.admin.articles}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(article),
      });
    },

    delete: (id: string): Promise<void> => {
      return apiRequest<void>(`${API_ENDPOINTS.admin.articles}/${id}`, {
        method: 'DELETE',
      });
    },

    batch: (action: string, ids: string[], data?: any) => {
      return apiRequest(`${API_ENDPOINTS.admin.articles}/batch`, {
        method: 'POST',
        body: JSON.stringify({ action, ids, data }),
      });
    },
  },
};

// Auth API
export const authApi = {
  register: async (data: RegisterData): Promise<{ user: User; token: string; refreshToken: string }> => {
    return apiRequest<{ user: User; token: string; refreshToken: string }>(API_ENDPOINTS.auth.register, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login: async (credentials: LoginCredentials): Promise<{ user: User; token: string; refreshToken: string }> => {
    return apiRequest<{ user: User; token: string; refreshToken: string }>(API_ENDPOINTS.auth.login, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  logout: async (): Promise<void> => {
    return apiRequest<void>(API_ENDPOINTS.auth.logout, {
      method: 'POST',
    });
  },

  getMe: async (): Promise<User> => {
    return apiRequest<User>(API_ENDPOINTS.auth.me, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
  },

  getUserProfile: async (userId: string): Promise<any> => {
    return apiRequest<any>(`${API_ENDPOINTS.auth.base}/users/${userId}`);
  },

  updateMe: async (data: { userName?: string; avatarUrl?: string }): Promise<User> => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('未授权，请先登录');
    }
    
    // 确保 API_BASE_URL 有值
    const baseUrl = API_BASE_URL || 'https://backenddrinktea.zeabur.app';
    const url = `${baseUrl}/api/auth/me`;
    
    if (!url || url === '/api/auth/me' || !url.startsWith('http')) {
      console.error('API_BASE_URL:', API_BASE_URL);
      console.error('Constructed URL:', url);
      throw new Error(`API 端点未配置: ${url}`);
    }
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      console.error('updateMe error:', error);
      console.error('URL:', url);
      console.error('Data:', data);
      throw error;
    }
  },
};

// Reviews API
export const reviewsApi = {
  getByProfileId: async (profileId: string): Promise<ReviewsResponse> => {
    return apiRequest<ReviewsResponse>(API_ENDPOINTS.reviews.getByProfile(profileId));
  },

  create: async (profileId: string, data: { rating: number; comment: string; serviceType?: string; clientName?: string }): Promise<Review> => {
    return apiRequest<Review>(API_ENDPOINTS.reviews.create(profileId), {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (reviewId: string, data: { rating?: number; comment?: string; serviceType?: string }): Promise<Review> => {
    return apiRequest<Review>(API_ENDPOINTS.reviews.update(reviewId), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (reviewId: string): Promise<void> => {
    return apiRequest<void>(API_ENDPOINTS.reviews.delete(reviewId), {
      method: 'DELETE',
    });
  },

  like: async (reviewId: string): Promise<{ liked: boolean }> => {
    return apiRequest<{ liked: boolean }>(API_ENDPOINTS.reviews.like(reviewId), {
      method: 'POST',
    });
  },

  reply: async (reviewId: string, content: string): Promise<any> => {
    return apiRequest(API_ENDPOINTS.reviews.reply(reviewId), {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};

// Subscriptions API
export const subscriptionsApi = {
  getMy: async (): Promise<SubscriptionStatus> => {
    return apiRequest<SubscriptionStatus>(API_ENDPOINTS.subscriptions.my);
  },

  subscribe: async (membershipLevel: MembershipLevel, duration?: number): Promise<{ message: string; membershipLevel: MembershipLevel; membershipExpiresAt: string; subscription: Subscription }> => {
    return apiRequest(API_ENDPOINTS.subscriptions.subscribe, {
      method: 'POST',
      body: JSON.stringify({ membershipLevel, duration }),
    });
  },

  getHistory: async (): Promise<SubscriptionHistory> => {
    return apiRequest<SubscriptionHistory>(API_ENDPOINTS.subscriptions.history);
  },

  cancel: async (): Promise<{ message: string }> => {
    return apiRequest(API_ENDPOINTS.subscriptions.cancel, {
      method: 'POST',
    });
  },

  getBenefits: async (): Promise<{ benefits: MembershipBenefits[] }> => {
    return apiRequest<{ benefits: MembershipBenefits[] }>(API_ENDPOINTS.subscriptions.benefits);
  },
};

// Favorites API
export const favoritesApi = {
  add: (profileId: string): Promise<Favorite> => {
    return apiRequest<Favorite>(`${API_BASE_URL}/api/favorites`, {
      method: 'POST',
      body: JSON.stringify({ profileId }),
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });
  },
  remove: (profileId: string): Promise<void> => {
    return apiRequest<void>(`${API_BASE_URL}/api/favorites/${profileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
  },
  check: (profileId: string): Promise<{ isFavorited: boolean }> => {
    return apiRequest<{ isFavorited: boolean }>(`${API_BASE_URL}/api/favorites/check/${profileId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
  },
  getMy: (): Promise<{ favorites: Favorite[]; profiles: Profile[] }> => {
    return apiRequest<{ favorites: Favorite[]; profiles: Profile[] }>(`${API_BASE_URL}/api/favorites/my`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
  },
};

// User Stats API
export const userStatsApi = {
  getMy: async (): Promise<UserStatsResponse> => {
    return apiRequest<UserStatsResponse>(`${API_BASE_URL}/api/user-stats/me`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
  },
};

// Tasks API
export const tasksApi = {
  getDaily: async (date?: string): Promise<{ tasks: DailyTask[] }> => {
    const url = date 
      ? `${API_BASE_URL}/api/tasks/daily?date=${date}`
      : `${API_BASE_URL}/api/tasks/daily`;
    return apiRequest<{ tasks: DailyTask[] }>(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
  },
  getDefinitions: async (): Promise<{ definitions: any[] }> => {
    return apiRequest<{ definitions: any[] }>(`${API_BASE_URL}/api/tasks/definitions`);
  },
};

// Forum API
export const forumApi = {
  getPosts: async (options?: { category?: string; sortBy?: string; limit?: number; offset?: number }): Promise<{ posts: ForumPost[] }> => {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const url = `${API_BASE_URL}/api/forum/posts${params.toString() ? '?' + params.toString() : ''}`;
    return apiRequest<{ posts: ForumPost[] }>(url);
  },
  
  getPostById: async (id: string): Promise<{ post: ForumPost; replies: ForumReply[]; isLiked: boolean }> => {
    return apiRequest<{ post: ForumPost; replies: ForumReply[]; isLiked: boolean }>(`${API_BASE_URL}/api/forum/posts/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
  },
  
  createPost: async (data: { title: string; content: string; category: string; tags?: string[] }): Promise<{ post: ForumPost }> => {
    return apiRequest<{ post: ForumPost }>(`${API_BASE_URL}/api/forum/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(data)
    });
  },
  
  createReply: async (postId: string, data: { content: string; parentReplyId?: string }): Promise<{ reply: ForumReply }> => {
    return apiRequest<{ reply: ForumReply }>(`${API_BASE_URL}/api/forum/posts/${postId}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(data)
    });
  },
  
  toggleLike: async (targetType: 'post' | 'reply', targetId: string): Promise<{ liked: boolean }> => {
    return apiRequest<{ liked: boolean }>(`${API_BASE_URL}/api/forum/likes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ targetType, targetId })
    });
  },
};

// Badges API
export const badgesApi = {
  getAvailable: async (): Promise<{ badges: Badge[] }> => {
    return apiRequest<{ badges: Badge[] }>(`${API_BASE_URL}/api/badges/available`);
  },
  
  getMy: async (): Promise<{ badges: UserBadge[] }> => {
    return apiRequest<{ badges: UserBadge[] }>(`${API_BASE_URL}/api/badges/my`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
  },
  
  purchase: async (badgeId: string): Promise<{ badge: UserBadge; message: string }> => {
    return apiRequest<{ badge: UserBadge; message: string }>(`${API_BASE_URL}/api/badges/purchase/${badgeId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
  },
};

// Achievements API
export const achievementsApi = {
  getMy: async (): Promise<{ achievements: Achievement[] }> => {
    return apiRequest<{ achievements: Achievement[] }>(`${API_BASE_URL}/api/achievements/my`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
  },
  
  getDefinitions: async (): Promise<{ definitions: any[] }> => {
    return apiRequest<{ definitions: any[] }>(`${API_BASE_URL}/api/achievements/definitions`);
  },
  
  check: async (): Promise<{ unlocked: Achievement[]; count: number }> => {
    return apiRequest<{ unlocked: Achievement[]; count: number }>(`${API_BASE_URL}/api/achievements/check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
  },
};

