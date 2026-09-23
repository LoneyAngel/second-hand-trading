import { Router } from 'express';
import { z } from 'zod';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '../config/env';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';

export const aiRouter = Router();

// 创建 AI provider（支持自定义 baseURL，兼容火山引擎等 OpenAI 兼容服务）
const aiProvider = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL || undefined,
});

// AI 模型名（可通过环境变量覆盖，默认 gpt-4o-mini）
const AI_MODEL = env.OPENAI_MODEL || 'gpt-4o-mini';

// 美化商品描述参数校验
const beautifyDescriptionSchema = z.object({
  title: z.string().min(1, '商品标题不能为空'),
  description: z.string().default(''),
  price: z.number().positive().optional(),
  deposit: z.number().nonnegative().optional(),
  categoryName: z.string().optional(),
  priceUnit: z.enum(['day', 'hour', 'once']).default('day'),
});

// 价格单位中文映射
const priceUnitMap: Record<string, string> = {
  day: '元/天',
  hour: '元/小时',
  once: '元/次',
};

// 判断 AI 是否可用
function isAiAvailable(): boolean {
  return !!env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0;
}

/**
 * 美化商品描述
 * POST /api/ai/beautify-description
 */
aiRouter.post(
  '/beautify-description',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!isAiAvailable()) {
      throw new ApiError(503, 'AI 美化功能暂不可用');
    }

    const { title, description, price, deposit, categoryName, priceUnit } =
      beautifyDescriptionSchema.parse(req.body);

    // 构造商品信息摘要
    const productInfoParts: string[] = [];
    productInfoParts.push(`商品标题：${title}`);
    if (categoryName) productInfoParts.push(`商品分类：${categoryName}`);
    if (price !== undefined) {
      productInfoParts.push(`租金：${price}${priceUnitMap[priceUnit] || priceUnit}`);
    }
    if (deposit !== undefined) productInfoParts.push(`押金：${deposit}元`);
    if (description.trim()) {
      productInfoParts.push(`原始描述：${description}`);
    } else {
      productInfoParts.push('原始描述：（用户未填写，请根据标题合理创作）');
    }

    const productInfo = productInfoParts.join('\n');

    const systemPrompt = `你是一个二手租赁平台的专业商品文案专家。你的任务是根据用户提供的商品信息，创作一段有吸引力但不夸大的商品租赁描述文案。

要求：
1. 字数控制在 30-60 字之间
2. 突出商品亮点、成色、使用场景和租赁价值
3. 语气亲切自然，像朋友推荐一样
4. 实事求是，不虚构功能、不夸大成色
5. 纯文本输出，不要使用 Markdown 格式、不要加粗、不要列表符号
6. 段落分明，读起来流畅有吸引力
7. 可以适当加入一些租赁相关的话术，比如"日租超划算"、"短期租用性价比拉满"之类
8. 如果是电子产品，强调功能完好、配件齐全；如果是生活用品，强调干净卫生、成色新

请直接返回美化后的描述文本，不要有任何额外的解释或开场白。`;

    try {
      const result = await generateText({
        model: aiProvider.chat(AI_MODEL),
        system: systemPrompt,
        prompt: productInfo,
        temperature: 0.7,
        maxOutputTokens: 500,
      });

      const beautified = result.text.trim();

      // 和项目其他接口风格一致：直接返回数据，外层由 axios 拦截器解包
      console.log('AI 美化成功:', beautified);
      res.json({
        beautifiedDescription: beautified,
      });
    } catch (error) {
      console.error('AI 生成失败:', error);
      throw new ApiError(503, 'AI 美化功能暂不可用，请稍后再试');
    }
  }),
);
