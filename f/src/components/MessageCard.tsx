import { StyleSheet, Text, Pressable, Image, View } from 'react-native';
import { theme } from 'theme';
import Feather from '@expo/vector-icons/Feather';

export interface OrderMessageData {
  orderId: string;
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled' | 'disputed';
  /** 发起完成确认的用户ID，ongoing 且非空表示等待对方确认 */
  completeRequestedBy?: string;
  /** 当前登录用户ID，用于判断按钮展示 */
  currentUserId?: string;
}
export interface OrderMessageData2 {
  orderId: string;
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled' | 'disputed';
  /** 发起完成确认的用户ID，ongoing 且非空表示等待对方确认 */
  completeRequestedBy?: string;
  /** 当前登录用户ID，用于判断按钮展示 */
  currentUserId?: string;
  extra?: string;
}

interface MessageCardProps {
  data: OrderMessageData;
  /** 气泡方向：left=对方发的，right=我发的 */
  position?: 'left' | 'right';
  /** 点击卡片跳转订单详情 */
  onPress?: () => void;
  onConfirmComplete?: () => void;
}

interface MessageCardProps2 {
  data: OrderMessageData2;
  user: any;
  /** 点击卡片跳转订单详情 */
  onPress?: () => void;
  cancel: () => void;
  accept: () => void;
}

