import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { authService } from '../services';
import { useAuth } from './useAuth';

/**
 * 推送通知管理 Hook
 * - 申请通知权限
 * - 获取 Expo Push Token
 * - 上传到后端
 * - 监听收到的通知
 */
export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const registerForPushNotificationsAsync = async () => {
    let token: string | null = null;

    if (Platform.OS === 'web') {
      // Web 端不支持推送
      return null;
    }

    if (!Device.isDevice) {
      // 模拟器上无法获取推送 token
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      // 设置通知展示方式（前台也展示）
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: undefined, // 使用 app.json 中的项目 ID
      });
      token = tokenData.data;

      console.log('Expo Push Token:', token);

      // 上传到后端
      if (token && isAuthenticated) {
        try {
          await authService.updatePushToken(token);
          console.log('Push token uploaded to server');
        } catch (err) {
          console.error('Failed to upload push token:', err);
        }
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }

    return token;
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotificationsAsync();

    // 监听前台收到通知
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

    // 监听用户点击通知
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification response:', response);
        // 可以在这里处理跳转逻辑
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated]);
}
