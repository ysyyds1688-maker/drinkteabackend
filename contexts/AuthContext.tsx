import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserStatus, Subscription } from '../types';
import { authApi, subscriptionsApi } from '../services/apiService';

interface AuthContextType {
  user: User | null;
  subscription: Subscription | null;
  userStatus: UserStatus;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  login: (emailOrPhone: string, password: string, isEmail: boolean) => Promise<void>;
  register: (emailOrPhone: string, password: string, isEmail: boolean, role: 'provider' | 'client', age: number) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  // 从localStorage恢复token和用户信息
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('auth_user');
      
      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          
          // 验证token并获取最新用户信息
          try {
            const currentUser = await authApi.getMe();
            setUser(currentUser);
            localStorage.setItem('auth_user', JSON.stringify(currentUser));
            
            // 获取订阅状态
            try {
              const sub = await subscriptionsApi.getMy();
              setSubscription(sub);
            } catch (error) {
              console.error('Failed to load subscription:', error);
            }
          } catch (error) {
            // Token无效，清除
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('refresh_token');
            setUser(null);
          }
        } catch (error) {
          console.error('Failed to parse saved user:', error);
          localStorage.removeItem('auth_user');
        }
      }
      
      setLoading(false);
    };
    
    initAuth();
  }, []);

  const login = async (emailOrPhone: string, password: string, isEmail: boolean) => {
    const credentials = isEmail
      ? { email: emailOrPhone, password }
      : { phoneNumber: emailOrPhone, password };
    
    const response = await authApi.login(credentials);
    
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('refresh_token', response.refreshToken);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
    
    setUser(response.user);
    
    // 获取订阅状态
    try {
      const sub = await subscriptionsApi.getMy();
      setSubscription(sub);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    }
  };

  const register = async (emailOrPhone: string, password: string, isEmail: boolean, role: 'provider' | 'client', age: number) => {
    const data = isEmail
      ? { email: emailOrPhone, password, role, age }
      : { phoneNumber: emailOrPhone, password, role, age };
    
    const response = await authApi.register(data);
    
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('refresh_token', response.refreshToken);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
    
    setUser(response.user);
    
    // 获取订阅状态
    try {
      const sub = await subscriptionsApi.getMy();
      setSubscription(sub);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    
    setUser(null);
    setSubscription(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);
      localStorage.setItem('auth_user', JSON.stringify(currentUser));
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  const refreshSubscription = async () => {
    try {
      const sub = await subscriptionsApi.getMy();
      setSubscription(sub);
    } catch (error) {
      console.error('Failed to refresh subscription:', error);
    }
  };

  const isAuthenticated = !!user;
  const isSubscribed = subscription?.isActive || false;
  
  const userStatus: UserStatus = !user
    ? 'guest'
    : isSubscribed
    ? 'subscribed'
    : 'logged_in';

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        userStatus,
        isAuthenticated,
        isSubscribed,
        login,
        register,
        logout,
        refreshUser,
        refreshSubscription,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

