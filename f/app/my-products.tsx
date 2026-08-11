import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useQuery } from '../src/hooks/useQuery';
import { productService } from '../src/services';
import type { ProductStatus, Product } from '../src/types';
import MyProductCard from '../src/components/MyProductCard';
import Entypo from '@expo/vector-icons/Entypo';

const FILTERS: { label: string; value: ProductStatus | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '可租赁', value: 'available' },
  { label: '已租出', value: 'rented' },
  { label: '维护中', value: 'maintenance' },
];

export default function MyProductsPage() {
  const [selectedFilter, setSelectedFilter] = useState<ProductStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const { data, loading, error, refetch } = useQuery(
    () =>
      productService.getMyProductsPaginated({
        page: page,
        limit: 10,
        status: selectedFilter === 'all' ? undefined : selectedFilter,
      }),
    {},
    [page, selectedFilter],
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

  const handleFilterChange = (filter: ProductStatus | 'all') => {
    if (selectedFilter !== filter) {
      setSelectedFilter(filter);
      setPage(1);
      setAllProducts([]);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

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
        <Text style={styles.emptyText}>暂无商品</Text>
        <TouchableOpacity style={styles.publishButton} onPress={() => router.push('/upload')}>
          <Text style={styles.publishButtonText}>发布商品</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={{ zIndex: 10 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.back()}
        >
          <Entypo name='chevron-left' size={24} color={theme.colors.text_default} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的商品</Text>
      </View>

      <View style={styles.filterContainer}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              selectedFilter === filter.value && styles.filterChipSelected,
            ]}
            onPress={() => handleFilterChange(filter.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter.value && styles.filterChipTextSelected,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
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
            <MyProductCard product={item} onRefresh={refetch} />
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg_gray,
    position: 'relative',
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    textAlign: 'center',
    lineHeight: 56,
    fontSize: theme.fontSizes.xl,
    fontWeight: '600',
    color: theme.colors.text_default,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg_gray,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.bg_gray,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.button_bg_default,
  },
  filterChipText: {
    fontSize: theme.fontSizes.md,
    lineHeight: theme.fontSizes.md + 4,
    fontWeight: '400',
    color: theme.colors.text_secondary,
  },
  filterChipTextSelected: {
    color: theme.colors.text_default,
    fontWeight: '500',
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
    gap: 20,
  },
  emptyText: {
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.lg,
    lineHeight: theme.fontSizes.lg + 4,
    fontWeight: '400',
  },
  publishButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: theme.colors.button_bg_default,
    borderRadius: theme.radii.md,
  },
  publishButtonText: {
    color: theme.colors.text_default,
    fontSize: theme.fontSizes.lg,
    lineHeight: theme.fontSizes.lg + 4,
    fontWeight: '500',
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
