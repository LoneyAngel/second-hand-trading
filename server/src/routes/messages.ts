import { Router } from 'express';
import { z } from 'zod';
import type { Message, Product, User } from '@prisma/client';
import prisma from '../lib/db';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';

export const messagesRouter = Router();

type MessageWithRelations = Message & {
  sender: Pick<User, 'id' | 'nickname' | 'avatar'>;
  receiver: Pick<User, 'id' | 'nickname' | 'avatar'>;
  product: Pick<Product, 'id' | 'title' | 'images' | 'price'> | null;
};

// 发送消息参数校验
const sendMessageSchema = z.object({
  receiverId: z.string().min(1, '接收者ID不能为空'),
  content: z.string().min(1, '消息内容不能为空'),
  type: z.enum(['text', 'image', 'system', 'product', 'order']).default('text'),
  extra: z.string().optional(),
  productId: z.string().optional(),
  rentalId: z.string().optional(),
});

// 将 DB Message 转为前端 Message 格式
function formatMessage(msg: Message & { product?: Product | null }) {
  // conversationId 用对方用户ID（单聊场景）
  return {
    id: msg.id,
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    type: (msg.type || 'text') as 'text' | 'image' | 'system' | 'product' | 'order',
    content: msg.content,
    extra: msg.extra || undefined,
    status: (msg.isRead ? 'read' : 'sent') as 'sent' | 'read',
    createdAt: msg.createdAt.toISOString(),
  };
}

/**
 * 获取会话列表
 * GET /api/messages/conversations
 */
messagesRouter.get(
  '/conversations',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const currentUserId = req.user!.userId;

    // 获取用户参与的所有消息，按时间倒序
    const messages = (await prisma.message.findMany({
      where: {
        OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, nickname: true, avatar: true },
        },
        receiver: {
          select: { id: true, nickname: true, avatar: true },
        },
        product: {
          select: { id: true, title: true, images: true, price: true },
        },
      },
    })) as MessageWithRelations[];

    // 按对方用户ID分组，取每组最新一条消息作为会话
    const conversationMap = new Map<
      string,
      {
        otherUser: { id: string; nickname: string | null; avatar: string | null };
        lastMessage: string;
        lastMessageTime: Date;
        unreadCount: number;
        product?: { id: string; title: string; image: string; price: number };
      }
    >();

    for (const msg of messages) {
      const otherUser = msg.senderId === currentUserId ? msg.receiver : msg.sender;
      const otherUserId = otherUser.id;

      if (conversationMap.has(otherUserId)) continue;

      // 计算未读数：对方发给我的、未读的消息数量
      const unreadCount = messages.filter(
        (m) => m.senderId === otherUserId && m.receiverId === currentUserId && !m.isRead,
      ).length;

      const conversation: {
        otherUser: { id: string; nickname: string | null; avatar: string | null };
        lastMessage: string;
        lastMessageTime: Date;
        unreadCount: number;
        product?: { id: string; title: string; image: string; price: number };
      } = {
        otherUser: {
          id: otherUser.id,
          nickname: otherUser.nickname,
          avatar: otherUser.avatar,
        },
        lastMessage: msg.content,
        lastMessageTime: msg.createdAt,
        unreadCount,
      };

      if (msg.product) {
        conversation.product = {
          id: msg.product.id,
          title: msg.product.title,
          image: msg.product.images?.[0] || '',
          price: Number(msg.product.price),
        };
      }

      conversationMap.set(otherUserId, conversation);
    }

    // 按最后消息时间倒序排列
    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime(),
    );

    const data = conversations.map((c) => ({
      id: c.otherUser.id, // 会话ID用对方用户ID
      otherUser: c.otherUser,
      product: c.product,
      lastMessage: c.lastMessage,
      lastMessageTime: c.lastMessageTime.toISOString(),
      unreadCount: c.unreadCount,
    }));

    res.json({
      data,
      total: data.length,
    });
  }),
);

/**
 * 获取与某个用户的聊天记录
 * GET /api/messages/:userId
 */
