import request from '../utils/axios';
import type { Category } from '../types';

export const categoriesApi = {
  /**
   * 获取所有分类
   */
  async getCategories(): Promise<Category[]> {
    return request.get('/categories');
  },

  /**
   * 获取单个分类
   */
  async getCategory(id: string): Promise<Category> {
    return request.get(`/categories/${id}`);
  },
};
