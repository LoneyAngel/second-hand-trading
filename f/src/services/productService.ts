import { productsApi } from '../api';
import type {
  Product,
  ProductListParams,
  ProductListResponse,
  CreateProductData,
  UpdateProductData,
  AdviseProductsResponse,
  ProductDetail,
  ProductStatus,
} from '../types';

/**
 * 商品服务 - 处理商品相关的业务逻辑
 */
class ProductService {
  /**
   * 获取商品列表
   */
  async getProducts(params?: ProductListParams): Promise<ProductListResponse> {
    return productsApi.getProducts(params);
  }

  /**
   * 搜索商品
   */
  async search(params?: ProductListParams): Promise<ProductListResponse> {
    return productsApi.search(params);
  }

  /**
   * 获取商品详情
   */
  async getProduct(id: string, userId?: string): Promise<ProductDetail> {
    return productsApi.getProduct(id, userId);
  }

  /**
   * 发布商品
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    return productsApi.createProduct(data);
  }

  /**
   * 更新商品
   */
  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    return productsApi.updateProduct(id, data);
  }

  /**
   * 删除商品
   */
  async deleteProduct(id: string) {
    return productsApi.deleteProduct(id);
  }

  /**
   * 获取用户发布的商品
   */
  async getMyProducts(): Promise<Product[]> {
    return productsApi.getMyProducts();
  }

  /**
   * 获取首页推荐商品（按分类分组）
   */
  async getAdviseProducts(): Promise<AdviseProductsResponse> {
    return productsApi.getAdviseProducts();
  }
  async toggleFavorite(productId: string): Promise<void> {
    await productsApi.toggleFavorite(productId);
  }

  /**
   * 获取我的商品列表（分页）
   */
  async getMyProductsPaginated(params?: {
    status?: ProductStatus;
    page?: number;
    limit?: number;
  }): Promise<ProductListResponse> {
    return productsApi.getMyProductsPaginated(params);
  }

  /**
   * 获取我的收藏数量
   */
  async getFavoritesCount(): Promise<{ count: number }> {
    return productsApi.getFavoritesCount();
  }
  /**
   * 获取我的收藏的商品列表（分页）
   */
  async getMyFavoritesProductsPaginated(params?: {
    page?: number;
    limit?: number;
  }): Promise<ProductListResponse> {
    return productsApi.getMyFavoritesProductsPaginated(params);
  }

  async createFootPrint(productId: string): Promise<void> {
    return productsApi.createFootPrint(productId);
  }
  async getMyFootPrintsPaginated(): Promise<ProductListResponse> {
    return productsApi.getMyFootPrintsPaginated();
  }

  /**
   * 获取我的浏览记录数量
   */
  async getFootprintsCount(): Promise<{ count: number }> {
    return productsApi.getFootprintsCount();
  }

  /**
   * 获取用户公开信息
   */
  async getUserPublic(userId: string) {
    return productsApi.getUserPublic(userId);
  }

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
  ) {
    return productsApi.getUserProducts(userId, params);
  }

  /**
   * 关注/取消关注用户
   */
  async toggleFollow(userId: string): Promise<void> {
    return productsApi.toggleFollow(userId);
  }

  /**
   * 获取关注的用户列表
   */
  async getFollowing(params?: { page?: number; limit?: number }) {
    return productsApi.getFollowing(params);
  }

  /**
   * 获取关注数量
   */
  async getFollowingCount(): Promise<{ count: number }> {
    return productsApi.getFollowingCount();
  }

  /**
   * 上传图片
   */
  async uploadImage(formData: FormData): Promise<{ url: string }> {
    return productsApi.uploadImage(formData);
  }

  /**
   * 获取商品最新一条评论及评分统计
   */
  async getLatestReview(productId: string) {
    return productsApi.getLatestReview(productId);
  }

  /**
   * 获取商品评论列表
   */
  async getReviews(productId: string, params?: { rating?: number; page?: number; limit?: number }) {
    return productsApi.getReviews(productId, params);
  }
}

export const productService = new ProductService();
