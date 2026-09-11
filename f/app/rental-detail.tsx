import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import { theme } from '../theme';
import { useQuery } from '../src/hooks/useQuery';
import { useDebouncedPress } from '../src/hooks/useDebouncedPress';
import { rentalService, messageService } from '../src/services';
import { useAuth } from '../src/hooks/useAuth';
import { useState } from 'react';
import type { RentalRecord, RentalStatus } from '../src/types';
import { getSocket, sendSocketMessage } from '../src/utils/socket';

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

const STATUS_DESC: Record<RentalStatus, string> = {
  pending: '等待出租方确认订单',
  ongoing: '租赁进行中，请按时归还',
  completed: '租赁已完成，感谢使用',
  cancelled: '订单已取消',
  disputed: '订单存在争议，平台介入中',
};

export default function RentalDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  // 自定义确认弹窗状态
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmType, setConfirmType] = useState<'default' | 'danger' | 'primary'>('default');
  const confirmActionRef = useState<(() => void) | null>(null);

  const {
    data: rental,
    loading,
    error,
    refetch,
  } = useQuery(() => rentalService.getRental(id!), { enabled: !!id });
  const goToProductDetail = useDebouncedPress(() => {
    router.push({
      pathname: '/detail',
      params: { id: rental?.productId },
    });
  });

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
          <Text style={styles.headerTitle}>订单详情</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.selected} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !rental) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => router.back()}
          >
            <AntDesign name='arrow-left' size={24} color='black' />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>订单详情</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const calcDays = () => {
    const start = new Date(rental.startDate);
    const end = new Date(rental.endDate);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const isOwner = user?.id === rental?.ownerId;
  const isRenter = user?.id === rental?.renterId;

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'default' | 'danger' | 'primary' = 'primary',
  ) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmType(type);
    confirmActionRef[1](() => onConfirm);
    setConfirmVisible(true);
  };

  const handleConfirm = () => {
    setConfirmVisible(false);
    setTimeout(() => {
      confirmActionRef[0]?.();
    }, 100);
  };

  const handleUpdateStatus = (status: RentalStatus, confirmText?: string) => {
    const doUpdate = async () => {
      setUpdating(true);
      try {
        await rentalService.updateRentalStatus(id!, { status });
        refetch();
      } catch (err: any) {
        // 错误由 showConfirm 不捕获，这里兜底
        console.error('操作失败:', err);
      } finally {
        setUpdating(false);
      }
    };

    if (confirmText) {
      showConfirm('确认操作', confirmText, doUpdate, status === 'cancelled' ? 'danger' : 'primary');
    } else {
      doUpdate();
    }
  };

  // 完成订单：发起确认 / 确认完成 / 撤销
  const handleComplete = () => {
    if (!rental) return;

    const doComplete = async () => {
      setUpdating(true);
      try {
        const wasRequested = !!rental.completeRequestedBy;
        const wasRequestedByOther =
          rental.completeRequestedBy && rental.completeRequestedBy !== user?.id;

        const updated = await rentalService.completeRental(id!);

        // 如果是首次发起（之前没有请求），发送订单卡片消息给对方
        if (!wasRequested && updated.completeRequestedBy) {
          const otherUser = isOwner ? rental.renter : rental.owner;
          try {
            const socket = await getSocket().catch(() => null);
            if (socket?.connected) {
              sendSocketMessage({
                receiverId: otherUser.id,
                content: '我已发起订单完成确认，请确认',
                type: 'order',
                rentalId: rental.id,
              });
            } else {
              // HTTP 兜底
              await messageService.sendMessage({
                receiverId: otherUser.id,
                type: 'order',
                content: '我已发起订单完成确认，请确认',
                extra: rental.id,
                productId: rental.productId,
              });
            }
          } catch (e) {
            console.error('发送订单卡片失败:', e);
          }
        }

        refetch();
      } catch (err: any) {
        console.error('操作失败:', err);
      } finally {
        setUpdating(false);
      }
    };

    let title = '发起完成确认';
    let msg = '确定发起订单完成确认吗？对方确认后订单将完成。';
    let type: 'primary' | 'danger' | 'default' = 'primary';

    if (rental.completeRequestedBy === user?.id) {
      title = '撤销完成确认';
      msg = '确定要撤销本次完成确认吗？';
      type = 'default';
    } else if (rental.completeRequestedBy) {
      title = '确认完成订单';
      msg = '对方已发起完成确认，确认后订单将变为已完成状态。';
      type = 'primary';
    }

    showConfirm(title, msg, doComplete, type);
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'accept':
        handleUpdateStatus('ongoing', '确定接受该订单吗？');
        break;
      case 'confirm':
        handleUpdateStatus('ongoing', '确认开始租赁吗？');
        break;
      case 'cancel':
        handleUpdateStatus('cancelled', '确定取消该订单吗？');
        break;
      case 'complete':
        handleComplete();
        break;
      case 'rent-again':
        router.push({ pathname: '/rent', params: { id: rental?.productId } });
        break;
      case 'contact': {
        const otherUser = isOwner ? rental.renter : rental.owner;
        if (!otherUser) return;
        router.push({
          pathname: '/chat',
          params: {
            userId: otherUser.id,
            userName: otherUser.nickname || '用户',
            userAvatar: otherUser.avatar || '',
            productId: rental.productId,
            productTitle: rental.product.title,
            productImage: rental.product.images?.[0] || '',
            productPrice: String(rental.product.price),
          },
        });
        break;
      }
      default:
        Alert.alert('提示', '功能开发中，敬请期待');
    }
  };

  // 根据订单状态和角色显示不同的操作按钮
  const renderActions = () => {
    if (!rental || !user) return null;
    const status = rental.status;

    const buttons: { label: string; action: string; primary?: boolean; danger?: boolean }[] = [];

    if (status === 'pending') {
      if (isOwner) {
        // 出租方：接受 + 拒绝（取消）
        buttons.push({ label: '拒绝订单', action: 'cancel', danger: true });
        buttons.push({ label: '接受订单', action: 'accept', primary: true });
      } else if (isRenter) {
        // 承租方：取消订单 + 确认订单
        buttons.push({ label: '取消订单', action: 'cancel', danger: true });
        buttons.push({ label: '确认订单', action: 'confirm', primary: true });
      }
    } else if (status === 'ongoing') {
      // 双方都可以取消或完成订单
      buttons.push({ label: '取消订单', action: 'cancel', danger: true });
      buttons.push({ label: '完成订单', action: 'complete', primary: true });
    } else if (status === 'completed') {
      if (isRenter) {
        buttons.push({ label: '再次租赁', action: 'rent-again', primary: true });
      }
    } else if (status === 'disputed') {
      buttons.push({ label: '查看详情', action: 'dispute-detail' });
    }

    if (buttons.length === 0) return null;

    return (
      <View style={styles.actionBar}>
        {buttons.map((btn, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.actionButton,
              btn.primary && styles.primaryButton,
              btn.danger && styles.dangerButton,
              updating && { opacity: 0.6 },
            ]}
            onPress={() => !updating && handleAction(btn.action)}
            disabled={updating}
          >
            <Text
              style={[
                styles.actionButtonText,
                btn.primary && styles.primaryButtonText,
                btn.danger && styles.dangerButtonText,
              ]}
            >
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.back()}
        >
          <AntDesign name='arrow-left' size={24} color='black' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>订单详情</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 状态横幅 */}
        <View style={styles.statusBanner}>
          <Text style={[styles.statusMain, { color: STATUS_COLOR[rental.status] }]}>
            {STATUS_TEXT[rental.status]}
          </Text>
          <Text style={styles.statusDesc}>{STATUS_DESC[rental.status]}</Text>
        </View>

        {/* 商品信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>商品信息</Text>
          <TouchableOpacity
            style={styles.productRow}
            activeOpacity={0.7}
            onPress={goToProductDetail}
          >
            {rental.product.images && rental.product.images.length > 0 ? (
              <Image source={{ uri: rental.product.images[0] }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, styles.imagePlaceholder]}>
                <AntDesign name='picture' size={28} color={theme.colors.text_secondary} />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {rental.product.title}
              </Text>
              <Text style={styles.productPrice}>¥{rental.product.price} / 天</Text>
            </View>
            <AntDesign name='right' size={16} color={theme.colors.text_secondary} />
          </TouchableOpacity>
        </View>

        {/* 租赁信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>租赁信息</Text>
          <View style={styles.infoRow}>
            <Feather name='calendar' size={16} color={theme.colors.text_secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>租期</Text>
              <Text style={styles.infoValue}>
                {formatDate(rental.startDate)} 至 {formatDate(rental.endDate)}
              </Text>
              <Text style={styles.infoSub}>共 {calcDays()} 天</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Feather name='user' size={16} color={theme.colors.text_secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>出租方</Text>
              <Text style={styles.infoValue}>{rental.owner?.nickname || '用户'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Feather name='user' size={16} color={theme.colors.text_secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>承租方</Text>
              <Text style={styles.infoValue}>{rental.renter?.nickname || '用户'}</Text>
            </View>
          </View>
        </View>

        {/* 费用明细 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>费用明细</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>租金（{calcDays()} 天）</Text>
            <Text style={styles.feeValue}>¥{rental.totalAmount}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>押金</Text>
            <Text style={styles.feeValue}>¥{rental.deposit}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>合计支付</Text>
            <Text style={styles.totalValue}>
              ¥{Number(rental.totalAmount) + Number(rental.deposit)}
            </Text>
          </View>
        </View>

        {/* 订单信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>订单信息</Text>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>订单编号</Text>
            <Text style={styles.orderInfoValue}>{rental.id}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>创建时间</Text>
            <Text style={styles.orderInfoValue}>{formatDateTime(rental.createdAt)}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>更新时间</Text>
            <Text style={styles.orderInfoValue}>{formatDateTime(rental.updatedAt)}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 底部操作栏 */}
      {renderActions()}

      {/* 自定义确认弹窗 */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType='fade'
        onRequestClose={() => setConfirmVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalMask}
          activeOpacity={1}
          onPress={() => setConfirmVisible(false)}
        >
          <TouchableOpacity style={styles.modalContent} activeOpacity={1}>
            <Text style={styles.modalTitle}>{confirmTitle}</Text>
            <Text style={styles.modalMessage}>{confirmMessage}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtnConfirm,
                  confirmType === 'danger' && styles.modalBtnDanger,
                  confirmType === 'default' && styles.modalBtnDefault,
                ]}
                onPress={handleConfirm}
              >
                <Text style={styles.modalBtnConfirmText}>确定</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_secondary,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: theme.colors.selected,
    borderRadius: theme.radii.sm,
  },
  retryText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
  },
  // 状态横幅
  statusBanner: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statusMain: {
    fontSize: theme.fontSizes.xl,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusDesc: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_secondary,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: theme.radii.md,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text_default,
    marginBottom: 12,
  },
  // 商品行
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    height: 80,
    paddingVertical: 4,
  },
  productTitle: {
    fontSize: theme.fontSizes.md,
    fontWeight: '500',
    color: theme.colors.text_default,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text_price,
  },
  // 租赁信息
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_secondary,
  },
  infoValue: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_default,
    fontWeight: '500',
  },
  infoSub: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.selected,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.bg_gray,
    marginVertical: 4,
  },
  // 费用明细
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  feeLabel: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_secondary,
  },
  feeValue: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_default,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: theme.fontSizes.md,
    fontWeight: '500',
    color: theme.colors.text_default,
  },
  totalValue: {
    fontSize: theme.fontSizes.xl,
    fontWeight: '600',
    color: theme.colors.text_price,
  },
  // 订单信息
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  orderInfoLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_secondary,
  },
  orderInfoValue: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_default,
  },
  // 底部操作栏
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.bg_gray,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.text_secondary,
    backgroundColor: 'white',
  },
  primaryButton: {
    backgroundColor: theme.colors.selected,
    borderColor: theme.colors.selected,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  dangerButton: {
    borderColor: '#EF4444',
    backgroundColor: 'white',
  },
  dangerButtonText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  actionButtonText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_default,
  },
  // 自定义确认弹窗
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F5F6F8',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: theme.colors.selected,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalBtnDanger: {
    backgroundColor: '#EF4444',
  },
  modalBtnDefault: {
    backgroundColor: '#333',
  },
});
