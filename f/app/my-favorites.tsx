import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import AntDesign from '@expo/vector-icons/AntDesign';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '../src/hooks/useQuery';
import { productService } from '../src/services';
import type { Product } from '../src/types';
import SimpleProductCard from '../src/components/SmallCard';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function MyFavoritesPage() {
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const { data, loading, error, refetch } = useQuery(
    () =>
      productService.getMyFavoritesProductsPaginated({
        page: page,
        limit: 10,
      }),
    {},
    [page],
  );

  useEffect(() => {
    if (page === 1 && Array.isArray(data?.data)) {
      setAllProducts(data?.data);
    } else if (data?.data) {
      setAllProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = data.data.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
    }
  }, [data?.data]);

  const hasMore = data?.hasMore || false;

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      refetch();
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const renderEmptyComponent = () => {
    if (error && allProducts.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (loading && allProducts.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.text_default} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name='heart-o' size={48} color={theme.colors.text_secondary} />
        <Text style={styles.emptyText}>暂无收藏商品</Text>
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
        <Text style={styles.headerTitle}>我的收藏</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={allProducts}
        keyExtractor={(item) => item.id}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        contentContainerStyle={[styles.listContent, allProducts.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <SimpleProductCard product={item} />
          </View>
        )}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={
          loading && allProducts.length > 0 ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size='small' color={theme.colors.text_default} />
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )
        }
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
  cardWrapper: {},
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.lg,
    lineHeight: theme.fontSizes.lg + 4,
    fontWeight: '400',
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
