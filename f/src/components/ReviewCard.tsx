import { View, Text, Image, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import type { Review } from '../types';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface ReviewCardProps {
  review: Review;
}

// 星级评分组件
function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
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
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* 头部：头像 + 昵称 + 评分 + 日期 */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {review.user.avatar ? (
            <Image source={{ uri: review.user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(review.user.nickname || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ gap: 2 }}>
            <Text style={styles.nickname} numberOfLines={1}>
              {review.user.nickname || '匿名用户'}
            </Text>
            <StarRating rating={review.rating} size={12} />
          </View>
        </View>
        <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
      </View>

      {/* 评论内容 */}
      {review.content && <Text style={styles.content}>{review.content}</Text>}

      {/* 评论图片 */}
      {review.images && review.images.length > 0 && (
        <View style={styles.imageRow}>
          {review.images.slice(0, 4).map((img, idx) => (
            <Image key={idx} source={{ uri: img }} style={styles.reviewImage} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.bg_gray,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.selected,
  },
  avatarText: {
    color: '#fff',
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
  },
  nickname: {
    fontSize: theme.fontSizes.md,
    fontWeight: '500',
    color: theme.colors.text_default,
    maxWidth: 160,
  },
  date: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_secondary,
  },
  content: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_default,
    lineHeight: 22,
  },
  imageRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  reviewImage: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.bg_gray,
  },
});
