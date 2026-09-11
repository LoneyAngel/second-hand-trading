import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { theme } from '../theme';
import { useQuery } from '../src/hooks/useQuery';
import { rentalService } from '../src/services';
import type { RentalRecord, RentalStatus } from '../src/types';

const TABS = [
  { key: 'renter', label: '我租到的' },
  { key: 'owner', label: '我租出的' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const STATUS_TEXT: Record<RentalStatus, string> = {
  pending: '待确认',
  ongoing: '租赁中',
  completed: '已完成',
  cancelled: '已取消',
  disputed: '争议中',
};

const STATUS_COLOR: Record<RentalStatus, string> = {
  pending: '#F59E0B',
  ongoing: theme.colors.selected,
  completed: '#6B7280',
  cancelled: '#9CA3AF',
  disputed: '#EF4444',
};

export default function MyRentalsPage() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>(type === 'owner' ? 'owner' : 'renter');

  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: rentals,
    loading,
    refetch,
  } = useQuery(
    () =>
      activeTab === 'renter' ? rentalService.getRenterRentals() : rentalService.getOwnerRentals(),
    {
      enabled: true,
    },
    [activeTab],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const pressLockRef = useRef(false);
  const goToRentalDetail = (id: string) => {
    if (pressLockRef.current) return;
    pressLockRef.current = true;
    router.push({
      pathname: '/rental-detail',
      params: { id },
    });
    setTimeout(() => {
      pressLockRef.current = false;
    }, 800);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  };

  const renderItem = ({ item }: { item: RentalRecord }) => (
    <TouchableOpacity
      style={styles.rentalCard}
      activeOpacity={0.7}
      onPress={() => goToRentalDetail(item.id)}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
          {STATUS_TEXT[item.status]}
        </Text>
        <Text style={styles.orderId}>订单号：{item.id.slice(0, 8)}...</Text>
      </View>

      <View style={styles.productRow}>
        {item.product.images && item.product.images.length > 0 ? (
          <Image source={{ uri: item.product.images[0] }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.imagePlaceholder]}>
            <AntDesign name='picture' size={24} color={theme.colors.text_secondary} />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.product.title}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>租金</Text>
            <Text style={styles.priceValue}>¥{item.totalAmount}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>押金</Text>
            <Text style={styles.priceValue}>¥{item.deposit}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.userInfo}>
          <Text style={styles.userLabel}>{activeTab === 'renter' ? '出租方' : '承租方'}：</Text>
          <Text style={styles.userName}>
            {activeTab === 'renter' ? item.owner?.nickname : item.renter?.nickname || '用户'}
          </Text>
        </View>
        <Text style={styles.dateText}>
          {formatDate(item.startDate)} - {formatDate(item.endDate)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.back()}
        >
          <AntDesign name='arrow-left' size={24} color='black' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的订单</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab 切换 */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 订单列表 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.selected} />
        </View>
      ) : (
        <FlatList
          data={rentals || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.selected]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AntDesign name='inbox' size={48} color={theme.colors.text_secondary} />
              <Text style={styles.emptyText}>暂无订单</Text>
            </View>
          }
        />
      )}
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
    fontWeight: '600',
    color: theme.colors.text_default,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg_gray,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.selected,
  },
  tabText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_secondary,
    fontWeight: '400',
  },
  activeTabText: {
    color: theme.colors.selected,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  rentalCard: {
    backgroundColor: 'white',
    borderRadius: theme.radii.md,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
  },
  orderId: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_secondary,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: theme.radii.sm,
  },
  imagePlaceholder: {
    backgroundColor: theme.colors.bg_gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: theme.fontSizes.md,
    fontWeight: '500',
    color: theme.colors.text_default,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_secondary,
  },
  priceValue: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '500',
    color: theme.colors.text_price,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.bg_gray,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_secondary,
  },
  userName: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_default,
    fontWeight: '500',
  },
  dateText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_secondary,
  },
});
