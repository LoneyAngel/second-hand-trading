import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { theme } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import Entypo from '@expo/vector-icons/Entypo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useQuery } from '../../src/hooks/useQuery';
import { authService, productService } from '../../src/services';
import { router } from 'expo-router';
import { ReactElement } from 'react';
import Feather from '@expo/vector-icons/Feather';

const ORDER_TABS: { label: string; icon: ReactElement }[] = [
  {
    label: '我租到的',
    icon: <MaterialCommunityIcons name='hand-coin-outline' size={24} />,
  },
  {
    label: '我租出的',
    icon: <MaterialCommunityIcons name='package-variant-closed-check' size={24} />,
  },
];

export default function Mine_Page() {
  // 根据accesskey
  // 初始化个人信息
  const { user, isAuthenticated, refreshUser } = useAuth();

  // 获取用户信息（如果本地有 token 但没有用户信息）
  const { loading: userLoading, refetch: refetchUser } = useQuery(
    () => authService.getCurrentUser(),
    {
      enabled: isAuthenticated && !user,
      onSuccess: (data) => {
        refreshUser();
      },
    },
  );

  // 获取收藏的数量
  const { data: favoriteCount } = useQuery(() => productService.getFavoritesCount(), {
    enabled: isAuthenticated,
  });

  // 获取浏览的数量
  const { data: footprintsCount } = useQuery(() => productService.getFootprintsCount(), {
    enabled: isAuthenticated,
  });

  // 获取关注的数量
  const { data: followingCount } = useQuery(() => productService.getFollowingCount(), {
    enabled: isAuthenticated,
  });
  console.log('followingCount', followingCount);

  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={theme.colors.text_default} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPromptContainer}>
          <FontAwesome5 name='user-astronaut' size={64} color={theme.colors.text_default} />
          <Text style={styles.loginPromptText}>登录后查看更多内容</Text>
          <Pressable
            style={styles.loginButton}
            onPress={() => {
              // 这里可以跳转到登录页面，暂时只有注册/登录功能
              router.push({
                pathname: '/login',
              });
            }}
          >
            <Text style={styles.loginButtonText}>登录 / 注册</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg_gray }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: theme.spacing.sm,
        gap: 8,
      }}
    >
      <View style={styles.container_a}>
        <SafeAreaView
          style={{
            paddingHorizontal: 10,
            paddingVertical: 10,
          }}
          edges={['top']}
        >
          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 20,
              borderRadius: theme.radii.md,
              backgroundColor: 'white',
            }}
            onPress={() => router.push('/edit-profile')}
          >
            <View>
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={{ height: 48, width: 48 }}
                  resizeMode='cover' // 图片裁剪模式：cover, contain, stretch
                />
              ) : (
                <View
                  style={{
                    height: 48,
                    width: 48,
                    borderRadius: 24,
                    backgroundColor: theme.colors.bg_gray,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Entypo name='user' size={24} color={theme.colors.text_secondary} />
                </View>
              )}
            </View>
            <View style={{ flex: 1, gap: 10 }}>
              <Text
                style={{
                  fontSize: theme.fontSizes.xxl,
                  fontWeight: '600',
                  lineHeight: theme.fontSizes.xxl + 4,
                }}
              >
                {user?.nickname || '用户'}
              </Text>
              <Text
                numberOfLines={1} // 🚀 核心：限制只能显示 1 行
                ellipsizeMode='tail' // 🚀 核心：溢出时在尾部（tail）显示 ...
                style={{
                  fontSize: theme.fontSizes.sm,
                  fontWeight: '400',
                  color: theme.colors.text_secondary,
                  lineHeight: theme.fontSizes.sm + 4,
                  maxWidth: '80%', // 💡 极重要：给一个最大宽度限制，否则它会无限制往右撑大
                }}
              >
                {user?.id}
              </Text>
            </View>
            <View style={{ marginRight: 8 }}>
              <Entypo name='chevron-small-right' size={24} color={theme.colors.text_secondary} />
            </View>
          </Pressable>
        </SafeAreaView>

        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 10,
            borderRadius: theme.radii.md,
            backgroundColor: 'white',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 10 }}>
            <Pressable
              style={styles.iconTextButton}
              onPress={() => {
                router.push('/footprints');
              }}
            >
              <Text style={styles.iconNumber}>{footprintsCount?.count ?? 0}</Text>
              <Text style={styles.iconText}>我的浏览</Text>
            </Pressable>
            <Pressable
              style={styles.iconTextButton}
              onPress={() => {
                router.push({
                  pathname: '/my-favorites',
                });
              }}
            >
              <Text style={styles.iconNumber}>{favoriteCount?.data ? favoriteCount?.data : 0}</Text>
              <Text style={styles.iconText}>我的收藏</Text>
            </Pressable>
            <Pressable
              style={styles.iconTextButton}
              onPress={() => {
                router.push('/my-following');
              }}
            >
              <Text style={styles.iconNumber}>{followingCount?.count ?? 0}</Text>
              <Text style={styles.iconText}>我的关注</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.container_a,
          {
            gap: 15,
            paddingHorizontal: 10,
            paddingVertical: 10,
          },
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={styles.title}>订单</Text>
          <Entypo name='chevron-small-right' size={28} color={theme.colors.text_secondary} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
          <Pressable
            style={styles.textButton}
            onPress={() => {
              router.push('/my-products');
            }}
          >
            {/* <Feather name='shopping-bag' size={24} color={theme.colors.text_default} /> */}
            <MaterialCommunityIcons name='package-variant-closed-plus' size={24} />
            <Text style={styles.tabLabel}>我发布的</Text>
          </Pressable>
          {ORDER_TABS.map((tab, index) => (
            <Pressable
              key={index}
              style={styles.textButton}
              onPress={() => {
                router.push({
                  pathname: '/my-rentals',
                  params: { type: index === 0 ? 'renter' : 'owner' },
                });
              }}
            >
              {tab.icon}
              <Text style={styles.tabLabel}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.container_a,
          {
            paddingHorizontal: 10,
            paddingVertical: 10,
            gap: 20,
          },
        ]}
      >
        <View style={{ paddingHorizontal: 5, paddingVertical: 10, gap: 20 }}>
          <Pressable style={styles.menuItem} onPress={() => router.push('/addresses')}>
            <Text style={styles.text}>地址管理</Text>
            <Entypo name='chevron-small-right' size={20} color={theme.colors.text_secondary} />
          </Pressable>

          <Pressable style={styles.menuItem} onPress={() => router.push('/settings')}>
            <Text style={styles.text}>设置</Text>
            <Entypo name='chevron-small-right' size={20} color={theme.colors.text_secondary} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg_gray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 20,
  },
  loginPromptText: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '400',
    lineHeight: theme.fontSizes.lg + 4,
    color: theme.colors.text_secondary,
  },
  loginButton: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    backgroundColor: theme.colors.button_bg_default,
    borderRadius: theme.radii.md,
  },
  loginButtonText: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '500',
    lineHeight: theme.fontSizes.lg + 4,
    color: theme.colors.text_default,
  },
  iconTextButton: {
    gap: 5,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  iconNumber: {
    fontSize: theme.fontSizes.xl,
    fontWeight: '600',
    lineHeight: theme.fontSizes.xl + 4,
    color: theme.colors.text_default,
  },
  iconText: {
    fontSize: theme.fontSizes.md,
    fontWeight: '400',
    lineHeight: theme.fontSizes.md + 4,
    color: theme.colors.text_default,
  },
  textButton: {
    gap: 5,
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: theme.colors.text_price,
    color: 'white',
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
    paddingHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tabLabel: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '700',
    lineHeight: theme.fontSizes.sm + 4,
    color: theme.colors.text_default,
  },
  title: {
    fontSize: theme.fontSizes.xl,
    fontWeight: '600',
    lineHeight: theme.fontSizes.xl + 4,
    color: theme.colors.text_default,
  },
  text: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '400',
    lineHeight: theme.fontSizes.lg + 4,
    color: theme.colors.text_default,
  },
  itemCountText: {
    fontSize: theme.fontSizes.md,
    fontWeight: '400',
    lineHeight: theme.fontSizes.md + 4,
    color: theme.colors.text_secondary,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  container_a: {
    borderRadius: 8,
    backgroundColor: 'white',
    padding: theme.spacing.sm,
  },
});
