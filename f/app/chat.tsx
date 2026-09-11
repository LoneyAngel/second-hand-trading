import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { theme } from '../theme';
import { useAuth } from '../src/hooks/useAuth';
import { messageService, rentalService } from '../src/services';
import type { Message } from '../src/types';
import { getSocket, markSocketRead, sendSocketMessage } from '../src/utils/socket';
import type { Socket } from 'socket.io-client';
import { useDebouncedPress } from '../src/hooks/useDebouncedPress';

export default function ChatPage() {
  const params = useLocalSearchParams<{
    userId: string;
    userName?: string;
    userAvatar?: string;
    productId?: string;
    productTitle?: string;
    productImage?: string;
    productPrice?: string;
  }>();

  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const socketBoundRef = useRef(false);

  const otherUserId = params.userId || '';
  const otherUserName = params.userName || '用户';
  const otherUserAvatar = params.userAvatar || '';

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, []);

  // 标记已读（socket 优先，HTTP 兜底）
  const doMarkAsRead = useCallback(() => {
    if (!otherUserId) return;
    if (socketRef.current?.connected) {
      markSocketRead(otherUserId);
    } else {
      messageService.markAsRead(otherUserId).catch(() => {});
    }
  }, [otherUserId]);

  // 加载历史消息
  const loadHistory = useCallback(async () => {
    if (!otherUserId) return;
    try {
      const res = await messageService.getMessages(otherUserId);
      // 后端返回倒序，前端翻转为正序
      const list = (res.data || []).slice().reverse();
      setMessages(list);
      if (list.length > 0) {
        scrollToBottom();
      }
      // 标记已读
      doMarkAsRead();
    } catch (err) {
      console.error('加载消息失败:', err);
    } finally {
      setLoading(false);
    }
  }, [otherUserId, doMarkAsRead, scrollToBottom]);

  // 连接 socket 并绑定事件
  const connectSocket = useCallback(async () => {
    try {
      const socket = await getSocket();
      socketRef.current = socket;
      if (socketBoundRef.current) return;
      socketBoundRef.current = true;

      // 收到对方发来的消息
      socket.on('message:receive', (msg: Message) => {
        if (msg.senderId !== otherUserId) return; // 只处理当前会话
        setMessages((prev) => {
          // 去重
          if (prev.some((m) => m.id === msg.id)) return prev;
          const next = [...prev, msg];
          scrollToBottom();
          return next;
        });
        // 自动标记已读
        doMarkAsRead();
      });

      // 自己发送的消息送达确认
      socket.on('message:sent', (msg: Message & { clientId?: string }) => {
        if (msg.receiverId !== otherUserId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.clientId ||
            (msg.clientId && m.id.startsWith('temp_') && m.content === msg.content)
              ? { ...msg, status: 'sent' as const }
              : m,
          ),
        );
      });

      // 发送失败
      socket.on('message:error', ({ clientId }: { clientId?: string }) => {
        if (!clientId) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === clientId ? { ...m, status: 'failed' as const } : m)),
        );
      });

      // 对方已读回执
      socket.on('message:read:ack', ({ fromUserId }: { fromUserId: string }) => {
        if (fromUserId !== otherUserId) return;
        // 把我发的所有消息标记为已读
        setMessages((prev) =>
          prev.map((m) => (m.senderId === user?.id ? { ...m, status: 'read' as const } : m)),
        );
      });
    } catch (err) {
      console.error('Socket 连接失败:', err);
    }
  }, [otherUserId, doMarkAsRead, scrollToBottom, user?.id]);

  // 页面聚焦时加载历史 + 连接 socket
  useFocusEffect(
    useCallback(() => {
      loadHistory();
      connectSocket();

      return () => {
        // 离开页面时清理事件监听（不断开连接，全局复用）
        const socket = socketRef.current;
        if (socket && socketBoundRef.current) {
          socket.off('message:receive');
          socket.off('message:sent');
          socket.off('message:error');
          socket.off('message:read:ack');
          socketBoundRef.current = false;
        }
      };
    }, [loadHistory, connectSocket]),
  );

  // 发送消息
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !otherUserId || sending) return;

    // 构造临时消息（立即显示在界面上）
    const tempId = `temp_${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId: otherUserId,
      senderId: user?.id || '',
      receiverId: otherUserId,
      type: 'text',
      content: text,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    setInputText('');
    Keyboard.dismiss();
    scrollToBottom();

    setSending(true);
    try {
      const socket = socketRef.current;
      if (socket?.connected) {
        // 通过 socket 发送
        sendSocketMessage({
          receiverId: otherUserId,
          content: text,
          type: 'text',
          productId: params.productId,
          clientId: tempId,
        });
        // socket 送达确认由 message:sent 事件处理
      } else {
        // HTTP 兜底
        const sentMsg = await messageService.sendMessage({
          receiverId: otherUserId,
          type: 'text',
          content: text,
          productId: params.productId,
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...sentMsg, status: 'sent' as const } : m)),
        );
      }
    } catch (err) {
      console.error('发送失败:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m)),
      );
    } finally {
      setSending(false);
    }
  }, [inputText, otherUserId, sending, user?.id, params.productId, scrollToBottom]);

  // 重发消息
  const handleResend = (msg: Message) => {
    // 先移除失败消息，重新发送
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setInputText(msg.content);
  };

  // 处理订单卡片上的"确认完成"操作
  const handleOrderComplete = async (orderId: string) => {
    try {
      const updated = await rentalService.completeRental(orderId);
      // 更新本地消息中的订单状态
      setMessages((prev) =>
        prev.map((m) =>
          m.type === 'order' && m.order?.orderId === orderId
            ? {
                ...m,
                order: {
                  ...m.order!,
                  status: updated.status,
                  completeRequestedBy: updated.completeRequestedBy || undefined,
                },
              }
            : m,
        ),
      );
    } catch (err: any) {
      Alert.alert('提示', err.response?.data?.message || '操作失败');
    }
  };

  // 跳转订单详情（参数化防抖，与 useDebouncedPress 同款 800ms 锁）
  const orderDetailLockRef = useRef(false);
  const goToOrderDetail = (orderId: string) => {
    if (orderDetailLockRef.current) return;
    orderDetailLockRef.current = true;
    router.push({ pathname: '/rental-detail', params: { id: orderId } });
    setTimeout(() => {
      orderDetailLockRef.current = false;
    }, 800);
  };

  // 跳转商品详情
  const goToProductDetail = useDebouncedPress(() => {
    router.push({ pathname: '/detail', params: { id: params.productId } });
  });

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    const showRead = isMe && item.status === 'read';
    const isOrder = item.type === 'order' && item.order;

    return (
      <View style={{ gap: 2 }}>
        <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
          {!isMe && (
            <View style={styles.msgAvatar}>
              {otherUserAvatar ? (
                <Image source={{ uri: otherUserAvatar }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
                  <AntDesign name='user' size={14} color={theme.colors.text_gray} />
                </View>
              )}
            </View>
          )}

          {isOrder ? (
            <View style={[styles.orderCard, isMe ? styles.orderCardRight : styles.orderCardLeft]}>
              <TouchableOpacity
                style={styles.orderCardHeader}
                onPress={() => goToOrderDetail(item.order!.orderId)}
              >
                <Image source={{ uri: item.order!.productImage }} style={styles.orderProductImg} />
                <View style={styles.orderProductInfo}>
                  <Text style={styles.orderProductTitle} numberOfLines={2}>
                    {item.order!.productTitle}
                  </Text>
                  <Text style={styles.orderProductPrice}>￥{item.order!.productPrice}/天</Text>
                </View>
                <AntDesign name='right' size={14} color={theme.colors.text_gray} />
              </TouchableOpacity>

              <View style={styles.orderCardBody}>
                <Text style={[styles.orderStatusText, isMe && styles.orderStatusTextRight]}>
                  {item.content}
                </Text>
              </View>

              {/* 操作按钮：对方发起了完成确认，我是接收方时显示"确认完成" */}
              {item.order!.status === 'ongoing' &&
                item.order!.completeRequestedBy &&
                item.order!.completeRequestedBy !== user?.id && (
                  <View style={styles.orderCardActions}>
                    <TouchableOpacity
                      style={[styles.orderBtn, styles.orderBtnPrimary]}
                      onPress={() => handleOrderComplete(item.order!.orderId)}
                    >
                      <Text style={styles.orderBtnTextPrimary}>确认完成</Text>
                    </TouchableOpacity>
                  </View>
                )}

              {/* 发起方显示"等待对方确认" */}
              {item.order!.status === 'ongoing' && item.order!.completeRequestedBy === user?.id && (
                <View style={styles.orderCardActions}>
                  <Text style={styles.orderWaitingText}>等待对方确认…</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
              <Text style={[styles.bubbleText, isMe && styles.bubbleTextRight]}>
                {item.content}
              </Text>
            </View>
          )}

          {isMe && item.status === 'failed' && (
            <TouchableOpacity
              onPress={() => handleResend(item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <AntDesign name='exclamation-circle' size={16} color='#F5222D' />
            </TouchableOpacity>
          )}
        </View>
        {showRead && <Text style={[styles.readLabel, styles.readLabelRight]}>已读</Text>}
      </View>
    );
  };

  // 商品卡片（如果是从商品详情进入，顶部显示商品信息）
  const renderProductCard = () => {
    if (!params.productId || !params.productTitle) return null;
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={goToProductDetail}
      >
        {params.productImage ? (
          <Image source={{ uri: params.productImage }} style={styles.productImg} />
        ) : (
          <View style={[styles.productImg, styles.avatarPlaceholder]}>
            <AntDesign name='picture' size={20} color={theme.colors.text_gray} />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {params.productTitle}
          </Text>
          {params.productPrice ? (
            <Text style={styles.productPrice}>￥{params.productPrice}</Text>
          ) : null}
        </View>
        <AntDesign name='right' size={14} color={theme.colors.text_gray} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.back()}
        >
          <AntDesign name='arrow-left' size={22} color='#000' />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {otherUserName}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {/* 商品卡片 */}
      {renderProductCard()}

      {/* 消息列表 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='small' color={theme.colors.selected} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>开始聊天吧</Text>
            </View>
          }
          keyboardShouldPersistTaps='handled'
        />
      )}

      {/* 底部输入框 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder='输入消息...'
            placeholderTextColor={theme.colors.text_gray}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.7}
          >
            <Text style={styles.sendText}>发送</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  // 商品卡片
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    gap: 10,
  },
  productImg: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: theme.colors.bg_gray,
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productTitle: {
    fontSize: 13,
    color: theme.colors.text_default,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 14,
    color: theme.colors.text_price,
    fontWeight: '600',
  },
  // 消息列表
  listContent: {
    padding: 12,
    flexGrow: 1,
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
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.text_gray,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '80%',
  },
  msgRowLeft: {
    alignSelf: 'flex-start',
  },
  msgRowRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  msgAvatar: {
    width: 36,
    height: 36,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.bg_gray,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleLeft: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: theme.colors.selected,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: theme.colors.text_default,
    lineHeight: 20,
  },
  bubbleTextRight: {
    color: '#fff',
  },
  // 已读标记
  readLabel: {
    fontSize: 11,
    color: theme.colors.text_gray,
    marginTop: 4,
    marginHorizontal: 12,
  },
  readLabelRight: {
    textAlign: 'right',
    marginRight: 4,
  },
  // 底部输入栏
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F1F3',
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F5F6F8',
    borderRadius: 20,
    fontSize: 15,
    color: theme.colors.text_default,
    textAlignVertical: 'center',
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.selected,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sendBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // 订单卡片
  orderCard: {
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  orderCardLeft: {
    borderBottomLeftRadius: 4,
  },
  orderCardRight: {
    borderBottomRightRadius: 4,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
  },
  orderProductImg: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: theme.colors.bg_gray,
  },
  orderProductInfo: {
    flex: 1,
    gap: 4,
  },
  orderProductTitle: {
    fontSize: 13,
    color: theme.colors.text_default,
    lineHeight: 18,
    fontWeight: '500',
  },
  orderProductPrice: {
    fontSize: 13,
    color: theme.colors.text_price,
    fontWeight: '600',
  },
  orderCardBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  orderStatusText: {
    fontSize: 13,
    color: theme.colors.text_secondary,
  },
  orderStatusTextRight: {
    textAlign: 'right',
  },
  orderCardActions: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  orderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  orderBtnPrimary: {
    backgroundColor: theme.colors.selected,
  },
  orderBtnTextPrimary: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  orderWaitingText: {
    fontSize: 12,
    color: theme.colors.text_gray,
  },
});
