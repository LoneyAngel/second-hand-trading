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
import { useInfiniteQuery } from '@tanstack/react-query';
import { productService } from '../src/services';
import SimpleProductCard from '../src/components/SmallCard';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function MyFavoritesPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
    isFetchingNextPage,
    isPending,
    error,
  } = useInfiniteQuery({
    queryKey: ['favorites'],

    queryFn: ({ pageParam }) =>
      productService.getMyFavoritesProductsPaginated({
        page: pageParam,
        limit: 10,
      }),

    initialPageParam: 1,

    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
  });
  const favoritesData = data?.pages.flatMap((page) => page.data) ?? [];
  const renderEmptyComponent = () => {
    if (error) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
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
        data={favoritesData}
        keyExtractor={(item) => item.id}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        onEndReached={() => {
          if (hasNextPage && isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.2}
        contentContainerStyle={[styles.listContent, favoritesData.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <SimpleProductCard product={item} />
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
            <View style={{ height: 20 }} />
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
