import request from '../utils/axios';
import type {
  Product,
  ProductListParams,
  ProductListResponse,
  CreateProductData,
  UpdateProductData,
  AdviseProductsResponse,
  ProductDetail,
  ProductStatus,
  FollowListResponse,
  ReviewListResponse,
  ReviewLatestResponse,
  ReviewListParams,
} from '../types';

export const productsApi = {
  /**
   * 获取商品列表
   */
  async getProducts(params?: ProductListParams): Promise<ProductListResponse> {
    return request.get('/products', { params });
  },
  /**
   * 搜索商品
   */
  async search(params?: ProductListParams): Promise<ProductListResponse> {
    return request.get('/products/search', { params });
  },

  /**
   * 获取单个商品详情
   */
  async getProduct(id: string, userId?: string): Promise<ProductDetail> {
    return request.get(`/products/${id}`, { params: { userId } });
  },

  /**
   * 创建商品
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    return request.post('/products', data);
  },

  /**
   * 更新商品
   */
  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    return request.put(`/products/${id}`, data);
  },

  /**
   * 删除商品
   */
  async deleteProduct(id: string) {
    return request.delete(`/products/${id}`);
  },

  /**
   * 获取用户发布的商品
   */
  async getMyProducts(): Promise<Product[]> {
    return request.get('/products/my/list');
  },

  /**
   * 获取首页推荐商品（按分类分组）
   */
  async getAdviseProducts(): Promise<AdviseProductsResponse> {
    return request.get('/products/advise');
  },
  async toggleFavorite(productId: string): Promise<void> {
    await request.post('/products/favorite', { productId });
  },

  /**
   * 获取我的商品列表（分页）
   */
  async getMyProductsPaginated(params?: {
    status?: ProductStatus;
    page?: number;
    limit?: number;
  }): Promise<ProductListResponse> {
    return request.get('/products/mine', { params });
  },

  /**
   * 获取我的收藏商品
   */
  async getMyFavoritesProductsPaginated(params?: {
    page?: number;
    limit?: number;
  }): Promise<ProductListResponse> {
    return request.get('/products/favorites', { params });
  },

  /**
   * 获取我的收藏数量
   */
  async getFavoritesCount(): Promise<{ count: number }> {
    return request.get('/products/favorites/count');
  },

  async createFootPrint(productId: string): Promise<void> {
    return request.post('/products/footprints', { productId });
  },
  async getMyFootPrintsPaginated(): Promise<ProductListResponse> {
    return request.get('/products/footprints');
  },

  /**
   * 获取我的浏览记录数量
   */
  async getFootprintsCount(): Promise<{ count: number }> {
    return request.get('/products/footprints/count');
  },

  /**
   * 获取用户公开信息
   */
  async getUserPublic(userId: string): Promise<{
    user: {
      id: string;
      nickname: string | null;
      avatar: string | null;
      createdAt: string;
    };
    productCount: number;
  }> {
    return request.get(`/users/${userId}/public`);
  },

  /**
   * 获取用户发布的商品列表
   */
  async getUserProducts(
    userId: string,
    params?: {
      status?: ProductStatus;
      page?: number;
      limit?: number;
    },
  ): Promise<ProductListResponse> {
    return request.get(`/users/${userId}/products`, { params });
  },

  /**
   * 关注/取消关注用户
   */
  async toggleFollow(userId: string): Promise<void> {
    return request.post('/users/follow', { userId });
  },

  /**
   * 获取关注的用户列表
   */
  async getFollowing(params?: { page?: number; limit?: number }): Promise<FollowListResponse> {
    return request.get('/users/following', { params });
  },

  /**
   * 获取关注数量
   */
  async getFollowingCount(): Promise<{ count: number }> {
    return request.get('/users/following/count');
  },

  /**
   * 上传图片
   */
  async uploadImage(formData: FormData): Promise<{ url: string }> {
    return request.upload('/upload/image', formData);
  },

  /**
   * 获取商品最新一条评论及评分统计
   */
  async getLatestReview(productId: string): Promise<ReviewLatestResponse> {
    return request.get(`/products/${productId}/reviews/latest`);
  },

  /**
   * 获取商品评论列表
   */
  async getReviews(productId: string, params?: ReviewListParams): Promise<ReviewListResponse> {
    return request.get(`/products/${productId}/reviews`, { params });
  },
};
