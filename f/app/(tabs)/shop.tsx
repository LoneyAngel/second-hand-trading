import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useState } from 'react';
import { theme } from '../../theme';
import SearchBar from '../../src/components/SearchBar';
import Card from '../../src/components/ShopCard';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { categoryService, productService } from '../../src/services';
import type { ProductStatus } from '../../src/types';
import AnimatedChip from '~/components/CateButton';

const FILTERS: { label: string; value: ProductStatus | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '可租赁', value: 'available' },
  { label: '已租出', value: 'rented' },
];

export default function Shop_Page() {
  const [selectedFilter, setSelectedFilter] = useState<ProductStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  const {
    data: productData,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
    isFetchingNextPage,
    isPending,
  } = useInfiniteQuery({
    queryKey: ['products', selectedCategory, selectedFilter],

    queryFn: ({ pageParam }) =>
      productService.getProducts({
        page: pageParam,
        limit: 10,
        categoryId: selectedCategory || undefined,
        status: selectedFilter === 'all' ? undefined : selectedFilter,
      }),

    initialPageParam: 1,

    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
  });
  const allProducts = productData?.pages.flatMap((page) => page.data) ?? [];
  const renderEmptyComponent = () => {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>暂无商品</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {categories && categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilterContainer}
          contentContainerStyle={styles.categoryFilter}
        >
          <AnimatedChip
            onPress={() => setSelectedCategory(null)}
            selected={selectedCategory === null}
          >
            <Text
              style={[
                styles.categoryChipText,
                !selectedCategory && styles.categoryChipTextSelected,
              ]}
            >
              全部
            </Text>
            {selectedCategory === null && <View style={styles.underline} />}
          </AnimatedChip>
          {categories.map((category) => (
            <AnimatedChip
              key={category.id}
              onPress={() => {
                // console.log('种类', category.name);
                setSelectedCategory(category.id);
              }}
              selected={selectedCategory === category.id}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category.id && styles.categoryChipTextSelected,
                ]}
              >
                {category.name}
              </Text>
              {selectedCategory === category.id && <View style={styles.underline} />}
            </AnimatedChip>
          ))}
        </ScrollView>
      )}

      <View style={styles.filterContainer}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[styles.filterChip]}
            onPress={() => setSelectedFilter(filter.value)}
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
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ zIndex: 100, backgroundColor: 'white' }} edges={['top']}>
        <View style={styles.top_bar}>
          <SearchBar />
        </View>
      </SafeAreaView>
      <FlatList
        data={allProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        columnWrapperStyle={styles.rowWrapper}
        contentContainerStyle={[styles.listContent, allProducts.length === 0 && { flex: 1 }]}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}

        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <Card
              id={item.id}
              title={item.title}
              price={item.price}
              productImage={{ uri: item.images[0] }}
            />
          </View>
        )}
        ListEmptyComponent={
          isPending ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size='large' color={theme.colors.text_default} />
            </View>
          ) : (
            renderEmptyComponent()
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size='small' color={theme.colors.text_default} />
            </View>
          ) : (
            <View style={{ height: 40 }} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[theme.colors.selected]}
            tintColor={theme.colors.selected}
            title='加载中...'
            titleColor='#999999'
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg_gray,
  },
  top_bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: 10,
  },
  categoryFilterContainer: {
    height: 60,
    borderBottomColor: theme.colors.text_secondary,
  },
  categoryFilter: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  categoryChipText: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '400',
    lineHeight: theme.fontSizes.lg + 4,
    color: theme.colors.text_secondary,
  },
  categoryChipTextSelected: {
    fontWeight: '600',
    lineHeight: theme.fontSizes.lg + 4,
    color: theme.colors.selected,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'white',
  },
  filterChipText: {
    fontSize: theme.fontSizes.md,
    fontWeight: '400',
    lineHeight: theme.fontSizes.md + 4,
    color: theme.colors.text_secondary,
  },
  filterChipTextSelected: {
    color: theme.colors.text_default,
    fontWeight: '500',
    lineHeight: theme.fontSizes.md + 4,
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
    fontWeight: '400',
    lineHeight: theme.fontSizes.lg + 4,
  },
  errorText: {
    color: theme.colors.text_price,
    fontSize: theme.fontSizes.lg,
    fontWeight: '400',
    lineHeight: theme.fontSizes.lg + 4,
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
    fontWeight: '500',
    lineHeight: theme.fontSizes.lg + 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.lg,
    fontWeight: '400',
    lineHeight: theme.fontSizes.lg + 4,
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
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
  headerSection: {
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  underline: {
    position: 'absolute',
    bottom: 0, // 紧贴底部
    width: 24, // 🚀 降维打击：在这里直接死死控制下划线的【绝对长度】！
    height: 3, // 下划线的粗细
    backgroundColor: '#0D9488', // 你的高级深青色
    borderRadius: 1.5, // 给下划线两头加一点圆角，更精致
  },
});
