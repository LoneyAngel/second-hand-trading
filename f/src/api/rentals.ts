import request from '../utils/axios';
import type { RentalRecord, CreateRentalData, UpdateRentalStatusData } from '../types';

export const rentalsApi = {
  /**
   * 创建租借请求
   */
  async createRental(data: CreateRentalData): Promise<RentalRecord> {
    return request.post('/rentals', data);
  },

  /**
   * 获取当前用户作为租借者的记录
   */
  async getRenterRentals(): Promise<RentalRecord[]> {
    return request.get('/rentals/renter');
  },

  /**
   * 获取当前用户作为出租者的记录
   */
  async getOwnerRentals(): Promise<RentalRecord[]> {
    return request.get('/rentals/owner');
  },

  /**
   * 获取租借记录详情
   */
  async getRental(id: string): Promise<RentalRecord> {
    return request.get(`/rentals/${id}`);
  },

  /**
   * 更新租借状态
   */
  async updateRentalStatus(id: string, data: UpdateRentalStatusData): Promise<RentalRecord> {
    return request.put(`/rentals/${id}/status`, data);
  },
};
