import { Router } from 'express';
import { z } from 'zod';
import type { Message, User } from '@prisma/client';
import prisma from '../lib/db';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';

export const messagesRouter = Router();

type MessageWithSender = Message & {
  sender: Pick<User, 'id' | 'nickname' | 'avatar'>;
};

type MessageWithBoth = Message & {
  sender: Pick<User, 'id' | 'nickname' | 'avatar'>;
  receiver: Pick<User, 'id' | 'nickname' | 'avatar'>;
};

// 发送消息参数校验
const sendMessageSchema = z.object({
  receiverId: z.string().min(1, '接收者ID不能为空'),
  content: z.string().min(1, '消息内容不能为空'),
});

/**
 * 获取会话列表
 * GET /api/messages/conversations
 */
messagesRouter.get(
  '/conversations',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const currentUserId = req.user!.userId;

    // 获取用户参与的所有消息，按对方用户分组
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
      },
    })) as MessageWithBoth[];

    // 按对方用户ID分组，取每组最新一条消息作为会话
    const conversationMap = new Map<
      string,
      {
        id: string;
        nickname: string | null;
        avatar: string | null;
        lastMessage: string;
        lastMessageTime: Date;
        unreadCount: number;
      }
    >();

    for (const msg of messages) {
      const otherUser =
        msg.senderId === currentUserId ? msg.receiver : msg.sender;
      const otherUserId = otherUser.id;

      if (!conversationMap.has(otherUserId)) {
        // 计算未读数：对方发给我的、未读的消息数量
        const unreadCount = messages.filter(
          (m: MessageWithBoth) =>
            m.senderId === otherUserId &&
            m.receiverId === currentUserId &&
            !m.isRead,
        ).length;

        conversationMap.set(otherUserId, {
          id: otherUserId,
          nickname: otherUser.nickname,
          avatar: otherUser.avatar,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount,
        });
      }
    }

    // 按最后消息时间倒序排列
    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime(),
    );

    res.json({
      list: conversations,
      total: conversations.length,
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
    const pageSize = Math.min(
      100,
      parseInt(String(req.query.pageSize || '20')) || 20,
    );

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
    const messages = (await prisma.message.findMany({
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
        sender: {
          select: { id: true, nickname: true, avatar: true },
        },
      },
    })) as MessageWithSender[];

    // 按时间正序返回
    const sortedMessages = messages
      .map((msg: MessageWithSender) => ({
        id: msg.id,
        senderId: msg.senderId,
        content: msg.content,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        sender: msg.sender,
      }))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    res.json({
      list: sortedMessages,
      total,
      page,
      pageSize,
      targetUser,
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
    const { receiverId, content } = sendMessageSchema.parse(req.body);
    const senderId = req.user!.userId;

    // 不能给自己发消息
    if (senderId === receiverId) {
      throw new ApiError(400, '不能给自己发送消息');
    }

    // 验证接收者是否存在
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });
    if (!receiver) {
      throw new ApiError(404, '接收者不存在');
    }

    const message = (await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
      },
      include: {
        sender: {
          select: { id: true, nickname: true, avatar: true },
        },
      },
    })) as MessageWithSender;

    res.json({
      data: {
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt,
        sender: message.sender,
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
