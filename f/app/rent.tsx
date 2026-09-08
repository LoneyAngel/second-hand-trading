import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '../theme';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '../src/hooks/useQuery';
import { addressService, productService, rentalService } from '../src/services';
import { useAuth } from '../src/hooks/useAuth';
import DateTimePicker from '@react-native-community/datetimepicker';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import Modal from '../src/components/Modal';
import type { Address } from '../src/types';

export default function RentPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();

  const {
    data: product,
    loading,
    error,
    refetch,
  } = useQuery(() => productService.getProduct(id, user?.id), { enabled: !!id });
  const { data: address, refetch: refetchDefaultAddress } = useQuery(
    () => addressService.getDefaultAddress(),
    { enabled: !!id },
  );
  const { data: addressList, refetch: refetchAddresses } = useQuery(
    () => addressService.getAddresses().then((res) => res.data),
    {
      enabled: !!id,
    },
  );

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPicker, setCurrentPicker] = useState<'start' | 'end' | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // 页面聚焦时刷新地址列表（从地址编辑页返回后自动更新）
  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetchAddresses();
        refetchDefaultAddress();
      }
    }, [id, refetchAddresses, refetchDefaultAddress]),
  );

  // 跳转到添加地址页
  const handleAddNewAddress = () => {
    setShowAddressModal(false);
    router.push('/address-edit');
  };

  const handleSelectAddress = async (addr: Address) => {
    if (!addr.isDefault) {
      try {
        await addressService.setDefaultAddress(addr.id);
        await Promise.all([refetchAddresses(), refetchDefaultAddress()]);
        setShowAddressModal(false);
      } catch (err) {
        Alert.alert('错误', '设置默认地址失败');
      }
    } else {
      setShowAddressModal(false);
    }
  };

  const deposit = product?.deposit || 0;
  const unitPrice = product?.price || 0;
  const priceUnit = product?.priceUnit || 'day';

  // 计算租金
  const { rentalFee, unitText } = useMemo(() => {
    if (!startDate || !endDate || !unitPrice) {
      return { rentalFee: 0, unitText: '' };
    }
    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (diffMs < 0) return { rentalFee: 0, unitText: '' };

    let fee = 0;
    let text = '';
    if (priceUnit === 'once') {
      fee = Number(unitPrice);
      text = '一次性';
    } else if (priceUnit === 'hour') {
      const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
      fee = Number(unitPrice) * hours;
      text = `共${hours}小时`;
    } else {
      // day
      const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
      fee = Number(unitPrice) * days;
      text = `共${days}天`;
    }
    return { rentalFee: fee, unitText: text };
  }, [startDate, endDate, unitPrice, priceUnit]);

  // 合计 = 租金 + 押金
  const totalPay = rentalFee + Number(deposit);

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      Alert.alert('提示', '请先登录');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('提示', '请选择租赁日期');
      return;
    }
    if (!address) {
      Alert.alert('提示', '请选择收货地址');
      return;
    }
    setIsSubmitting(true);
    try {
      await rentalService.createRental({
        productId: id!,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      Alert.alert('成功', '订单创建成功！', [{ text: '确定', onPress: () => router.back() }]);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '创建订单失败，请稍后重试';
      Alert.alert('失败', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => router.back()}
          >
            <AntDesign name='arrow-left' size={24} color='black' />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>确认租赁</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.selected} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => router.back()}
          >
            <AntDesign name='arrow-left' size={24} color='black' />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>确认租赁</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.back()}
        >
          <AntDesign name='arrow-left' size={24} color='black' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>确认租赁</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          onPress={() => setShowAddressModal(true)}
          activeOpacity={0.7}
          style={{
            backgroundColor: 'white',
            borderRadius: theme.radii.md,
            padding: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: theme.spacing.sm,
          }}
        >
          <SimpleLineIcons
            name='location-pin'
            size={20}
            color={theme.colors.text_default}
            style={{ marginRight: theme.spacing.sm }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flex: 1,
              flexShrink: 1,
              justifyContent: 'space-between',
              gap: theme.spacing.sm,
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                numberOfLines={2}
                ellipsizeMode='tail'
                style={{
                  fontSize: theme.fontSizes.md,
                  color: theme.colors.text_default,
                  fontWeight: '700',
                  flexShrink: 1,
                  marginBottom: 4,
                }}
              >
                {address?.detailAddress || '请先设置默认地址'}
              </Text>
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ color: theme.colors.text_gray, fontSize: theme.fontSizes.sm }}>
                  {address?.consignee || '未设置'}
                </Text>
                <Text style={{ color: theme.colors.text_gray, fontSize: theme.fontSizes.sm }}>
                  |
                </Text>
                <Text style={{ color: theme.colors.text_gray, fontSize: theme.fontSizes.sm }}>
                  {address?.mobile || '未设置'}
                </Text>
              </View>
            </View>
            <EvilIcons name='chevron-right' size={24} color={theme.colors.text_default} />
          </View>
        </TouchableOpacity>
        <View style={styles.productCard}>
          {product.images && product.images.length > 0 ? (
            <Image source={{ uri: product.images[0] }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.imagePlaceholder]}>
              <AntDesign name='picture' size={40} color={theme.colors.text_secondary} />
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {product.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text style={{ fontSize: theme.fontSizes.md, color: theme.colors.text_price }}>
                ¥
              </Text>
              <Text style={styles.productPrice}>{product.price}</Text>
              <Text style={{ fontSize: theme.fontSizes.sm, paddingLeft: 2 }}>/天</Text>
            </View>
            <Text style={styles.productStatus}>
              {product.status === 'available' ? '可立即租赁' : '已租出'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>租赁日期</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>开始日期</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setCurrentPicker('start')}>
                <Text style={[styles.dateText, !startDate && styles.placeholder]}>
                  {startDate ? startDate.toLocaleDateString() : '请选择开始日期'}
                </Text>
              </TouchableOpacity>
            </View>
            <AntDesign name='arrow-right' size={20} color={theme.colors.text_secondary} />
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>结束日期</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setCurrentPicker('end')}>
                <Text style={[styles.dateText, !endDate && styles.placeholder]}>
                  {endDate ? endDate.toLocaleDateString() : '请选择开始日期'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {unitText && rentalFee > 0 && <Text style={styles.daysText}>{unitText}</Text>}
        </View>
        {currentPicker === 'start' && (
          <DateTimePicker
            value={startDate || new Date()}
            mode='date'
            display={Platform.OS === 'ios' ? 'spinner' : 'default'} // ios可选 'spinner' 滚轮或 'calendar' 日历
            onValueChange={(event, selectedDate) => {
              const currentDate = selectedDate || startDate || new Date();
              // Android 需要手动关闭弹窗，iOS 是常驻/内嵌显示的
              if (Platform.OS !== 'ios') setCurrentPicker(null);

              if (selectedDate) {
                setStartDate(selectedDate);
                // 如果新选的开始日期比已有的结束日期还要晚，把结束日期清空，让用户重新选
                if (endDate && selectedDate > endDate) {
                  setEndDate(null);
                }
              }
            }}
            minimumDate={new Date()} // 可选：设置最小日期
          />
        )}
        {currentPicker === 'end' && (
          <DateTimePicker
            value={endDate || new Date()}
            mode='date'
            display={Platform.OS === 'ios' ? 'spinner' : 'default'} // ios可选 'spinner' 滚轮或 'calendar' 日历
            onValueChange={(event, selectedDate) => {
              const currentDate = selectedDate || startDate || new Date();
              // Android 需要手动关闭弹窗，iOS 是常驻/内嵌显示的
              if (Platform.OS !== 'ios') setCurrentPicker(null);
              setEndDate(currentDate);
            }}
            minimumDate={new Date()} // 可选：设置最小日期
          />
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>租赁费用</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>租金</Text>
            <Text style={styles.feeValue}>¥{rentalFee}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>押金</Text>
            <Text style={styles.feeValue}>¥{deposit}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>合计</Text>
            <Text style={styles.totalValue}>¥{totalPay}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>租赁须知</Text>
          <Text style={styles.noticeText}>• 请确认好租赁时间后再提交订单</Text>
          <Text style={styles.noticeText}>• 租赁期间请爱护商品</Text>
          <Text style={styles.noticeText}>• 归还时如有损坏将从押金中扣除</Text>
          <Text style={styles.noticeText}>• 如有问题请与出租方联系</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.priceInfo}>
          <Text style={styles.bottomLabel}>合计</Text>
          <Text style={styles.bottomPrice}>¥{totalPay}</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitButton, product.status !== 'available' && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={product.status !== 'available' || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size='small' color='white' />
          ) : (
            <Text style={styles.submitButtonText}>
              {product.status === 'available' ? '立即租赁' : '商品已租出'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <AddressModal
        visible={showAddressModal}
        addressList={addressList || []}
        selectedAddress={address || null}
        onSelect={handleSelectAddress}
        onClose={() => setShowAddressModal(false)}
        onAddNew={handleAddNewAddress}
      />
    </SafeAreaView>
  );
}

// 地址选择 Modal 组件
function AddressModal({
  visible,
  addressList,
  selectedAddress,
  onSelect,
  onClose,
  onAddNew,
}: {
  visible: boolean;
  addressList: Address[];
  selectedAddress: Address | null;
  onSelect: (addr: Address) => void;
  onClose: () => void;
  onAddNew: () => void;
}) {
  const screenHeight = Dimensions.get('window').height;
  const modalHeight = screenHeight * (3 / 4);

  return (
    <Modal visible={visible} onPress={onClose} h={modalHeight}>
      <View style={{ paddingTop: theme.spacing.md, flex: 1 }}>
        <View style={addressModalStyles.header}>
          <Text style={addressModalStyles.title}>选择收货地址</Text>
        </View>
        <FlatList
          data={addressList}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                addressModalStyles.addressItem,
                selectedAddress?.id === item.id && addressModalStyles.selectedItem,
              ]}
              onPress={() => onSelect(item)}
            >
              <View style={addressModalStyles.addressContent}>
                <Text style={addressModalStyles.consignee}>{item.consignee}</Text>
                <Text style={addressModalStyles.mobile}>{item.mobile}</Text>
                <Text style={addressModalStyles.address}>{item.detailAddress}</Text>
              </View>
              {item.isDefault && <Text style={addressModalStyles.defaultBadge}>默认</Text>}
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text>暂无地址</Text>
            </View>
          )}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TouchableOpacity style={addressModalStyles.addButton} onPress={onAddNew}>
            <AntDesign name='plus' size={20} color='white' />
            <Text style={addressModalStyles.addButtonText}>添加地址</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    lineHeight: theme.fontSizes.xl + 4,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: theme.radii.md,
    padding: 12,
    gap: 12,
    marginBottom: 16,
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
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '500',
    lineHeight: theme.fontSizes.lg + 4,
    color: theme.colors.text_default,
  },
  productPrice: {
    fontSize: theme.fontSizes.xl,
    fontWeight: '600',
    lineHeight: theme.fontSizes.xl + 4,
    color: theme.colors.text_price,
  },
  productStatus: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '400',
    lineHeight: theme.fontSizes.sm + 4,
    color: theme.colors.text_secondary,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: theme.radii.md,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '600',
    lineHeight: theme.fontSizes.lg + 4,
    color: theme.colors.text_default,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '400',
    lineHeight: theme.fontSizes.md + 4,
    color: theme.colors.text_secondary,
    marginBottom: 8,
  },
  dateButton: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: theme.radii.sm,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dateText: {
    fontSize: theme.fontSizes.md,
    fontWeight: '400',
    lineHeight: theme.fontSizes.md + 4,
    color: theme.colors.text_default,
  },
  placeholder: {
    color: '#CCCCCC',
  },
  daysText: {
    fontSize: theme.fontSizes.md,
    fontWeight: '500',
    lineHeight: theme.fontSizes.md + 4,
    color: theme.colors.selected,
    marginTop: 8,
    textAlign: 'right',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  feeLabel: {
    fontSize: theme.fontSizes.md,
    fontWeight: '400',
    lineHeight: theme.fontSizes.md + 4,
    color: theme.colors.text_secondary,
  },
  feeValue: {
    fontSize: theme.fontSizes.md,
    fontWeight: '500',
    lineHeight: theme.fontSizes.md + 4,
    color: theme.colors.text_default,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.bg_gray,
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '600',
    lineHeight: theme.fontSizes.lg + 4,
    color: theme.colors.text_default,
  },
  totalValue: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: '600',
    lineHeight: theme.fontSizes.xxl + 4,
    color: theme.colors.text_price,
  },
  noticeText: {
    fontSize: theme.fontSizes.md,
    fontWeight: '400',
    lineHeight: theme.fontSizes.md + 4,
    color: theme.colors.text_secondary,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: theme.colors.bg_gray,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  bottomLabel: {
    fontSize: theme.fontSizes.md,
    fontWeight: '400',
    lineHeight: theme.fontSizes.md + 4,
    color: theme.colors.text_secondary,
  },
  bottomPrice: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: '600',
    lineHeight: theme.fontSizes.xxl + 4,
    color: theme.colors.text_price,
  },
  submitButton: {
    backgroundColor: theme.colors.selected,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: theme.radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.lg,
    fontWeight: '500',
    lineHeight: theme.fontSizes.lg + 4,
  },
});

const addressModalStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg_gray,
    marginBottom: 16,
    paddingVertical: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '600',
    lineHeight: theme.fontSizes.lg + 4,
    color: theme.colors.text_default,
  },
  addressItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.bg_gray,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: theme.colors.selected,
    opacity: 0.2,
  },
  addressContent: {
    flex: 1,
  },
  consignee: {
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
    lineHeight: theme.fontSizes.md + 4,
    color: theme.colors.text_default,
    marginBottom: 4,
  },
  mobile: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '400',
    lineHeight: theme.fontSizes.sm + 4,
    color: theme.colors.text_secondary,
    marginBottom: 4,
  },
  address: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '400',
    lineHeight: theme.fontSizes.sm + 4,
    color: theme.colors.text_secondary,
  },
  defaultBadge: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '600',
    lineHeight: theme.fontSizes.sm + 4,
    color: theme.colors.selected,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    overflow: 'hidden',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.selected,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radii.md,
    marginTop: 12,
  },
  addButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
    lineHeight: theme.fontSizes.md + 4,
  },
});
