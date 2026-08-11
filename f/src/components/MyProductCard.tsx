import { StyleSheet, Text, View, Image, TouchableOpacity, Alert, Platform } from 'react-native';
import { theme } from '../../theme';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import type { Product } from '../types';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import { useState } from 'react';
import CModal from './Modal';
import { productService } from '../services';

interface MyProductCardProps {
  product: Product;
  onRefresh?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  available: '可租赁',
  rented: '已租出',
  maintenance: '维护中',
  delist: '已下架',
};

const STATUS_COLORS: Record<string, string> = {
  available: theme.colors.text_price,
  rented: theme.colors.text_secondary,
  maintenance: '#FF9500',
  delist: '#9CA3AF',
};

export default function MyProductCard({ product, onRefresh }: MyProductCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);

  const handlePress = () => {
    router.push({
      pathname: '/detail',
      params: { id: product.id },
    });
  };

  const handleEdit = () => {
    router.push({
      pathname: '/upload',
      params: { id: product.id, mode: 'edit' },
    });
  };

  const handleOffline = () => {
    Alert.alert('确认下架', '下架后商品将不再展示，确定要下架吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定下架',
        style: 'destructive',
        onPress: async () => {
          try {
            await productService.updateProduct(product.id, { status: 'delist' });
            Alert.alert('成功', '商品已下架');
            onRefresh?.();
          } catch (error: any) {
            const msg = error.response?.data?.message || '下架失败，请重试';
            Alert.alert('失败', msg);
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    const shareText = `【${product.title}】\n租金 ¥${product.price}/天\n快来看看吧！`;
    const shareUrl = `campus-secondhand://product/${product.id}`;

    // Web 端：优先使用浏览器原生 Web Share API
    if (Platform.OS === 'web') {
      const nav = navigator as any;
      if (nav.share) {
        try {
          await nav.share({
            title: product.title,
            text: shareText,
            url: shareUrl,
          });
          return;
        } catch (e: any) {
          // 用户取消分享不提示错误
          if (e?.name === 'AbortError') return;
        }
      }
      // 不支持 Web Share 则复制到剪贴板
      try {
        await Clipboard.setStringAsync(shareText + '\n' + shareUrl);
        Alert.alert('已复制', '商品信息已复制到剪贴板，可粘贴分享给好友');
      } catch {
        Alert.alert('提示', '分享失败');
      }
      return;
    }

    // 原生端：使用 expo-sharing
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(shareUrl, {
          dialogTitle: product.title,
          mimeType: 'text/plain',
        });
      } else {
        await Clipboard.setStringAsync(shareText + '\n' + shareUrl);
        Alert.alert('已复制', '商品信息已复制到剪贴板');
      }
    } catch (error) {
      try {
        await Clipboard.setStringAsync(shareText + '\n' + shareUrl);
        Alert.alert('已复制', '商品信息已复制到剪贴板');
      } catch {
        Alert.alert('提示', '分享失败');
      }
    }
  };

  const handleMenuOption = (option: string) => {
    setMenuVisible(false);
    switch (option) {
      case 'fanPrice':
        Alert.alert('提示', '功能开发中');
        break;
      case 'share':
        handleShare();
        break;
      case 'offline':
        handleOffline();
        break;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={styles.cardContent}>
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
            <Text style={styles.price}>￥{product.price}</Text>
            <Text style={styles.priceUnit}>/天</Text>
          </View>
          <View style={styles.bottomRow}>
            <Text style={[styles.status, { color: STATUS_COLORS[product.status] }]}>
              {STATUS_LABELS[product.status]}
            </Text>
            {/* <Text style={styles.deposit}>押金 ￥{product.deposit}</Text> */}
          </View>
        </View>
      </TouchableOpacity>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* 左下角三个点菜单 */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Entypo name='dots-three-horizontal' size={20} color={theme.colors.text_secondary} />
        </TouchableOpacity>
        {/* 右下角编辑按钮 */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEdit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text
            style={{
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              borderColor: 'rgba(177, 177, 177, 0.45)',
              paddingVertical: 6,
              paddingHorizontal: 20,
              fontWeight: 500,
            }}
          >
            编辑
          </Text>
        </TouchableOpacity>
      </View>

      {/* 底部弹窗菜单 */}
      <CModal visible={menuVisible} onPress={() => setMenuVisible(false)}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuOption('fanPrice')}>
            <Text style={styles.menuItemText}>设粉丝价</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuOption('share')}>
            <Text style={styles.menuItemText}>分享</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuOption('offline')}>
            <Text style={[styles.menuItemText, styles.offlineText]}>下架</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setMenuVisible(false)}>
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
        </View>
      </CModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
    gap: theme.spacing.md,
    position: 'relative',
  },
  cardContent: {
    flexDirection: 'row',
    flex: 1,
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
    fontSize: theme.fontSizes.lg,
    lineHeight: 20,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  price: {
    color: theme.colors.text_price,
    fontSize: theme.fontSizes.xl,
    fontWeight: 'bold',
  },
  priceUnit: {
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '500',
  },
  deposit: {
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.sm,
  },
  menuButton: {
    padding: 4,
  },
  editButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  menuItemText: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text_default,
  },
  offlineText: {
    color: theme.colors.text_price,
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.bg_gray,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: theme.colors.bg_gray,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text_default,
    fontWeight: '500',
  },
});
