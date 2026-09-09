import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import AntDesign from '@expo/vector-icons/AntDesign';
import { theme } from '../../theme';
import { useQuery } from '../../src/hooks/useQuery';
import { messageService } from '../../src/services';
import type { Conversation } from '../../src/types';

export default function MessagesPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: conversations,
    loading,
    refetch,
  } = useQuery(() => messageService.getConversations().then((res) => res.data));

  // 页面聚焦时刷新
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePressConversation = (item: Conversation) => {
    router.push({
      pathname: '/chat',
      params: {
        userId: item.otherUser.id,
        userName: item.otherUser.nickname || '用户',
        userAvatar: item.otherUser.avatar || '',
        productId: item.product?.id,
        productTitle: item.product?.title,
        productImage: item.product?.image,
        productPrice: item.product?.price,
      },
    });
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[date.getDay()];
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity style={styles.item} onPress={() => handlePressConversation(item)}>
      <View style={styles.avatarWrap}>
        {item.otherUser.avatar ? (
          <Image source={{ uri: item.otherUser.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <AntDesign name='user' size={20} color={theme.colors.text_gray} />
          </View>
        )}
        {item.unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.otherUser.nickname || '用户'}
          </Text>
          <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage || '暂无消息'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>消息</Text>
      </View>

      {loading && !conversations ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.selected} />
        </View>
      ) : (
        <FlatList
          data={conversations || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.selected]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暂无消息</Text>
              <Text style={styles.emptyHint}>去逛逛商品，和卖家聊聊吧</Text>
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
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  listContent: {
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.bg_gray,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#F5222D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  itemContent: {
    flex: 1,
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text_default,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: theme.colors.text_gray,
  },
  lastMessage: {
    fontSize: 13,
    color: theme.colors.text_secondary,
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F6F8',
    marginLeft: 76,
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
    paddingTop: 120,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text_default,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    color: theme.colors.text_gray,
  },
});
