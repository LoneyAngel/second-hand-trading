import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '../theme';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useState, useEffect } from 'react';
import { useQuery } from '../src/hooks/useQuery';
import { productService } from '../src/services';
import { useAuth } from '../src/hooks/useAuth';

export default function MyFollowingPage() {
  const { isAuthenticated } = useAuth();
  const [allFollowing, setAllFollowing] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch } = useQuery(() =>
    productService.getFollowing({ limit: 50 }),
  );
  console.log(data);

  useEffect(() => {
    if (data?.data) {
      setAllFollowing(data.data);
    }
  }, [data?.data]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await productService.toggleFollow(userId);
      refetch();
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => router.back()}
          >
            <AntDesign name='arrow-left' size={24} color='black' />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>我的关注</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>请先登录</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.push('/sign')}>
            <Text style={styles.retryButtonText}>去登录</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  const renderEmptyComponent = () => {
    if (error && allFollowing.length === 0) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>加载失败</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
              <Text style={styles.retryButtonText}>重试</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    if (loading && allFollowing.length === 0) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color={theme.colors.text_default} />
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <AntDesign name='user' size={48} color={theme.colors.text_secondary} />
        <Text style={styles.emptyText}>还没有关注任何人</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.back()}
        >
          <AntDesign name='arrow-left' size={24} color='black' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的关注</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={allFollowing}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, allFollowing.length === 0 && { flex: 1 }]}

        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userCard}
            onPress={() => {
              router.push({
                pathname: '/public-personal',
                params: { userId: item.id },
              });
            }}
          >
            <View style={styles.avatarWrapper}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} resizeMode='cover' />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <AntDesign name='user' size={24} color={theme.colors.text_secondary} />
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.nickname || '用户'}</Text>
              <Text style={styles.joinDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity
              style={styles.followButtonActive}
              onPress={() => handleFollow(item.id)}
            >
              <Text style={styles.followButtonTextActive}>已关注</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={<View style={{ height: 20 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.selected]}
            tintColor={theme.colors.selected}
            title='加载中...'
            titleColor='#999999'
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg_gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg_gray,
  },
  headerTitle: {
    fontSize: theme.fontSizes.xl,
    lineHeight: theme.fontSizes.xl + 4,
    fontWeight: '600',
    color: theme.colors.text_default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg_gray,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.lg,
    lineHeight: theme.fontSizes.lg + 4,
    fontWeight: '400',
  },
  errorText: {
    color: theme.colors.text_price,
    fontSize: theme.fontSizes.lg,
    lineHeight: theme.fontSizes.lg + 4,
    fontWeight: '500',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.button_bg_default,
    borderRadius: theme.radii.md,
  },
  retryButtonText: {
    color: theme.colors.text_default,
    fontSize: theme.fontSizes.lg,
    lineHeight: theme.fontSizes.lg + 4,
    fontWeight: '500',
  },
  listContent: {
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  avatarWrapper: {
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.bg_gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: theme.fontSizes.lg,
    lineHeight: theme.fontSizes.lg + 4,
    fontWeight: '500',
    color: theme.colors.text_default,
  },
  joinDate: {
    fontSize: theme.fontSizes.sm,
    lineHeight: theme.fontSizes.sm + 4,
    fontWeight: '400',
    color: theme.colors.text_secondary,
    marginTop: 4,
  },
  followButtonActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.selected,
    borderWidth: 1,
    borderColor: theme.colors.selected,
  },
  followButtonTextActive: {
    fontSize: theme.fontSizes.sm,
    lineHeight: theme.fontSizes.sm + 4,
    fontWeight: '500',
    color: 'white',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyText: {
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.lg,
    lineHeight: theme.fontSizes.lg + 4,
    fontWeight: '400',
  },
});
