import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../../src/components/HomeCard';
import SearchBar from '../../src/components/SearchBar';
import { theme } from '../../theme';
import Person from '@assets/icon/person.svg';
import { router } from 'expo-router';
import { useQuery } from '../../src/hooks/useQuery';
import { productService } from '../../src/services';
import type { AdviseProductGroup, Product, PriceUnit } from '../../src/types';
import Entypo from '@expo/vector-icons/Entypo';
import { useState } from 'react';

// 价格单位配置
const PRICE_UNITS: { value: PriceUnit; label: string }[] = [
  { value: 'day', label: '/天' },
  { value: 'hour', label: '/时' },
  { value: 'once', label: '/次' },
];

export default function Home_Page() {
  const [refreshing, setRefreshing] = useState(false);
  // 获取推荐数据
  const {
    data: groups,
    loading,
    error,
    refetch,
  } = useQuery(() => productService.getAdviseProducts());

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      refetch();
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 渲染商品项
  const renderProductItem = ({ item }: { item: Product }) => (
    <Card
      id={item.id}
      title={item.title}
      price={item.price}
      priceUnit={PRICE_UNITS.find((u) => u.value === item.priceUnit)?.label}
      productImage={item.images?.[0] ? { uri: item.images[0] } : undefined}
    />
  );

  // 渲染分组项（外层 FlatList 的 item）
  const renderGroupItem = ({ item }: { item: AdviseProductGroup }) => (
    <View style={styles.block}>
      <View style={styles.title_container}>
        <Text style={styles.title}>{item.name}</Text>
        <Entypo name='chevron-small-right' size={28} color={theme.colors.text_secondary} />
      </View>
      <FlatList
        data={item.products}
        keyExtractor={(product) => product.id}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        renderItem={renderProductItem}
      />
    </View>
  );

  // 渲染头部（上传引导和推荐区块）
  const renderListHeader = () => (
    <>
      {/* 上传商品引导 */}
      <TouchableOpacity
        style={styles.uploadGuide}
        onPress={() => {
          router.push('/upload');
        }}
      >
        <View style={styles.uploadIconContainer}>
          <Person height={32} width={32} fill={theme.colors.text_default} />
        </View>
        <View style={styles.uploadTextContainer}>
          <Text style={styles.uploadTitle}>发布你的闲置商品</Text>
          <Text style={styles.uploadSubtitle}>让闲置物品焕发新价值</Text>
        </View>
        <Entypo name='chevron-small-right' size={24} color={theme.colors.text_secondary} />
      </TouchableOpacity>
    </>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ zIndex: 100 }} edges={['top']}>
          <View style={styles.top_bar}>
            <SearchBar />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.text_default} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ zIndex: 100 }} edges={['top']}>
          <View style={styles.top_bar}>
            <SearchBar />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ zIndex: 100, backgroundColor: 'white' }} edges={['top']}>
        <View style={styles.top_bar}>
          <SearchBar />
        </View>
      </SafeAreaView>

      {/* 外层 FlatList：按分类分组 */}
      <FlatList
        data={groups}
        keyExtractor={(group) => group.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderListHeader}
        renderItem={renderGroupItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing} // 绑定状态
            onRefresh={onRefresh} // 绑定下拉触发的事件
            colors={[theme.colors.selected]} // Android 小圈圈的颜色（支持传入多个交替变色）
            tintColor={theme.colors.selected} // iOS 小圈圈的颜色
            title={'加载中...'} // iOS 特有的下拉提示文字
            titleColor={'#999999'}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无推荐商品</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg_gray,
  },
  content: {
    paddingTop: 20,
    gap: 25,
    paddingBottom: 80,
    paddingHorizontal: theme.spacing.sm,
  },
  top_bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,

    gap: 10,
  },
  block: {
    gap: 10,
  },
  title: {
    color: theme.colors.text_default,
    fontSize: theme.fontSizes.xxl,
    fontWeight: '600',
    lineHeight: theme.fontSizes.xxl + 4,
  },
  title_container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  uploadGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  uploadIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.button_bg_default,
    borderRadius: theme.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadTitle: {
    color: theme.colors.text_default,
    fontSize: theme.fontSizes.lg,
    fontWeight: '600',
    lineHeight: theme.fontSizes.lg + 4,
    marginBottom: 2,
  },
  uploadSubtitle: {
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.sm,
    fontWeight: '400',
    lineHeight: theme.fontSizes.sm + 4,
  },
  horizontalList: {
    flexDirection: 'row',
    gap: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.text_secondary,
    fontSize: theme.fontSizes.lg,
    fontWeight: '400',
    lineHeight: theme.fontSizes.lg + 4,
  },
});
