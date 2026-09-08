import { SplashScreen, Stack, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '~/hooks/useAuth';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { PortalProvider } from '@gorhom/portal';
import { useFonts } from 'expo-font';
import request from '~/utils/axios';
import SplashAd from './splashAd';

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();
  const [healthChecked, setHealthChecked] = useState(false);
  const [showAd, setShowAd] = useState(false);

  // 补充开屏广告
  if (showAd) {
    return (
      <SplashAd
        onFinish={() => {
          setShowAd(false);
        }}
      />
    );
  }

  // 加载字体
  const [fontsLoaded, fontError] = useFonts({
    'DIN-Alternate': require('../assets/fonts/din-alternate-bold.ttf'),
    'Oswald-Bold': require('../assets/fonts/Oswald/Oswald-Bold.ttf'),
    'Oswald-SemiBold': require('../assets/fonts/Oswald/Oswald-SemiBold.ttf'),
    'Oswald-Regular': require('../assets/fonts/Oswald/Oswald-Regular.ttf'),
  });

  // 启动时检查后端连通性
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await request.get('/categories', { skipAuth: true });
        if (!cancelled) {
          Alert.alert('✅ 网络检测', '后端连接成功\n\n说明：网络链路正常，问题出在业务接口');
        }
      } catch (error: any) {
        if (cancelled) return;
        const baseURL = error.config?.baseURL || '(unknown)';
        const url = error.config?.url || '';
        const msg = error.message || '(无 message)';
        const code = error.code || '(无 code)';
        const hasResponse = !!error.response;
        const status = error.response?.status || '(无)';
        Alert.alert(
          '❌ 网络检测失败',
          `请求类型：${hasResponse ? '服务器有响应（业务错误）' : '无响应（网络层错误）'}\n\n` +
            `完整URL：${baseURL}${url}\n` +
            `错误类型：${msg}\n` +
            `错误码：${code}\n` +
            `HTTP状态：${status}\n\n` +
            `有 error.request：${error.request ? '是' : '否'}\n` +
            `有 error.response：${hasResponse ? '是' : '否'}`,
        );
      } finally {
        if (!cancelled) setHealthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 错误防御
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // 当【字体】和【身份验证初始化】两个异步任务全部完成时，才撕掉启动页，自然过渡
  // 仅在首次加载时执行路由拦截，后续手动登出由 useAuth.logout() 统一处理跳转
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (fontsLoaded && !isLoading && healthChecked && !hasInitialized) {
      setHasInitialized(true);
      // 隐藏启动页
      SplashScreen.hideAsync().then(() => {
        // 路由拦截保护
        // 如果没有登录，悄无声息地在幕后直接把用户重定向到登录页
        if (!isAuthenticated) {
          router.replace('/login');
        }
      });
    }
  }, [fontsLoaded, isLoading, healthChecked, hasInitialized]);

  // 兜底容错渲染：在启动页还没隐藏前，提供一个与启动页背景色一模一样的全屏 View
  // 这样能保证在极端性能差的安卓手机上，启动页和首屏之间实现”像素级无缝无闪烁过渡”
  if (!fontsLoaded || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <ActivityIndicator size='large' color='#1F2937' />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen name='detail' options={{ headerTitle: '', headerShown: true }} />
        <Stack.Screen name='search' options={{ headerShown: false }} />
        <Stack.Screen name='onsearch' options={{ headerShown: false }} />
        <Stack.Screen
          name='login'
          options={{
            headerShown: true,
            headerTitle: '',
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name='register'
          options={{
            headerShown: true,
            headerTitle: '',
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen name='upload' options={{ headerShown: false }} />
        <Stack.Screen name='my-products' options={{ headerShown: false }} />
        <Stack.Screen name='edit-profile' options={{ headerShown: false }} />
        <Stack.Screen name='settings' options={{ headerShown: false }} />
        <Stack.Screen
          name='my-favorites'
          options={{ headerTitle: '我的收藏', headerShown: false }}
        />
        <Stack.Screen
          name='public-personal'
          options={{
            headerShown: false, // 使用自定义 header
          }}
        />
        <Stack.Screen name='footprints' options={{ headerShown: false }} />
        <Stack.Screen
          name='my-following'
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='rent'
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <PortalProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </PortalProvider>
  );
}
