import { categoriesApi } from '../api';
import type { Category } from '../types';

/**
 * 分类服务 - 处理分类相关的业务逻辑
 */
class CategoryService {
  /**
   * 获取所有分类
   */
  async getCategories(): Promise<Category[]> {
    return categoriesApi.getCategories();
  }

  /**
   * 获取单个分类
   */
  async getCategory(id: string): Promise<Category> {
    return categoriesApi.getCategory(id);
  }
}

export const categoryService = new CategoryService();
