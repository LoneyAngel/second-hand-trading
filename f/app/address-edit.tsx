import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import ExpoGaodeMap, { searchPOI, searchNearby } from 'expo-gaode-map';
import type { POI, Coordinates } from 'expo-gaode-map';
import { theme } from '../theme';
import { addressService } from '../src/services';
import type { CreateAddressData } from '../src/types';

export default function AddressEditPage() {
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;

  const [formData, setFormData] = useState<CreateAddressData>({
    consignee: '',
    mobile: '',
    detailAddress: '',
  });
  const [region, setRegion] = useState('请选择省/市/区');
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 搜索相关
  const [searchMode, setSearchMode] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<POI[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // 加载周边 POI
  const loadNearbyPOIs = useCallback(async () => {
    setSearchLoading(true);
    setLocationError(null);
    try {
      // 请求定位权限
      const permission = await ExpoGaodeMap.requestLocationPermission();
      if (!permission?.granted) {
        setLocationError('未获取定位权限，无法显示附近地址');
        setSearchLoading(false);
        return;
      }

      // 获取当前位置
      const loc = await ExpoGaodeMap.getCurrentLocation();
      if (!loc || !('latitude' in loc)) {
        setLocationError('获取位置失败，请手动搜索');
        setSearchLoading(false);
        return;
      }

      setCurrentLocation(loc as Coordinates);

      // 搜索周边 POI（不指定关键词，搜周边全部地标）
      const result = await searchNearby({
        keyword: '',
        center: loc as Coordinates,
        radius: 1000,
        pageSize: 20,
      });
      setSearchResults(result.pois || []);
      setIsNearbyMode(true);
    } catch (err) {
      console.error('加载周边地址失败:', err);
      setLocationError('获取周边地址失败，请手动搜索');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // 关键词搜索
  const handleSearchChange = useCallback((text: string) => {
    setSearchKeyword(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    // 清空关键词时回到周边列表
    if (!text.trim()) {
      if (currentLocation) {
        setIsNearbyMode(true);
        loadNearbyPOIs();
      } else {
        setSearchResults([]);
      }
      return;
    }

    // 防抖关键词搜索
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      setIsNearbyMode(false);
      try {
        const result = await searchPOI({
          keyword: text,
          pageSize: 20,
          pageNum: 1,
          // 如果有定位结果，按距离排序
          ...(currentLocation && {
            center: currentLocation,
            sortByDistance: true,
          }),
        });
        setSearchResults(result.pois || []);
      } catch (err) {
        console.error('搜索失败:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [currentLocation, loadNearbyPOIs]);

  // 进入搜索模式
  const enterSearchMode = () => {
    setSearchMode(true);
    setSearchKeyword('');
    setSearchResults([]);
    setLocationError(null);
    loadNearbyPOIs();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // 退出搜索模式
  const exitSearchMode = () => {
    Keyboard.dismiss();
    setSearchMode(false);
    setSearchKeyword('');
    setSearchResults([]);
    setIsNearbyMode(false);
    setLocationError(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
  };

  // 选中搜索结果
  const handleSelectPOI = (poi: POI) => {
    // 组装地区信息
    let regionText = '';
    if (poi.adName && poi.cityName) {
      regionText = `${poi.cityName} ${poi.adName}`;
    } else if (poi.cityName) {
      regionText = poi.cityName;
    } else if (poi.adName) {
      regionText = poi.adName;
    }
    if (regionText) {
      setRegion(regionText);
    }
    // 详细地址：POI 名称 + 地址（去掉重复前缀）
    const detail = poi.name && poi.address && poi.address !== poi.name
      ? `${poi.name} ${poi.address}`
      : poi.name || poi.address || '';
    setFormData((prev) => ({ ...prev, detailAddress: detail }));
    exitSearchMode();
  };

  const validateForm = (): boolean => {
    if (!formData.consignee.trim()) {
      Alert.alert('提示', '请输入收货人姓名');
      return false;
    }
    if (!formData.mobile.trim()) {
      Alert.alert('提示', '请输入手机号');
      return false;
    }
    if (!/^1\d{10}$/.test(formData.mobile)) {
      Alert.alert('提示', '请输入正确的 11 位手机号');
      return false;
    }
    if (region === '请选择省/市/区') {
      Alert.alert('提示', '请选择所在地区');
      return false;
    }
    if (!formData.detailAddress.trim()) {
      Alert.alert('提示', '请输入详细地址');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const fullAddress = `${region} ${formData.detailAddress}`;
      const payload = {
        ...formData,
        detailAddress: fullAddress,
      };
      if (isEdit && params.id) {
        await addressService.updateAddress(params.id, payload);
      } else {
        await addressService.createAddress(payload);
      }
      Alert.alert('成功', isEdit ? '地址修改成功' : '地址添加成功', [
        { text: '确定', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.message || '保存失败，请稍后重试';
      Alert.alert('失败', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    formData.consignee.trim() &&
    formData.mobile.trim() &&
    region !== '请选择省/市/区' &&
    formData.detailAddress.trim();

  // 格式化距离
  const formatDistance = (meters?: number) => {
    if (!meters) return '';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const renderSearchItem = ({ item }: { item: POI }) => (
    <TouchableOpacity style={styles.searchItem} onPress={() => handleSelectPOI(item)}>
      <View style={styles.searchItemIcon}>
        <Feather name='map-pin' size={16} color={theme.colors.text_gray} />
      </View>
      <View style={styles.searchItemContent}>
        <Text style={styles.searchItemTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.searchItemAddress} numberOfLines={1}>
          {item.address || '暂无详细地址'}
          {item.distance ? ` · ${formatDistance(item.distance)}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        {searchMode ? (
          <>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={exitSearchMode}
            >
              <AntDesign name='arrow-left' size={22} color='#000' />
            </TouchableOpacity>
            <View style={styles.headerSearchInput}>
              <Feather name='search' size={14} color={theme.colors.text_gray} />
              <TextInput
                ref={inputRef}
                style={styles.headerSearchText}
                placeholder='搜索地址，更快填写'
                placeholderTextColor={theme.colors.text_gray}
                value={searchKeyword}
                onChangeText={handleSearchChange}
                returnKeyType='search'
                autoFocus
              />
              {searchKeyword ? (
                <TouchableOpacity onPress={() => {
                  setSearchKeyword('');
                  setSearchResults([]);
                  inputRef.current?.focus();
                }}>
                  <AntDesign name='close-circle' size={16} color={theme.colors.text_gray} />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={{ width: 22 }} />
          </>
        ) : (
          <>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => router.back()}
            >
              <AntDesign name='close' size={22} color='#000' />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEdit ? '编辑收货地址' : '添加收货地址'}</Text>
            <View style={{ width: 22 }} />
          </>
        )}
      </View>

      {searchMode ? (
        /* 搜索结果页 */
        <View style={styles.searchContainer}>
          {searchLoading && searchResults.length === 0 ? (
            <View style={styles.searchState}>
              <ActivityIndicator size='small' color={theme.colors.selected} />
              <Text style={styles.searchStateText}>
                {isNearbyMode || !searchKeyword ? '正在获取附近地址...' : '搜索中...'}
              </Text>
            </View>
          ) : locationError && searchResults.length === 0 ? (
            <View style={styles.searchState}>
              <Feather name='map-pin' size={32} color={theme.colors.text_gray} />
              <Text style={styles.searchEmptyText}>{locationError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadNearbyPOIs}>
                <Text style={styles.retryText}>重新定位</Text>
              </TouchableOpacity>
            </View>
          ) : searchResults.length > 0 ? (
            <View>
              {isNearbyMode && (
                <View style={styles.searchSectionHeader}>
                  <Feather name='navigation' size={14} color={theme.colors.selected} />
                  <Text style={styles.searchSectionTitle}>附近地址</Text>
                </View>
              )}
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => item.id || String(index)}
                renderItem={renderSearchItem}
                keyboardShouldPersistTaps='handled'
                showsVerticalScrollIndicator={false}
              />
            </View>
          ) : searchKeyword ? (
            <View style={styles.searchState}>
              <Text style={styles.searchEmptyText}>未找到相关地址</Text>
            </View>
          ) : null}
        </View>
      ) : (
        /* 表单页 */
        <>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 搜索栏（点击进入搜索模式） */}
            <TouchableOpacity style={styles.searchBar} onPress={enterSearchMode} activeOpacity={0.7}>
              <Feather name='search' size={16} color={theme.colors.text_gray} />
              <Text style={styles.searchPlaceholder}>搜索地址，更快填写</Text>
            </TouchableOpacity>

            {/* 地区选择 */}
            <TouchableOpacity style={styles.formRow} onPress={enterSearchMode}>
              <View style={styles.rowLeft}>
                <Text style={styles.required}>*</Text>
                <Text style={[styles.rowText, region === '请选择省/市/区' && styles.rowTextPlaceholder]}>
                  {region}
                </Text>
              </View>
              <AntDesign name='down' size={14} color={theme.colors.text_gray} />
            </TouchableOpacity>

            {/* 详细地址 */}
            <View style={styles.formRowCol}>
              <Text style={styles.rowLabel}>
                <Text style={styles.required}>*</Text>详细地址与门牌号
              </Text>
              <TextInput
                style={styles.detailInput}
                placeholder='请输入详细地址（楼栋、门牌号等）'
                placeholderTextColor={theme.colors.text_gray}
                value={formData.detailAddress}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, detailAddress: text }))}
                multiline
                maxLength={200}
              />
            </View>

            {/* 姓名 */}
            <View style={styles.formRow}>
              <Text style={styles.rowLabel}>
                <Text style={styles.required}>*</Text>名字
              </Text>
              <TextInput
                style={styles.rowInput}
                placeholder='请输入收货人姓名'
                placeholderTextColor={theme.colors.text_gray}
                value={formData.consignee}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, consignee: text }))}
                maxLength={20}
              />
            </View>

            {/* 手机号 */}
            <View style={styles.formRow}>
              <View style={styles.prefixRow}>
                <Text style={styles.prefixText}>+86</Text>
                <AntDesign name='down' size={12} color={theme.colors.text_default} />
              </View>
              <Text style={styles.rowLabel}>
                <Text style={styles.required}>*</Text>手机号
              </Text>
              <TextInput
                style={styles.rowInput}
                placeholder='请输入手机号'
                placeholderTextColor={theme.colors.text_gray}
                value={formData.mobile}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, mobile: text }))}
                keyboardType='phone-pad'
                maxLength={11}
              />
            </View>

            {/* 默认地址开关 */}
            <View style={styles.defaultRow}>
              <Text style={styles.defaultLabel}>默认地址</Text>
              <TouchableOpacity
                style={[styles.radioOuter, isDefault && styles.radioOuterActive]}
                onPress={() => setIsDefault((prev) => !prev)}
              >
                {isDefault && <View style={styles.radioInner} />}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* 底部保存按钮 */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.saveButton, !canSubmit && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size='small' color='#fff' />
              ) : (
                <Text style={styles.saveButtonText}>保存地址</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  headerSearchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 12,
    backgroundColor: '#F5F6F8',
    borderRadius: 18,
    gap: 8,
  },
  headerSearchText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text_default,
    padding: 0,
  },
  content: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 40,
    backgroundColor: '#F5F6F8',
    borderRadius: 20,
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: theme.colors.text_gray,
  },
  // 搜索结果页
  searchContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchState: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
  },
  searchStateText: {
    fontSize: 13,
    color: theme.colors.text_gray,
  },
  searchEmptyText: {
    fontSize: 14,
    color: theme.colors.text_gray,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.selected + '20',
  },
  retryText: {
    fontSize: 13,
    color: theme.colors.selected,
    fontWeight: '500',
  },
  searchSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFBFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
  },
  searchSectionTitle: {
    fontSize: 13,
    color: theme.colors.text_secondary,
    fontWeight: '500',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
    gap: 12,
  },
  searchItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F6F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchItemContent: {
    flex: 1,
    gap: 4,
  },
  searchItemTitle: {
    fontSize: 15,
    color: theme.colors.text_default,
    fontWeight: '500',
  },
  searchItemAddress: {
    fontSize: 13,
    color: theme.colors.text_secondary,
  },
  // 表单
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
  },
  formRowCol: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowLabel: {
    fontSize: 15,
    color: theme.colors.text_secondary,
    fontWeight: '500',
  },
  rowText: {
    fontSize: 15,
    color: theme.colors.text_default,
    fontWeight: '500',
  },
  rowTextPlaceholder: {
    color: theme.colors.text_gray,
    fontWeight: '400',
  },
  rowInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text_default,
    textAlign: 'right',
    padding: 0,
  },
  required: {
    color: '#F5222D',
    marginRight: 2,
  },
  detailInput: {
    marginTop: 8,
    fontSize: 17,
    color: '#111',
    fontWeight: '500',
    minHeight: 50,
    textAlignVertical: 'top',
    padding: 0,
  },
  prefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 12,
  },
  prefixText: {
    fontSize: 16,
    color: theme.colors.text_default,
    fontWeight: '500',
  },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginTop: 12,
  },
  defaultLabel: {
    fontSize: 15,
    color: theme.colors.text_default,
    fontWeight: '500',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: theme.colors.selected,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.selected,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F1F3',
  },
  saveButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE58F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#FFF4D6',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
