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

export const aiApi = {
  /**
   * AI 美化商品描述
   */
  async beautifyDescription(params: BeautifyDescriptionParams): Promise<{ data: string }> {
    return request.post('/ai/beautify-description', params, {
      timeout: 15000, // AI 接口给 15 秒超时
    });
  },
};
