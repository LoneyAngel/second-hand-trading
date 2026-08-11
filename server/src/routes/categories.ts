import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db';
import { ApiError, asyncHandler } from '../middleware/errorHandler';

export const categoriesRouter = Router();

const createCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(50, '分类名称最多50个字符').trim(),
  icon: z.string().max(100, '图标地址最多100个字符').optional().or(z.literal('')),
  sort: z.number().int('排序必须是整数').min(0, '排序不能为负数').optional().default(0),
});

const updateCategorySchema = createCategorySchema.partial();

// 获取所有分类
categoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { sort: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.json(categories);
  }),
);

// 创建分类
categoriesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createCategorySchema.parse(req.body);

    // 检查分类名称是否已存在
    const existingCategory = await prisma.category.findFirst({
      where: { name: data.name },
    });

    if (existingCategory) {
      throw new ApiError(400, '该分类名称已存在');
    }

    const category = await prisma.category.create({
      data: {
        ...data,
        // 处理空字符串的 icon 为 null
        icon: data.icon || null,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.json(category);
  }),
);

// 获取单个分类
categoriesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const category = await prisma.category.findUnique({
      where: { id: idParam },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new ApiError(404, '分类不存在');
    }

    res.json(category);
  }),
);

// 更新分类
categoriesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = updateCategorySchema.parse(req.body);

    const existingCategory = await prisma.category.findUnique({
      where: { id: idParam },
    });

    if (!existingCategory) {
      throw new ApiError(404, '分类不存在');
    }

    // 如果要更新名称，检查是否与其他分类重名
    if (data.name && data.name !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          name: data.name,
          NOT: { id: idParam },
        },
      });

      if (duplicateCategory) {
        throw new ApiError(400, '该分类名称已存在');
      }
    }

    const category = await prisma.category.update({
      where: { id: idParam },
      data: {
        ...data,
        // 处理空字符串的 icon 为 null
        ...(data.icon !== undefined && { icon: data.icon || null }),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.json(category);
  }),
);

// 删除分类
categoriesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existingCategory = await prisma.category.findUnique({
      where: { id: idParam },
    });

    if (!existingCategory) {
      throw new ApiError(404, '分类不存在');
    }

    await prisma.category.delete({ where: { id: idParam } });

    res.json({ message: '删除成功' });
  }),
);
