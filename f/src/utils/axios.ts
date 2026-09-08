import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { authService } from '../services';
import { eventBus, AuthEvents } from './eventBus';

// 定义通用后端响应数据类型
export interface ResponseData<T = any> {
  code?: number;
  message?: string;
  data?: T;
}

// 扩展请求配置接口
export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean; // 是否跳过 Token 携带
}

// 扩展内部 Axios 配置以支持 _retry 标识符
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class Request {
  private instance: AxiosInstance;
  private baseURL = 'https://ebony-producing-plugins-elite.trycloudflare.com/api';

  private timeout = 10000;
  private isRefreshing = false; // 锁：是否正在刷新 Token
  private retryQueue: ((token: string) => void)[] = []; // 队列：暂存挂起的请求

  constructor() {
    // 创建 axios 实例
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 初始化拦截器
    this.setupInterceptors();
  }
  // 🚀 向队列中添加挂起请求的方法
  private addRequestToQueue(callback: (token: string) => void) {
    this.retryQueue.push(callback);
  }

  // 🚀 刷新成功后，批量解冻并重新执行队列中的请求
  private resolveQueue(token: string) {
    this.retryQueue.forEach((callback) => callback(token));
    this.retryQueue = []; // 清空队列
  }

  private setupInterceptors() {
    // 1. 请求拦截器保持不变
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig & RequestConfig) => {
        const token = await authService.getAccessToken();
        if (token && !config.skipAuth) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error),
    );

    // 2. 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response.data,
      async (error: AxiosError) => {
        const originalRequest = error.config as RetryConfig;

        // 🚨 安全哨兵 A：刷新接口本身报错，立刻斩断
        if (originalRequest?.url?.includes('/auth/refresh')) {
          console.warn('🛑 Refresh Token 本身失效，清理并登出');
          this.isRefreshing = true;
          this.retryQueue = []; // 清空等待队列
          eventBus.emit(AuthEvents.LOGOUT);
          return Promise.reject(error);
        }

        // 🚨 安全哨兵 B：处理普通接口 401
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          // 🔥 【核心改动】：如果当前已经有请求在刷新 Token 了
          if (this.isRefreshing) {
            console.log(`⏳ 发现并发 401 请求 [${originalRequest.url}]，将其冷冻放入重试队列...`);

            // 返回一个未决议的 Promise，让这个请求“卡”在这里，不报错也不往下走
            return new Promise((resolve) => {
              this.addRequestToQueue((token: string) => {
                // 当这个回调被执行时，换上最新 Token，重新发起请求，并 resolve 掉
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.instance(originalRequest));
              });
            });
          }

          // ----------------------------------------------------
          // 🔓 第一个冲进来的 401 请求，负责去冲锋阵地刷新 Token
          // ----------------------------------------------------
          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            console.log('🔄 [大管家] 开始执行无感刷新机制...');
            const refreshToken = await authService.getRefreshToken();

            if (!refreshToken) throw new Error('本地无合法的 Refresh Token');

            // 拿着 refresh_token 去换取新的 access_token
            const response = await authService.refreshToken(refreshToken);
            const newAccessToken = response.accessToken;

            console.log('✅ 无感刷新成功！释放队列中所有挂起的并发请求...');
            // 🚀 一键复活：通知队列里所有挂起的请求，拿着新 Token 出发！
            this.resolveQueue(newAccessToken);

            // 自身也换上新 Token 重新发送
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }

            this.isRefreshing = false; // 释放锁
            return this.instance(originalRequest);
          } catch (refreshError: any) {
            console.error('❌ 凭证彻底过期或无感刷新彻底挂掉:', refreshError.message);

            this.isRefreshing = true;
            this.retryQueue = []; // 清空队列，防止后续无谓的重试
            eventBus.emit(AuthEvents.LOGOUT);

            return Promise.reject(refreshError);
          }
        }

        this.handleHttpError(error);
        return Promise.reject(error);
      },
    );
  }

  // 统一错误警告打印
  private handleHttpError(error: AxiosError) {
    if (error.response) {
      const { status, data } = error.response;
      const serverMessage = (data as ResponseData)?.message;

      switch (status) {
        case 401:
          console.warn('未授权，请重新登录');
          break;
        case 403:
          console.warn('权限不足，拒绝访问');
          break;
        case 404:
          console.warn('请求的后端资源不存在');
          break;
        case 500:
          console.warn('后端服务器开小差了 (500)');
          break;
        default:
          console.warn(serverMessage || `网络请求错误 (${status})`);
      }
    } else if (error.request) {
      console.warn('网络错误，无法连接到 Express 服务器，请检查网络');
    } else {
      console.warn('请求链配置错误');
    }
  }

  // ==========================================
  // 💡 外部业务调用 API 映射（支持泛型透传）
  // ==========================================

  public get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.instance.get(url, config);
  }

  public post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.post(url, data, config);
  }

  public put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.put(url, data, config);
  }

  public patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.patch(url, data, config);
  }

  public delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.instance.delete(url, config);
  }

  // 校园网二手平台高频使用的文件/图片上传方法
  public upload<T = any>(url: string, formData: FormData, config?: RequestConfig): Promise<T> {
    return this.instance.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    });
  }
}

// 导出全局唯一的网络单例对象
const request = new Request();
export default request;
