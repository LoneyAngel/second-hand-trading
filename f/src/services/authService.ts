import * as SecureStore from 'expo-secure-store';
import { authApi } from '../api';
import type { AuthResponse, LoginData, RegisterData, User, UpdateUserData } from '../types';

/**
 * 认证服务 - 处理认证相关的业务逻辑
 */
class AuthService {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  // 用户身份
  private static readonly USER_KEY = 'user';

  /**
   * 用户注册
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await authApi.register(data);
    await this.saveAuthData(response);
    return response;
  }

  /**
   * 用户登录
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await authApi.login(data);
    await this.saveAuthData(response);
    return response;
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      console.log(
        'Auth data cleared',
        await SecureStore.getItemAsync(AuthService.ACCESS_TOKEN_KEY),
      );
      console.log(
        'Auth data cleared',
        await SecureStore.getItemAsync(AuthService.REFRESH_TOKEN_KEY),
      );
      await authApi.logout();
    } catch (error) {
      // 登出 API 失败时，只记录日志但不抛出错误
      // 因为即使后端失败，我们也要确保本地数据被清除
      console.warn('Logout API failed, but still clearing local data:', error);
    } finally {
      await this.clearAuthData();
      console.log(
        'Auth data cleared',
        await SecureStore.getItemAsync(AuthService.ACCESS_TOKEN_KEY),
      );
      console.log(
        'Auth data cleared',
        await SecureStore.getItemAsync(AuthService.REFRESH_TOKEN_KEY),
      );
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User> {
    return authApi.getMe();
  }

  /**
   * 刷新 Token
   */
  async refreshToken(refreshToken: string) {
    const response = await authApi.refresh(refreshToken);
    await this.saveTokens(response.accessToken, response.refreshToken);
    return response;
  }

  /**
   * 获取本地存储的访问 Token
   */
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(AuthService.ACCESS_TOKEN_KEY);
  }

  /**
   * 获取本地存储的刷新 Token
   */
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(AuthService.REFRESH_TOKEN_KEY);
  }

  /**
   * 获取本地存储的用户信息
   */
  async getUser(): Promise<User | null> {
    const userJson = await SecureStore.getItemAsync(AuthService.USER_KEY);
    console.log('Retrieved user from SecureStore:', userJson);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      console.error('Failed to parse user data from SecureStore');
      return null;
    }
  }

  /**
   * 检查用户是否已登录
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  /**
   * 保存认证数据
   */
  private async saveAuthData(response: AuthResponse): Promise<void> {
    await this.saveTokens(response.accessToken, response.refreshToken);
    await this.saveUser(response.user);
  }

  /**
   * 保存 Token
   */
  private async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(AuthService.ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(AuthService.REFRESH_TOKEN_KEY, refreshToken);
    console.log(
      'Tokens saved to SecureStore:',
      await SecureStore.getItemAsync(AuthService.ACCESS_TOKEN_KEY),
      await SecureStore.getItemAsync(AuthService.REFRESH_TOKEN_KEY),
    );
  }

  /**
   * 保存用户信息
   */
  private async saveUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(AuthService.USER_KEY, JSON.stringify(user));
  }

  /**
   * 清除认证数据
   */
  private async clearAuthData(): Promise<void> {
    await SecureStore.deleteItemAsync(AuthService.ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(AuthService.REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(AuthService.USER_KEY);
  }

  /**
   * 更新用户信息
   */
  async updateUser(data: UpdateUserData): Promise<User> {
    const updatedUser = await authApi.updateUser(data);
    await this.saveUser(updatedUser);
    return updatedUser;
  }

  /**
   * 更新推送 token
   */
  async updatePushToken(token: string): Promise<void> {
    await authApi.updatePushToken(token);
  }
}

export const authService = new AuthService();
