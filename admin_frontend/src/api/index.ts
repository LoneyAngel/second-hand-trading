import axios from 'axios';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器：附 token
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
request.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (location.pathname !== '/login') {
        location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

// ========== 认证 ==========
export const authApi = {
  login(data: { phone: string; password: string }) {
    return request.post('/admin/login', data) as Promise<{
      accessToken: string;
      user: { id: string; phone: string; nickname: string };
    }>;
  },
};

// ========== 统计 ==========
export const statsApi = {
  overview() {
    return request.get('/admin/stats/overview') as Promise<{
      userCount: number;
      productCount: number;
      orderCount: number;
      todayOrders: number;
    }>;
  },
};

// ========== 商品管理 ==========
export const productsApi = {
  list(params: { page?: number; limit?: number; status?: string; keyword?: string }) {
    return request.get('/admin/products', { params }) as Promise<{
      data: any[];
      total: number;
    }>;
  },
  updateStatus(id: string, status: string) {
    return request.put(`/admin/products/${id}/status`, { status });
  },
  delete(id: string) {
    return request.delete(`/admin/products/${id}`);
  },
};

// ========== 用户管理 ==========
export const usersApi = {
  list(params: { page?: number; limit?: number; keyword?: string }) {
    return request.get('/admin/users', { params }) as Promise<{
      data: any[];
      total: number;
    }>;
  },
};

// ========== 订单管理 ==========
export const ordersApi = {
  list(params: { page?: number; limit?: number; status?: string }) {
    return request.get('/admin/rentals', { params }) as Promise<{
      data: any[];
      total: number;
    }>;
  },
  updateStatus(id: string, status: string) {
    return request.put(`/admin/rentals/${id}/status`, { status });
  },
};
