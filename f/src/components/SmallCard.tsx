import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { router } from 'expo-router';
import type { PriceUnit, Product } from '../types';
import AntDesign from '@expo/vector-icons/AntDesign';

interface SimpleProductCardProps {
  product: Product;
}

const STATUS_LABELS: Record<string, string> = {
  available: '可租赁',
  rented: '已租出',
  maintenance: '维护中',
};
const PRICE_UNITS: { value: PriceUnit; label: string }[] = [
  { value: 'day', label: '/天' },
  { value: 'hour', label: '/时' },
  { value: 'once', label: '/次' },
];

export default function SmallCard({ product }: SimpleProductCardProps) {
  const handlePress = () => {
    router.push({
      pathname: '/detail',
      params: { id: product.id },
    });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      {/* <View style={{ flexDirection: 'row' }}>
        <View style={styles.userAvatar}>
          {product.user.avatar ? (
            <Image source={{ uri: product.user.avatar }} style={styles.avatarImage} />
          ) : (
            <AntDesign name='user' size={24} color={theme.colors.text_secondary} />
          )}
        </View>
        <Text style={styles.userName}>{product.user.nickname || '用户'}</Text>
      </View> */}
      {product.images && product.images.length > 0 ? (
        <Image style={styles.productImage} source={{ uri: product.images[0] }} />
      ) : (
        <View style={[styles.productImage, styles.imagePlaceholder]}>
          <AntDesign name='picture' size={24} color={theme.colors.text_secondary} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceY}>￥</Text>
          <Text style={styles.price}>{product.price}</Text>
          <Text style={styles.priceUnit}>
            {PRICE_UNITS.find((u) => u.value === product.priceUnit)?.label}
          </Text>
        </View>
        <Text style={styles.status}>{STATUS_LABELS[product.status]}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: theme.radii.sm,
  },
  imagePlaceholder: {
    backgroundColor: theme.colors.bg_gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  title: {
    color: theme.colors.text_default,
    fontSize: theme.fontSizes.md,
    lineHeight: 18,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'baseline',
  },
  priceY: {
    color: theme.colors.text_default,
    fontSize: theme.fontSizes.sm,
    fontWeight: '500',
    lineHeight: 16,
    fontFamily: 'Oswald-Regular',
  },
  price: {
    color: theme.colors.text_default,
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
  },
  priceUnit: {
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.sm,
  },
  status: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '500',
  },
  // userAvatar: {
  //   width: 48,
  //   height: 48,
  //   borderRadius: 24,
  //   backgroundColor: theme.colors.bg_gray,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  // avatarImage: {
  //   width: 48,
  //   height: 48,
  //   borderRadius: 24,
  // },
  // userName: {
  //   fontSize: theme.fontSizes.lg,
  //   lineHeight: theme.fontSizes.lg + 4,
  //   fontWeight: '500',
  //   color: theme.colors.text_default,
  // },
});
