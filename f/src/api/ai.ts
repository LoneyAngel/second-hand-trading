import request from '../utils/axios';
import type { PriceUnit } from '../types';

export interface BeautifyDescriptionParams {
  title: string;
  description?: string;
  price?: number;
  deposit?: number;
  categoryName?: string;
  priceUnit?: PriceUnit;
}

export interface BeautifyDescriptionResponse {
  beautifiedDescription: string;
}

export const aiApi = {
  /**
   * AI 美化商品描述
   */
  async beautifyDescription(
    params: BeautifyDescriptionParams,
  ): Promise<BeautifyDescriptionResponse> {
    return request.post('/ai/beautify-description', params, {
      timeout: 15000, // AI 接口给 15 秒超时
    });
  },
};
