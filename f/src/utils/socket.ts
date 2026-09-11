import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = 'http://10.131.201.163:3001';

let socket: Socket | null = null;
let connectPromise: Promise<Socket> | null = null;

/**
 * 获取/创建全局 socket 实例（懒加载，带 token 鉴权）
 */
export async function getSocket(): Promise<Socket> {
  if (socket && socket.connected) return socket;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) {
      throw new Error('未登录');
    }

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('[Socket] 已连接');
    });

    socket.on('disconnect', () => {
      console.log('[Socket] 已断开');
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] 连接错误:', err.message);
    });

    return socket;
  })();

  try {
    return await connectPromise;
  } finally {
    connectPromise = null;
  }
}

/**
 * 断开 socket 连接
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connectPromise = null;
}

/**
 * 发送聊天消息
 */
export function sendSocketMessage(data: {
  receiverId: string;
  content: string;
  type?: string;
  extra?: string;
  productId?: string;
  rentalId?: string;
  clientId?: string;
}) {
  if (!socket) return;
  socket.emit('message:send', data);
}

/**
 * 标记与某用户的会话已读
 */
export function markSocketRead(targetUserId: string) {
  if (!socket) return;
  socket.emit('message:read', targetUserId);
}
