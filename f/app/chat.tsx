import { useState, useCallback, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { theme } from '../theme';
import { useAuth } from '../src/hooks/useAuth';
import { messageService } from '../src/services';
import type { Message } from '../src/types';

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

  const otherUserId = params.userId || '';
  const otherUserName = params.userName || '用户';
  const otherUserAvatar = params.userAvatar || '';

  // 加载历史消息
  const loadMessages = useCallback(async () => {
    if (!otherUserId) return;
    setLoading(true);
    try {
      const res = await messageService.getMessages(otherUserId);
      // 后端返回的消息按时间倒序，前端反转成正序（旧的在上）
      const list = (res.data || []).slice().reverse();
      setMessages(list);
      // 标记已读
      messageService.markAsRead(otherUserId).catch(() => {});
    } catch (err) {
      console.error('加载消息失败:', err);
    } finally {
      setLoading(false);
    }
  }, [otherUserId]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages]),
  );

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // 发送消息
  const handleSend = async () => {
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
      const sentMsg = await messageService.sendMessage({
        receiverId: otherUserId,
        type: 'text',
        content: text,
        productId: params.productId,
      });
      // 替换临时消息
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...sentMsg, status: 'sent' } : m)),
      );
    } catch (err) {
      console.error('发送失败:', err);
      // 标记失败
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)),
      );
    } finally {
      setSending(false);
    }
  };

  // 重发消息
  const handleResend = (msg: Message) => {
    // 先移除失败消息，重新发送
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setInputText(msg.content);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    return (
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
        <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextRight]}>{item.content}</Text>
        </View>
        {isMe && item.status === 'failed' && (
          <TouchableOpacity
            onPress={() => handleResend(item)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <AntDesign name='exclamationcircleo' size={16} color='#F5222D' />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // 商品卡片（如果是从商品详情进入，顶部显示商品信息）
  const renderProductCard = () => {
    if (!params.productId || !params.productTitle) return null;
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => {
          router.push({ pathname: '/detail', params: { id: params.productId } });
        }}
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
        <Text style={styles.headerTitle} numberOfLines={1}>{otherUserName}</Text>
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
    marginBottom: 12,
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
});
