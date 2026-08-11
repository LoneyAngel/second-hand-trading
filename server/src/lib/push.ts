import { Expo } from 'expo-server-sdk';
import prisma from './db';

const expo = new Expo();

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * 给指定用户发送推送通知
 */
export async function sendPushToUser(
  userId: string,
  message: Omit<PushMessage, 'to'>,
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });
    if (!user?.pushToken) return false;

    if (!Expo.isExpoPushToken(user.pushToken)) {
      console.warn(`Invalid push token for user ${userId}`);
      return false;
    }

    const ticket = await expo.sendPushNotificationsAsync([
      {
        to: user.pushToken,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data,
      },
    ]);

    const receipt = ticket[0];
    if (receipt.status === 'error') {
      console.error(`Push failed for user ${userId}:`, receipt.message);
      // 如果 token 无效，清除
      if (receipt.details?.error === 'DeviceNotRegistered') {
        await prisma.user.update({
          where: { id: userId },
          data: { pushToken: null },
        });
      }
      return false;
    }

    return true;
  } catch (err) {
    console.error('Send push error:', err);
    return false;
  }
}
