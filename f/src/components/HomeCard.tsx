import { StyleSheet, Text, View, Image, ImageSourcePropType, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { router } from 'expo-router';
import { useDebouncedPress } from '~/hooks/useDebouncedPress';

interface CardProps {
  id?: string;
  title?: string;
  price?: number;
  priceUnit?: string;
  productImage?: ImageSourcePropType;
  avatarImage?: ImageSourcePropType;
}

export default function HomeCard({
  title = '尼康-z5',
  price = 50,
  priceUnit = '/天',
  productImage = require('@assets/image/1.png'),
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
      <Image style={styles.productImage} source={productImage} />
      <View style={{ gap: 5, paddingTop: 5, paddingBottom: 10 }}>
        <View style={styles.userRow}>
          <Image style={styles.avatar} source={avatarImage} />
          <Text style={styles.title}>{title}</Text>
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
    height: 209,
    borderWidth: 2,
    borderColor: 'rgba(19, 63, 56, 0.05)',
    borderRadius: theme.radii.md,
    alignContent: 'center',
    justifyContent: 'center',
  },

  productImage: {
    width: 153,
    height: 153,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
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
    color: theme.colors.text_price,
    fontSize: theme.fontSizes.lg,
    lineHeight: 20,
    fontFamily: 'Oswald-SemiBold',
  },

  priceUnit: {
    color: theme.colors.text_secondary,
    paddingLeft: 2,
    fontSize: theme.fontSizes.xs,
    fontWeight: '300',
    lineHeight: 16,
    fontFamily: theme.fonts.light,
  },
});