export function MessageCard1({
  data,
  position = 'left',
  onPress,
  onConfirmComplete,
}: MessageCardProps) {
  const isRight = position === 'right';

  const showConfirmBtn =
    data.status === 'ongoing' &&
    !!data.completeRequestedBy &&
    data.completeRequestedBy !== data.currentUserId;

  const showWaiting = data.status === 'ongoing' && data.completeRequestedBy === data.currentUserId;

  const tipText = (() => {
    if (showConfirmBtn) return '对方已发起完成确认';
    if (showWaiting) return '等待对方确认完成';
    if (data.status === 'ongoing') return '订单已接受';
    if (data.status === 'completed') return '订单已完成';
    if (data.status === 'cancelled') return '订单已取消';
    if (data.status === 'pending') return '等待确认订单';
    return '订单信息';
  })();

  const subText = showConfirmBtn ? '点击查看订单详情' : undefined;

  return (
    <Pressable style={styles.container} onPress={onPress} disabled={!onPress}>
      <Text style={[styles.title, isRight && styles.textRight]}>{tipText}</Text>
      {subText ? <Text style={[styles.sub, isRight && styles.textRight]}>{subText}</Text> : null}
      {showConfirmBtn && onConfirmComplete ? (
        <Pressable
          style={[styles.btn, isRight && styles.btnAlignRight]}
          onPress={onConfirmComplete}
        >
          <Text style={styles.btnText}>确认完成</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

// ==================== MessageCard2：新订单通知卡片 ====================

export interface OrderInfoData {
  orderId: string;
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled' | 'disputed';
  startDate: string;
  endDate: string;
  totalAmount: number;
  productTitle?: string;
  productImage?: string;
  productPrice?: number;
}

export interface OrderUserInfo {
  id: string;
  name: string;
  avatar: string;
  address?: string;
}

export interface MessageCard2Props {
  /** 订单信息 */
  data: OrderInfoData;
  /** 对方用户信息 */
  user: OrderUserInfo;
  /** 点击卡片跳转订单详情 */
  onPress?: () => void;
  /** 拒绝/取消按钮 */
  onCancel?: () => void;
  /** 接受/确认按钮 */
  onAccept?: () => void;
  /** 气泡方向 */
  position?: 'left' | 'right';
  /** 是否显示操作按钮，不传则由 status + 回调自动判断 */
  showActions?: boolean;
}

/**
 * 新订单通知卡片
 * - pending 状态：显示"拒绝 / 接受订单"按钮（房东视角）
 * - 非 pending：隐藏操作按钮，仅展示订单信息
 */
export function MessageCard2({
  data,
  user,
  onPress,
  onCancel,
  onAccept,
  position = 'left',
  showActions,
}: MessageCard2Props) {
  const isRight = position === 'right';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`;
  };

  const acceptText = data.status === 'pending' ? '接受订单' : '确认完成';
  const cancelText = data.status === 'pending' ? '拒绝' : '取消订单';

  // 显示操作按钮：外部指定优先，否则自动判断
  const shouldShowActions = showActions !== undefined ? showActions : !!(onCancel || onAccept);

  return (
    <Pressable
      style={[styles.card2Container, isRight && styles.card2Right]}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* 用户信息 */}
      <View style={styles.card2UserRow}>
        <Image source={{ uri: user.avatar }} style={styles.card2Avatar} resizeMode='cover' />
        <View style={styles.card2UserInfo}>
          <Text style={[styles.card2UserName, isRight && styles.textRight]} numberOfLines={1}>
            {user.name}
          </Text>
          {user.address ? (
            <Text style={[styles.card2UserAddress, isRight && styles.textRight]} numberOfLines={1}>
              {user.address}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.card2Divider} />

      {/* 租赁信息 */}
      <View style={styles.card2InfoBlock}>
        <Text style={styles.card2InfoTitle}>租赁信息</Text>
        <View style={styles.card2InfoRow}>
          <Feather name='calendar' size={14} color={theme.colors.text_secondary} />
          <View style={styles.card2InfoContent}>
            <Text style={styles.card2InfoLabel}>租期</Text>
            <Text style={styles.card2InfoValue}>
              {formatDate(data.startDate)} 至 {formatDate(data.endDate)}
            </Text>
          </View>
        </View>
        <View style={styles.card2InfoRow}>
          <Feather name='dollar-sign' size={14} color={theme.colors.text_secondary} />
          <View style={styles.card2InfoContent}>
            <Text style={styles.card2InfoLabel}>租金合计</Text>
            <Text style={[styles.card2InfoValue, { color: theme.colors.selected }]}>
              ¥{data.totalAmount?.toFixed?.(2) ?? data.totalAmount}
            </Text>
          </View>
        </View>
      </View>

      {/* 操作按钮 */}
      {shouldShowActions ? (
        <>
          <View style={styles.card2Divider} />
          <View style={styles.card2ActionRow}>
            {onCancel ? (
              <Pressable style={[styles.card2Btn, styles.card2BtnOutline]} onPress={onCancel}>
                <Text style={styles.card2BtnOutlineText}>{cancelText}</Text>
              </Pressable>
            ) : null}
            {onAccept ? (
              <Pressable style={[styles.card2Btn, styles.card2BtnPrimary]} onPress={onAccept}>
                <Text style={styles.card2BtnPrimaryText}>{acceptText}</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 180,
    maxWidth: 260,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text_default,
    lineHeight: 20,
  },
  sub: {
    fontSize: 12,
    color: theme.colors.text_gray,
  },
  textRight: {
    textAlign: 'right',
  },
  btn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: theme.colors.selected,
  },
  btnAlignRight: {
    alignSelf: 'flex-end',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // ==================== MessageCard2 样式 ====================
  card2Container: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  card2Right: {
    // 右侧气泡可通过父容器控制，卡片本身样式一致
  },
  card2UserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  card2Avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.bg_gray,
  },
  card2UserInfo: {
    flex: 1,
    gap: 2,
  },
  card2UserName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text_default,
  },
  card2UserAddress: {
    fontSize: 12,
    color: theme.colors.text_gray,
  },
  card2Divider: {
    height: 1,
    backgroundColor: theme.colors.bg_gray,
  },
  card2InfoBlock: {
    gap: 8,
  },
  card2InfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text_default,
    marginBottom: 4,
  },
  card2InfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  card2InfoContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card2InfoLabel: {
    fontSize: 12,
    color: theme.colors.text_secondary,
  },
  card2InfoValue: {
    fontSize: 12,
    color: theme.colors.text_default,
    fontWeight: '500',
  },
  card2ActionRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    paddingTop: 2,
  },
  card2Btn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 70,
    alignItems: 'center',
  },
  card2BtnOutline: {
    borderWidth: 1,
    borderColor: theme.colors.text_gray,
    backgroundColor: 'transparent',
  },
  card2BtnPrimary: {
    backgroundColor: theme.colors.selected,
  },
  card2BtnOutlineText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text_gray,
  },
  card2BtnPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
