import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '../theme';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useQuery } from '../src/hooks/useQuery';
import { productService } from '../src/services';
import Card from '../src/components/ShopCard';
import { useAuth } from '../src/hooks/useAuth';
import { useState } from 'react';

// 品牌青色
const THEME_CYAN = '#0D9488';

export default function PublicPersonalPage() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const {
    data: userData,
    loading: userLoading,
    error: userError,
    refetch: refetchUser,
  } = useQuery(() => productService.getUserPublic(userId as string), {
    enabled: !!userId,
  });

  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery(() => productService.getUserProducts(userId as string, { limit: 20 }), {
    enabled: !!userId,
  });

  const products = productsData?.data || [];

  const handleFollow = async () => {
    if (!isAuthenticated) {
      Alert.alert('提示', '请先登录');
      return;
    }
    if (followLoading) return;

    setFollowLoading(true);
    try {
      setIsFollowing((prev) => !prev);
      await productService.toggleFollow(userId as string);
    } catch (error) {
      setIsFollowing((prev) => !prev);
      Alert.alert('提示', '操作失败');
    } finally {
      setFollowLoading(false);
    }
  };

  // 格式化加入时间
  const formatJoinDate = (dateString?: string) => {
    if (!dateString) return '未知';
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月加入`;
  };

  if (userLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size='large' color={THEME_CYAN} />
        <Text style={styles.loadingText}>加载中...</Text>
      </SafeAreaView>
    );
  }

  if (userError || !userData) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => router.back()}
          >
            <AntDesign name='arrow-left' size={24} color={theme.colors.text_default} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>用户主页</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetchUser}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => router.back()}
          >
            <AntDesign name='arrow-left' size={24} color={theme.colors.text_default} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>用户主页</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.rowWrapper}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* 用户信息卡片 */}
            <View style={styles.profileCard}>
              <View style={styles.avatarWrapper}>
                {userData.user.avatar ? (
                  <Image
                    source={{ uri: userData.user.avatar }}
                    style={styles.avatar}
                    resizeMode='cover'
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <AntDesign name='user' size={40} color='#fff' />
                  </View>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userData.user.nickname || '用户'}</Text>
                <Text style={styles.joinDate}>{formatJoinDate(userData.user.createdAt)}</Text>
              </View>
              <View style={styles.statsWrapper}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{userData.productCount}</Text>
                  <Text style={styles.statLabel}>商品</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followButtonActive]}
                onPress={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size='small' color={isFollowing ? 'white' : THEME_CYAN} />
                ) : (
                  <Text
                    style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}
                  >
                    {isFollowing ? '已关注' : '+ 关注'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* 商品标题 */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>TA的商品</Text>
            </View>

            {/* 加载状态 */}
            {productsLoading && products.length === 0 && (
              <View style={styles.productsLoading}>
                <ActivityIndicator size='small' color={THEME_CYAN} />
                <Text style={styles.productsLoadingText}>加载商品中...</Text>
              </View>
            )}

            {/* 空状态 */}
            {!productsLoading && products.length === 0 && (
              <View style={styles.emptyContainer}>
                <AntDesign name='inbox' size={48} color={theme.colors.text_secondary} />
                <Text style={styles.emptyText}>暂无商品</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <Card
              id={item.id}
              title={item.title}
              price={item.price}
              productImage={
                item.images && item.images.length > 0 ? { uri: item.images[0] } : undefined
              }
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg_gray,
  },
  safeArea: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg_gray,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: '600',
    color: theme.colors.text_default,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg_gray,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.lg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.text_price,
    fontSize: theme.fontSizes.lg,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: THEME_CYAN,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: theme.fontSizes.lg,
    fontWeight: '500',
  },
  headerSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    shadowColor: THEME_CYAN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME_CYAN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: theme.spacing.lg,
  },
  userName: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: '700',
    color: theme.colors.text_default,
    marginBottom: 4,
  },
  joinDate: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_secondary,
  },
  statsWrapper: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: '700',
    color: THEME_CYAN,
  },
  statLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_secondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: '700',
    color: theme.colors.text_default,
  },
  sectionSubtitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_secondary,
  },
  productsLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  productsLoadingText: {
    marginTop: 10,
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.md,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.lg,
  },
  listContent: {
    paddingBottom: 20,
  },
  rowWrapper: {
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.sm,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '48%',
    marginBottom: theme.spacing.sm,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: THEME_CYAN,
  },
  followButtonActive: {
    backgroundColor: THEME_CYAN,
    borderColor: THEME_CYAN,
  },
  followButtonText: {
    fontSize: theme.fontSizes.sm,
    color: THEME_CYAN,
    fontWeight: '500',
  },
  followButtonTextActive: {
    color: 'white',
  },
});
