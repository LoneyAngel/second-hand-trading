import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { theme } from '../theme';
import LoveButton from '~/components/LoveButton';
import { FontAwesome } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useQuery } from '../src/hooks';
import { productService } from '../src/services';
import { useAuth } from '../src/hooks';
import { useEffect, useState } from 'react';
import type { PriceUnit, Review } from '../src/types';
import ReviewCard from '~/components/ReviewCard';
import { useDebouncedPress } from '../src/hooks/useDebouncedPress';

// 价格单位配置
const PRICE_UNITS: { value: PriceUnit; label: string }[] = [
  { value: 'day', label: '/天' },
  { value: 'hour', label: '/时' },
  { value: 'once', label: '/次' },
];

export default function Detail_Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const [isLike, setIsLike] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const {
    data: product,
    loading,
    error,
    refetch,
  } = useQuery(() => productService.getProduct(id, user?.id), { enabled: !!id });
  const isMe = product?.user.id === user?.id;

  // 评论数据
  const [latestReview, setLatestReview] = useState<Review | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);

  const loadReviewInfo = async () => {
    if (!id) return;
    setReviewLoading(true);
    try {
      const res = await productService.getLatestReview(id);
      setLatestReview(res.data);
      setReviewCount(res.reviewCount);
      setAverageRating(res.averageRating);
    } catch (err) {
      console.error('Failed to load review info:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadReviewInfo();
  }, [id]);

  useEffect(() => {
    if (product?.isFavorited) {
      setIsLike(product?.isFavorited);
    }
    if (product?.isFollowing) {
      setIsFollowing(product.isFollowing);
    }
  }, [product]);
  useEffect(() => {
    async function footprint() {
      await productService.createFootPrint(id);
    }
    footprint();
  }, [id]);

  const goToUserProfile = useDebouncedPress(() => {
    router.push({
      pathname: '/public-personal',
      params: { userId: product.user.id },
    });
  });

  const goToReviews = useDebouncedPress(() => {
    router.push({ pathname: '/product-reviews', params: { productId: id } });
  });

  const handleRent = () => {
    if (!isAuthenticated) {
      Alert.alert('提示', '请先登录');
      return;
    }
    if (isMe) {
      Alert.alert('提示', '不能租赁自己的商品');
      return;
    }
    router.push({
      pathname: '/rent',
      params: { id: product.id },
    });
  };
  const handleFavorited = async () => {
    if (isAuthenticated) {
      setIsLike((prev) => !prev);
      await productService.toggleFavorite(product.id);
    } else Alert.alert('登陆后才可以收藏哦');
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      Alert.alert('提示', '请先登录');
      return;
    }
    if (followLoading) return;

    setFollowLoading(true);
    try {
      setIsFollowing((prev) => !prev);
      await productService.toggleFollow(product.user.id);
    } catch (error) {
      setIsFollowing((prev) => !prev);
      Alert.alert('提示', '操作失败');
    } finally {
      setFollowLoading(false);
    }
  };
  // action

  const handleContact = () => {
    if (!isAuthenticated) {
      Alert.alert('提示', '请先登录');
      return;
    }
    if (isMe) {
      Alert.alert('提示', '不能和自己聊天哦');
      return;
    }
    router.push({
      pathname: '/chat',
      params: {
        userId: product.user.id,
        userName: product.user.nickname || '用户',
        userAvatar: product.user.avatar || '',
        productId: product.id,
        productTitle: product.title,
        productImage: product.images?.[0] || '',
        productPrice: String(product.price),
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size='large' color={theme.colors.text_default} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <View style={styles.loadingContent}>
          <Text style={styles.errorText}>商品不存在或加载失败</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 10, paddingBottom: 100 }}>
          {/* 商品图片 */}

          {product.images && product.images.length > 0 ? (
            <Image
              style={styles.productImage}
              source={{ uri: product.images[0] }}
              resizeMode='cover'
            />
          ) : (
            <View style={[styles.productImage, styles.imagePlaceholder]}>
              <AntDesign name='picture' size={48} color={theme.colors.text_secondary} />
            </View>
          )}
          <View style={styles.infoContainer}>
            <Text style={styles.title}>{product.title}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceY}>￥</Text>
              <Text style={styles.price}>{product.price}</Text>
              <Text style={styles.priceUnit}>
                {PRICE_UNITS.find((u) => u.value === product.priceUnit)?.label || '/天'}
              </Text>
            </View>
            {/* <Text style={styles.price}>
              ￥{product.price}
              <Text style={styles.priceUnit}>
                {PRICE_UNITS.find((u) => u.value === product.priceUnit)?.label || '/天'}
              </Text>
            </Text> */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text
                style={{
                  fontSize: theme.fontSizes.sm,
                  lineHeight: 16,
                  color: theme.colors.text_secondary,
                }}
              >
                押金 ￥{product.deposit}|不支持买断
              </Text>
              <Text
                style={{
                  fontSize: theme.fontSizes.sm,
                  lineHeight: 16,
                  color: theme.colors.text_secondary,
                }}
              >
                {product.status === 'available' ? '可立即租赁' : '已租出'}
              </Text>
            </View>
          </View>
          {/* 商品描述 */}
          {product.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>商品描述</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}
          {/* 用户信息 */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>出租人</Text>
            <TouchableOpacity
              style={styles.userInfo}
              onPress={goToUserProfile}
            >
              <View style={styles.userAvatar}>
                {product.user.avatar ? (
                  <Image source={{ uri: product.user.avatar }} style={styles.avatarImage} />
                ) : (
                  <AntDesign name='user' size={24} color={theme.colors.text_secondary} />
                )}
              </View>
              <View style={styles.userText}>
                <Text style={styles.userName}>{product.user.nickname || '用户'}</Text>
                {/* <Text style={styles.userPhone}>{product.user.phone}</Text> */}
              </View>
              {!isMe && (
                <TouchableOpacity
                  style={[styles.followButton, isFollowing && styles.followButtonActive]}
                  onPress={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator
                      size='small'
                      color={isFollowing ? 'white' : theme.colors.selected}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.followButtonText,
                        isFollowing && styles.followButtonTextActive,
                      ]}
                    >
                      {isFollowing ? '已关注' : '+ 关注'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.descriptionContainer}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.sectionTitle}>用户评价</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FontAwesome name='star' size={14} color='#FFB800' solid />
                  <Text style={styles.ratingScoreText}>{averageRating.toFixed(1)}</Text>
                  <Text style={styles.reviewCountText}>({reviewCount})</Text>
                </View>
              </View>
              <TouchableOpacity
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}
                onPress={goToReviews}
              >
                <Text style={styles.description}>查看全部</Text>
                <FontAwesome name='chevron-right' size={12} color={theme.colors.text_secondary} />
              </TouchableOpacity>
            </View>

            {reviewLoading ? (
              <View style={{ paddingVertical: 10 }}>
                <ActivityIndicator size='small' color={theme.colors.selected} />
              </View>
            ) : latestReview ? (
              <ReviewCard review={latestReview} />
            ) : (
              <Text style={styles.emptyReviewText}>暂无评价，快来抢沙发吧~</Text>
            )}
          </View>
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>规格参数</Text>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>分类</Text>
              <Text style={styles.specValue}>{product.category.name}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>成色</Text>
              <Text style={styles.specValue}>9成新</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']}>
        <View style={styles.bottomBar}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 10 }}>
            <View style={{ justifyContent: 'center', alignItems: 'center', gap: 5 }}>
              <LoveButton like={isLike} handleFunction={handleFavorited} />
              <Text>收藏</Text>
            </View>
            <View style={{ justifyContent: 'center', alignItems: 'center', gap: 5 }}>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={handleContact}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                style={styles.button}
              >
                <AntDesign name='comment' size={25} color={theme.colors.text_default} />
                {/* <FontAwesome name='commenting-o' size={25} color={theme.colors.text_default} /> */}
              </TouchableOpacity>
              <Text>咨询</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.rentButton, product.status !== 'available' && styles.rentButtonDisabled]}
            onPress={handleRent}
            disabled={product.status !== 'available'}
          >
            <Text style={styles.rentButtonText}>
              {product.status === 'available' ? '立即租赁' : '商品已租出'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg_gray,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg_gray,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.sm,
  },
  productImage: {
    width: '100%',
    height: 300,
    borderRadius: theme.radii.sm,
  },
  imagePlaceholder: {
    backgroundColor: theme.colors.bg_gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: theme.spacing.lg,
    gap: 10,
    borderRadius: theme.radii.sm,
  },
  title: {
    fontSize: theme.fontSizes.xl,
    lineHeight: theme.fontSizes.xl + 4,
    fontWeight: '600',
    color: theme.colors.text_default,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'baseline',
  },
  priceY: {
    color: theme.colors.text_price,
    fontSize: theme.fontSizes.sm,
    fontWeight: '500',
    lineHeight: 16,
    fontFamily: 'Oswald-Regular',
  },
  price: {
    fontSize: theme.fontSizes.xxl,
    lineHeight: theme.fontSizes.xxl + 4,
    fontWeight: 'bold',
    color: theme.colors.text_price,
    fontFamily: theme.fonts.price,
  },
  priceUnit: {
    fontSize: theme.fontSizes.sm,
    lineHeight: theme.fontSizes.sm + 4,
    color: theme.colors.text_secondary,
    fontWeight: '400',
    paddingLeft: 2,
  },
  descriptionContainer: {
    backgroundColor: 'white',
    padding: theme.spacing.lg,
    gap: 10,
    borderRadius: theme.radii.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    lineHeight: theme.fontSizes.lg + 4,
    fontWeight: '600',
    color: theme.colors.text_default,
  },
  description: {
    fontSize: theme.fontSizes.md,
    lineHeight: theme.fontSizes.md + 4,
    fontWeight: '400',
    color: theme.colors.text_secondary,
  },
  ratingScoreText: {
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
    color: '#FFB800',
  },
  reviewCountText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_secondary,
    marginLeft: 2,
  },
  emptyReviewText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_gray,
    textAlign: 'center',
    paddingVertical: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.bg_gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userText: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: theme.fontSizes.lg,
    lineHeight: theme.fontSizes.lg + 4,
    fontWeight: '500',
    color: theme.colors.text_default,
  },
  userPhone: {
    fontSize: theme.fontSizes.sm,
    lineHeight: theme.fontSizes.sm + 4,
    fontWeight: '400',
    color: theme.colors.text_secondary,
    marginTop: 2,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg_gray,
  },
  specLabel: {
    fontSize: theme.fontSizes.md,
    lineHeight: theme.fontSizes.md + 4,
    fontWeight: '400',
    color: theme.colors.text_secondary,
  },
  specValue: {
    fontSize: theme.fontSizes.md,
    lineHeight: theme.fontSizes.md + 4,
    fontWeight: '500',
    color: theme.colors.text_default,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: theme.colors.bg_gray,
    gap: 20,
  },
  rentButton: {
    flex: 1,
    backgroundColor: theme.colors.button_bg_default,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rentButtonDisabled: {
    backgroundColor: theme.colors.bg_gray,
  },
  rentButtonText: {
    color: theme.colors.text_default,
    fontSize: theme.fontSizes.lg,
    lineHeight: theme.fontSizes.lg + 4,
    fontWeight: '600',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: theme.colors.selected,
  },
  followButtonActive: {
    backgroundColor: theme.colors.selected,
    borderColor: theme.colors.selected,
  },
  followButtonText: {
    fontSize: theme.fontSizes.sm,
    lineHeight: theme.fontSizes.sm + 4,
    fontWeight: '500',
    color: theme.colors.selected,
  },
  followButtonTextActive: {
    color: 'white',
  },
});
