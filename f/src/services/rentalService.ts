import { rentalsApi } from '../api';
import type { RentalRecord, CreateRentalData, UpdateRentalStatusData } from '../types';

/**
 * 租借服务 - 处理租借相关的业务逻辑
 */
class RentalService {
  /**
   * 创建租借请求
   */
  async createRental(data: CreateRentalData): Promise<RentalRecord> {
    return rentalsApi.createRental(data);
  }

  /**
   * 获取用户作为租借者的记录
   */
  async getRenterRentals(): Promise<RentalRecord[]> {
    return rentalsApi.getRenterRentals();
  }

  /**
   * 获取用户作为出租者的记录
   */
  async getOwnerRentals(): Promise<RentalRecord[]> {
    return rentalsApi.getOwnerRentals();
  }

  /**
   * 获取租借记录详情
   */
  async getRental(id: string): Promise<RentalRecord> {
    return rentalsApi.getRental(id);
  }

  /**
   * 更新租借状态
   */
  async updateRentalStatus(id: string, data: UpdateRentalStatusData): Promise<RentalRecord> {
    return rentalsApi.updateRentalStatus(id, data);
  }
}

export const rentalService = new RentalService();
