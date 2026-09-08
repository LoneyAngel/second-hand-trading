import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '../theme';
import { productService } from '../src/services';
import ReviewCard from '../src/components/ReviewCard';
import type { Review } from '../src/types';

const FILTER_TABS = [
  { key: 0, label: '全部' },
  { key: 5, label: '5星' },
  { key: 4, label: '4星' },
  { key: 3, label: '3星' },
  { key: 2, label: '2星' },
  { key: 1, label: '1星' },
];

export default function ProductReviewsPage() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCounts, setRatingCounts] = useState<Record<number, number>>({});
  const [selectedRating, setSelectedRating] = useState<number>(0); // 0 = 全部
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;

  const loadStats = useCallback(async () => {
    if (!productId) return;
    try {
      const res = await productService.getLatestReview(productId);
      setAverageRating(res.averageRating);
      setTotal(res.reviewCount);
      setRatingCounts(res.ratingCounts || {});
    } catch (err) {
      console.error('Failed to load review stats:', err);
    }
  }, [productId]);

  const loadReviews = useCallback(
    async (pageNum: number, isRefresh = false) => {
      if (!productId) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const params: { rating?: number; page: number; limit: number } = {
          page: pageNum,
          limit: pageSize,
        };
        if (selectedRating > 0) params.rating = selectedRating;

        const res = await productService.getReviews(productId, params);
        const newData = res.data || [];
        if (isRefresh || pageNum === 1) {
          setReviews(newData);
        } else {
          setReviews((prev) => [...prev, ...newData]);
        }
        setTotal(res.total);
        setHasMore(newData.length === pageSize);
      } catch (err) {
        console.error('Failed to load reviews:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [productId, selectedRating],
  );

  // 切筛选条件时重置
  useEffect(() => {
    setPage(1);
    setReviews([]);
    setHasMore(true);
    loadReviews(1);
  }, [selectedRating]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    Promise.all([loadStats(), loadReviews(1, true)]);
  };

  const handleLoadMore = () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadReviews(nextPage);
  };

  const renderStars = (rating: number, size = 14) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <FontAwesome
          key={i}
          name='star'
          size={size}
          color={i <= rating ? '#FFB800' : '#E5E7EB'}
          solid={i <= rating}
        />
      ))}
    </View>
  );

  const renderRatingBar = () => {
    const totalCount = total || 1;
    return (
      <View style={styles.ratingBarContainer}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = ratingCounts[star] || 0;
          const percent = (count / totalCount) * 100;
          return (
            <TouchableOpacity
              key={star}
              style={styles.ratingBarRow}
              onPress={() => setSelectedRating(selectedRating === star ? 0 : star)}
              activeOpacity={0.7}
            >
              <Text style={styles.ratingBarText}>{star}星</Text>
              <View style={styles.ratingBarBg}>
                <View style={[styles.ratingBarFill, { width: `${percent}%` }]} />
              </View>
              <Text style={styles.ratingBarCount}>{count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerCard}>
      {/* 评分总览 */}
      <View style={styles.ratingOverview}>
        <View style={styles.ratingScore}>
          <Text style={styles.ratingScoreText}>{averageRating.toFixed(1)}</Text>
          <View style={{ marginTop: 4 }}>{renderStars(Math.round(averageRating), 16)}</View>
          <Text style={styles.ratingCountText}>{total} 条评价</Text>
        </View>
        {/* 星级分布条 */}
        {renderRatingBar()}
      </View>

      {/* 筛选标签 */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => {
          const active = selectedRating === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setSelectedRating(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={{ paddingVertical: 16 }}>
        <ActivityIndicator size='small' color={theme.colors.selected} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暂无评论</Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {/* 顶部导航 */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AntDesign name='arrow-left' size={22} color={theme.colors.text_default} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>商品评价</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.reviewItem}>
            <ReviewCard review={item} />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.selected]}
            tintColor={theme.colors.selected}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text_default,
  },
  listContent: {
    flexGrow: 1,
  },
  headerCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 8,
    borderBottomColor: theme.colors.bg_gray,
  },
  ratingOverview: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  ratingScore: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
  },
  ratingScoreText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFB800',
    lineHeight: 42,
  },
  ratingCountText: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.text_secondary,
  },
  ratingBarContainer: {
    flex: 1,
    gap: 6,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBarText: {
    fontSize: 12,
    color: theme.colors.text_secondary,
    width: 28,
  },
  ratingBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FFB800',
    borderRadius: 3,
  },
  ratingBarCount: {
    fontSize: 12,
    color: theme.colors.text_secondary,
    width: 30,
    textAlign: 'right',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.bg_gray,
  },
  filterTabActive: {
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
  },
  filterTabText: {
    fontSize: 13,
    color: theme.colors.text_secondary,
  },
  filterTabTextActive: {
    color: theme.colors.selected,
    fontWeight: '500',
  },
  reviewItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.text_gray,
  },
});
