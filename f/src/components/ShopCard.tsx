import { StyleSheet, Text, View, Image, ImageSourcePropType, TouchableOpacity } from 'react-native';
import { theme } from '~/../theme';
import { router } from 'expo-router';
import { useDebouncedPress } from '../hooks/useDebouncedPress';

interface CardProps {
  id?: string;
  title?: string;
  price?: number;
  priceUnit?: string;
  productImage?: ImageSourcePropType;
  avatarImage?: ImageSourcePropType;
}

export default function ShopCard({
  title = '尼康-z5',
  price = 50,
  priceUnit = '/天',
  productImage = require('@assets/image/test.png'),
  avatarImage = require('@assets/image/2.png'),
  id = '1',
}: CardProps) {
  const handlePress = useDebouncedPress(() => {
    router.push({
      pathname: '/detail',
      params: { id, title, price },
    });
  });

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.imageWrapper}>
        <Image style={styles.productImage} source={productImage} resizeMode='cover' />
      </View>
      <View style={{ paddingTop: 5, paddingVertical: 5, paddingHorizontal: 10, gap: 5 }}>
        <View style={styles.userRow}>
          <Image style={styles.avatar} source={avatarImage} />
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceY}>￥</Text>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.priceUnit}>{priceUnit}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: theme.radii.sm,
    overflow: 'hidden',
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 5,
  },

  avatar: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  title: {
    color: theme.colors.text_default,
    fontSize: theme.fontSizes.lg - 1,
    lineHeight: 20,
    fontFamily: theme.fonts.medium,
    flexShrink: 1,
  },
  priceY: {
    color: theme.colors.text_price,
    fontSize: theme.fontSizes.sm,
    fontWeight: '500',
    lineHeight: 16,
    fontFamily: 'Oswald-Regular',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'baseline',
  },

  price: {
    color: theme.colors.text_price,
    fontSize: theme.fontSizes.lg,
    lineHeight: 20,
    fontFamily: 'Oswald-SemiBold',
  },

  priceUnit: {
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.xs,
    fontWeight: '300',
    lineHeight: 16,
    fontFamily: theme.fonts.light,
    paddingLeft: 2,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1, // 🚀 正方形图片比例（你也可以用 4 / 3 稍长一点）
    backgroundColor: '#F3F4F6', // 图片加载出来前的浅灰占位底色
  },
});
