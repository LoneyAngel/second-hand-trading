import request from '../utils/axios';
import type {
  AuthResponse,
  LoginData,
  RegisterData,
  RefreshTokenResponse,
  User,
  UpdateUserData,
} from '../types';

export const authApi = {
  /**
   * 用户注册
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    return request.post('/auth/register', data);
  },

  /**
   * 用户登录
   */
  async login(data: LoginData): Promise<AuthResponse> {
    return request.post('/auth/login', data);
  },

  /**
   * 刷新 Token
   */
  async refresh(refreshToken: string): Promise<RefreshTokenResponse> {
    return request.post('/auth/refresh', { refreshToken });
  },

  /**
   * 获取当前用户信息
   */
  async getMe() {
    return request.get('/users/me');
  },

  /**
   * 用户登出
   */
  async logout() {
    return request.post('/auth/logout');
  },

  /**
   * 更新用户信息
   */
  async updateUser(data: UpdateUserData): Promise<User> {
    return request.put('/users/profile', data);
  },

  /**
   * 更新推送 token
   */
  async updatePushToken(token: string) {
    return request.post('/users/push-token', { token });
  },
};