messagesRouter.get(
  '/:userId',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const currentUserId = req.user!.userId;
    const targetUserId = String(req.params.userId);
    const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1);
    const pageSize = Math.min(100, parseInt(String(req.query.pageSize || '20')) || 20);

    // 验证对方用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, nickname: true, avatar: true },
    });
    if (!targetUser) {
      throw new ApiError(404, '用户不存在');
    }

    // 获取消息总数
    const total = await prisma.message.count({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId },
        ],
      },
    });

    // 分页获取消息（按时间倒序，前端展示时再翻转）
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        product: true,
      },
    });

    // 订单消息：查询最新订单状态覆盖 extra 里的旧快照
    const orderMsgs = messages.filter((m) => m.type === 'order' && m.extra);
    if (orderMsgs.length > 0) {
      const rentalIds = orderMsgs.map((m) => JSON.parse(m.extra!).orderId as string);
      const rentals = await prisma.rentalRecord.findMany({
        where: { id: { in: rentalIds } },
        include: {
          product: { select: { id: true, title: true, images: true, price: true } },
        },
      });
      const rentalMap = new Map(rentals.map((r) => [r.id, r]));
      for (const msg of messages) {
        if (msg.type !== 'order' || !msg.extra) continue;
        const orderId = JSON.parse(msg.extra).orderId as string;
        const rental = rentalMap.get(orderId);
        if (!rental) continue;
        (msg as any).extra = JSON.stringify({
          orderId: rental.id,
          productId: rental.productId,
          productTitle: rental.product?.title || '',
          productImage: (rental.product?.images as string[])?.[0] || '',
          productPrice: Number(rental.product?.price || 0),
          status: rental.status,
          startDate: rental.startDate.toISOString(),
          endDate: rental.endDate.toISOString(),
          totalAmount: Number(rental.totalAmount),
          completeRequestedBy: rental.completeRequestedBy || undefined,
        });
      }
    }

    // 按时间倒序返回（最新的在前，前端展示时再翻转）
    const data = messages.map((msg) => ({
      ...formatMessage(msg),
      conversationId: targetUserId,
    }));

    const hasMore = page * pageSize < total;

    res.json({
      data,
      total,
      hasMore,
    });
  }),
);

/**
 * 发送消息
 * POST /api/messages
 */
messagesRouter.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = sendMessageSchema.parse(req.body);
    const senderId = req.user!.userId;

    // 不能给自己发消息
    if (senderId === body.receiverId) {
      throw new ApiError(400, '不能给自己发送消息');
    }

    // 验证接收者是否存在
    const receiver = await prisma.user.findUnique({
      where: { id: body.receiverId },
      select: { id: true },
    });
    if (!receiver) {
      throw new ApiError(404, '接收者不存在');
    }

    let extraValue = body.extra;

    // 订单消息：通过 rentalId 查询订单详情并序列化到 extra
    if (body.type === 'order' && body.rentalId) {
      const rental = await prisma.rentalRecord.findUnique({
        where: { id: body.rentalId },
        include: {
          product: { select: { id: true, title: true, images: true, price: true } },
        },
      });
      if (rental) {
        extraValue = JSON.stringify({
          orderId: rental.id,
          productId: rental.productId,
          productTitle: rental.product?.title || '',
          productImage: (rental.product?.images as string[])?.[0] || '',
          productPrice: Number(rental.product?.price || 0),
          status: rental.status,
          startDate: rental.startDate.toISOString(),
          endDate: rental.endDate.toISOString(),
          totalAmount: Number(rental.totalAmount),
          completeRequestedBy: rental.completeRequestedBy || undefined,
        });
      }
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId: body.receiverId,
        content: body.content,
        type: body.type,
        extra: extraValue,
        productId: body.productId,
      },
      include: {
        product: true,
      },
    });

    res.json({
      data: {
        ...formatMessage(message),
        conversationId: body.receiverId,
      },
    });
  }),
);

/**
 * 标记会话已读
 * PUT /api/messages/:userId/read
 */
messagesRouter.put(
  '/:userId/read',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const currentUserId = req.user!.userId;
    const targetUserId = String(req.params.userId);

    // 将对方发给我的所有未读消息标记为已读
    const result = await prisma.message.updateMany({
      where: {
        senderId: targetUserId,
        receiverId: currentUserId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.json({
      message: '已标记为已读',
      updatedCount: result.count,
    });
  }),
);

/**
 * 删除会话（删除与某个用户的所有消息）
 * DELETE /api/messages/conversations/:userId
 */
messagesRouter.delete(
  '/conversations/:userId',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const currentUserId = req.user!.userId;
    const targetUserId = String(req.params.userId);

    // 删除双方之间的所有消息
    const result = await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId },
        ],
      },
    });

    res.json({
      message: '会话已删除',
      deletedCount: result.count,
    });
  }),
);
