import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import prisma from '../lib/db';
import type { Product, Message } from '@prisma/client';

// 在线用户映射：userId -> socketId
const onlineUsers = new Map<string, string>();

export function setupSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // 鉴权中间件
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log(`[Socket] 用户连接: ${userId}`);
    onlineUsers.set(userId, socket.id);

    // 加入个人房间（用于定向推送）
    socket.join(`user:${userId}`);

    // 发送消息
    socket.on(
      'message:send',
      async (data: {
        receiverId: string;
        content: string;
        type?: string;
        extra?: string;
        productId?: string;
        rentalId?: string;
        clientId?: string;
      }) => {
        try {
          const {
            receiverId,
            content,
            type = 'text',
            extra,
            productId,
            rentalId,
            clientId,
          } = data;

          if (!receiverId || !content) return;
          if (receiverId === userId) return;

          // 存入数据库
          const message = await prisma.message.create({
            data: {
              senderId: userId,
              receiverId,
              content,
              type,
              extra,
              productId,
            },
            include: {
              product: true,
            },
          });

          // 如果是订单消息，查询订单详情
          let rental = null;
          if (type === 'order' && rentalId) {
            rental = await prisma.rentalRecord.findUnique({
              where: { id: rentalId },
              include: {
                product: { select: { id: true, title: true, images: true, price: true } },
              },
            });
          }

          const formatted = formatMessage(message, rental);

          // 发送给接收者
          socket.to(`user:${receiverId}`).emit('message:receive', formatted);

          // 发送给发送者自己（确认送达）
          socket.emit('message:sent', { ...formatted, clientId });

          // 通知双方会话列表更新
          emitConversationUpdate(io, userId);
          emitConversationUpdate(io, receiverId);
        } catch (err) {
          console.error('[Socket] 发送消息失败:', err);
          socket.emit('message:error', { clientId: data.clientId, error: '发送失败' });
        }
      },
    );

    // 标记会话已读
    socket.on('message:read', async (targetUserId: string) => {
      try {
        if (!targetUserId) return;

        await prisma.message.updateMany({
          where: {
            senderId: targetUserId,
            receiverId: userId,
            isRead: false,
          },
          data: { isRead: true },
        });

        // 通知对方：你的消息已被我读了
        socket.to(`user:${targetUserId}`).emit('message:read:ack', {
          fromUserId: userId,
        });

        // 更新自己的会话列表未读数
        emitConversationUpdate(io, userId);
      } catch (err) {
        console.error('[Socket] 标记已读失败:', err);
      }
    });

    // 正在输入（可选，简单实现）
    socket.on('typing', (targetUserId: string, isTyping: boolean) => {
      socket.to(`user:${targetUserId}`).emit('typing', userId, isTyping);
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`[Socket] 用户断开: ${userId}`);
      if (onlineUsers.get(userId) === socket.id) {
        onlineUsers.delete(userId);
      }
    });
  });

  return io;
}

// 格式化消息为前端需要的结构
function formatMessage(
  msg: Message & { product?: Product | null },
  rental?: any,
) {
  const base = {
    id: msg.id,
    conversationId: msg.receiverId, // 单聊场景用对方ID作为会话ID（发送方视角）
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    type: (msg.type || 'text') as
      | 'text'
      | 'image'
      | 'system'
      | 'product'
      | 'order',
    content: msg.content,
    extra: msg.extra || undefined,
    status: (msg.isRead ? 'read' : 'sent') as 'sent' | 'read',
    createdAt: msg.createdAt.toISOString(),
    productInfo: msg.product
      ? {
          id: msg.product.id,
          title: msg.product.title,
          image: (msg.product.images as string[])?.[0] || '',
          price: Number(msg.product.price),
        }
      : undefined,
  };

  if (rental) {
    (base as any).order = {
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
    };
  }

  return base;
}

// 触发某用户的会话列表更新事件
async function emitConversationUpdate(io: Server, userId: string) {
  try {
    // 查询最新的会话概览（取最近几条消息的最新一条 per 对方用户）
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        sender: { select: { id: true, nickname: true, avatar: true } },
        receiver: { select: { id: true, nickname: true, avatar: true } },
        product: { select: { id: true, title: true, images: true, price: true } },
      },
    });

    const map = new Map<
      string,
      {
        otherUser: any;
        lastMessage: string;
        lastMessageTime: Date;
        unreadCount: number;
        product?: any;
      }
    >();

    for (const msg of messages as any[]) {
      const other = msg.senderId === userId ? msg.receiver : msg.sender;
      if (map.has(other.id)) continue;

      const unreadCount = messages.filter(
        (m: any) => m.senderId === other.id && m.receiverId === userId && !m.isRead,
      ).length;

      const conv: any = {
        otherUser: { id: other.id, nickname: other.nickname, avatar: other.avatar },
        lastMessage: msg.content,
        lastMessageTime: msg.createdAt,
        unreadCount,
      };
      if (msg.product) {
        conv.product = {
          id: msg.product.id,
          title: msg.product.title,
          image: msg.product.images?.[0] || '',
          price: Number(msg.product.price),
        };
      }
      map.set(other.id, conv);
    }

    const list = Array.from(map.entries())
      .map(([id, c]) => ({
        id,
        otherUser: c.otherUser,
        product: c.product,
        lastMessage: c.lastMessage,
        lastMessageTime: c.lastMessageTime.toISOString(),
        unreadCount: c.unreadCount,
      }))
      .sort(
        (a, b) =>
          new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime(),
      );

    io.to(`user:${userId}`).emit('conversations:update', list);
  } catch (err) {
    console.error('[Socket] 会话更新失败:', err);
  }
}
