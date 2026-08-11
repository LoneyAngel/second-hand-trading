import request from '../utils/axios';
import type { Address, CreateAddressData, UpdateAddressData, AddressListResponse } from '../types';

export const addressesApi = {
  /**
   * 获取所有地址
   */
  async getAddresses(): Promise<AddressListResponse> {
    return request.get('/addresses');
  },

  /**
   * 获取默认地址
   */
  async getDefaultAddress(): Promise<{ data: Address | null }> {
    return request.get('/addresses/default');
  },

  /**
   * 创建地址
   */
  async createAddress(data: CreateAddressData): Promise<{ data: Address }> {
    return request.post('/addresses', data);
  },

  /**
   * 修改地址
   */
  async updateAddress(id: string, data: UpdateAddressData): Promise<{ data: Address }> {
    return request.put(`/addresses/${id}`, data);
  },

  /**
   * 删除地址
   */
  async deleteAddress(id: string): Promise<void> {
    return request.delete(`/addresses/${id}`);
  },

  /**
   * 设置默认地址
   */
  async setDefaultAddress(id: string): Promise<{ data: Address }> {
    return request.put(`/addresses/${id}/default`);
  },
};
