import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authService } from '../services';
import type { User, LoginData, RegisterData, UpdateUserData } from '../types';
import * as SecureStore from 'expo-secure-store';
import { eventBus, AuthEvents } from '../utils/eventBus';
import { router } from 'expo-router';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (data: UpdateUserData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时从存储中恢复用户信息
  useEffect(() => {
    const init = async () => {
      console.log('token：');
      console.log(
        await SecureStore.getItemAsync('access_token'),
        await SecureStore.getItemAsync('refresh_token'),
      );
      await loadStoredUser();
    };
    init();
  }, []);

  // 监听 axios 派发的登出事件（例如 Token 刷新失败、401 等）
  useEffect(() => {
    const unsubscribe = eventBus.on(AuthEvents.LOGOUT, async () => {
      console.log('[useAuth] 收到登出事件，执行登出并跳转登录页');
      setUser(null);
      await authService.logout();
      router.replace('/login');
    });
    return unsubscribe;
  }, []);

  // 从存储加载用户信息
  const loadStoredUser = async () => {
    try {
      const storedUser = await authService.getUser();
      if (storedUser) {
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Failed to load stored user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 登录
  const login = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  // 注册
  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const logout = async () => {
    setIsLoading(true);
    try {
      setUser(null);
      await authService.logout();
      router.replace('/login');
    } catch (e) {
      // 登出 API 失败也要跳转登录页，本地数据已经清了
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新用户信息
  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  // 更新用户信息
  const updateUser = async (data: UpdateUserData) => {
    setIsLoading(true);
    try {
      const updatedUser = await authService.updateUser(data);
      setUser(updatedUser);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
