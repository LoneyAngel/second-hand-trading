import { addressesApi } from '../api';
import type { Address, CreateAddressData, UpdateAddressData, AddressListResponse } from '../types';

/**
 * 地址服务 - 处理地址相关的业务逻辑
 */
class AddressService {
  /**
   * 获取所有地址
   */
  async getAddresses(): Promise<AddressListResponse> {
    return addressesApi.getAddresses();
  }

  /**
   * 获取默认地址
   */
  async getDefaultAddress(): Promise<Address | null> {
    const res = await addressesApi.getDefaultAddress();
    return res.data || null;
  }

  /**
   * 创建地址
   */
  async createAddress(data: CreateAddressData): Promise<Address> {
    const res = await addressesApi.createAddress(data);
    return res.data;
  }

  /**
   * 修改地址
   */
  async updateAddress(id: string, data: UpdateAddressData): Promise<Address> {
    const res = await addressesApi.updateAddress(id, data);
    return res.data;
  }

  /**
   * 删除地址
   */
  async deleteAddress(id: string): Promise<void> {
    return addressesApi.deleteAddress(id);
  }

  /**
   * 设置默认地址
   */
  async setDefaultAddress(id: string): Promise<Address> {
    const res = await addressesApi.setDefaultAddress(id);
    return res.data;
  }
}

export const addressService = new AddressService();
