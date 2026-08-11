import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Modal from '~/components/Modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import { theme } from '../theme';
import { useQuery } from '../src/hooks/useQuery';
import { addressService } from '../src/services';
import type { Address, CreateAddressData, UpdateAddressData } from '../src/types';

type EditorMode = 'add' | 'edit';

export default function AddressesPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('add');
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<CreateAddressData>({
    consignee: '',
    mobile: '',
    detailAddress: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: addressList,
    loading,
    refetch,
  } = useQuery(() => addressService.getAddresses().then((res) => res.data), { enabled: true });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const openAddEditor = () => {
    setEditorMode('add');
    setEditingAddress(null);
    setFormData({ consignee: '', mobile: '', detailAddress: '' });
    setShowEditor(true);
  };

  const openEditEditor = (addr: Address) => {
    setEditorMode('edit');
    setEditingAddress(addr);
    setFormData({
      consignee: addr.consignee,
      mobile: addr.mobile,
      detailAddress: addr.detailAddress,
    });
    setShowEditor(true);
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
      if (editorMode === 'add') {
        await addressService.createAddress(formData);
      } else if (editingAddress) {
        await addressService.updateAddress(editingAddress.id, formData as UpdateAddressData);
      }
      await refetch();
      setShowEditor(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || '保存失败，请稍后重试';
      Alert.alert('失败', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (addr: Address) => {
    if (addr.isDefault) return;
    try {
      await addressService.setDefaultAddress(addr.id);
      await refetch();
    } catch (error: any) {
      const msg = error.response?.data?.message || '设置失败';
      Alert.alert('失败', msg);
    }
  };

  const handleDelete = (addr: Address) => {
    Alert.alert('确认删除', '确定要删除这个地址吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await addressService.deleteAddress(addr.id);
            await refetch();
          } catch (error: any) {
            const msg = error.response?.data?.message || '删除失败';
            Alert.alert('失败', msg);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Address }) => (
    <View style={styles.addressCard}>
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.consignee}>{item.consignee}</Text>
          <Text style={styles.mobile}>{item.mobile}</Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>默认</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => openEditEditor(item)}
        >
          <Feather name='edit-2' size={18} color={theme.colors.text_secondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.detailAddress} numberOfLines={2}>
        {item.detailAddress}
      </Text>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.setDefaultBtn} onPress={() => handleSetDefault(item)}>
          <AntDesign
            name={item.isDefault ? 'checkcircle' : 'checkcircleo'}
            size={16}
            color={item.isDefault ? theme.colors.selected : theme.colors.text_secondary}
          />
          <Text style={[styles.setDefaultText, item.isDefault && { color: theme.colors.selected }]}>
            设为默认
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <AntDesign name='delete' size={16} color='#EF4444' />
          <Text style={styles.deleteText}>删除</Text>
        </TouchableOpacity>
      </View>
    </View>
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
        <Text style={styles.headerTitle}>地址管理</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.selected} />
        </View>
      ) : (
        <FlatList
          data={addressList || []}
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
              <Feather name='map-pin' size={48} color={theme.colors.text_secondary} />
              <Text style={styles.emptyText}>暂无收货地址</Text>
              <Text style={styles.emptyHint}>点击下方按钮添加第一个地址</Text>
            </View>
          }
        />
      )}

      {/* 底部添加按钮 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.addButton} onPress={openAddEditor}>
          <AntDesign name='plus' size={20} color='white' />
          <Text style={styles.addButtonText}>新增地址</Text>
        </TouchableOpacity>
      </View>

      {/* 编辑/新增弹窗 */}
      <Modal visible={showEditor} onPress={() => setShowEditor(false)}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditor(false)}>
              <AntDesign name='close' size={22} color={theme.colors.text_default} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editorMode === 'add' ? '新增地址' : '编辑地址'}</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size='small' color={theme.colors.selected} />
              ) : (
                <Text style={styles.saveText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps='handled'>
            <View style={styles.formGroup}>
              <Text style={styles.label}>收货人</Text>
              <TextInput
                style={styles.input}
                placeholder='请输入收货人姓名'
                value={formData.consignee}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, consignee: text }))}
                maxLength={20}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>手机号</Text>
              <TextInput
                style={styles.input}
                placeholder='请输入 11 位手机号'
                value={formData.mobile}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, mobile: text }))}
                keyboardType='phone-pad'
                maxLength={11}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>详细地址</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder='请输入详细地址（楼栋、门牌号等）'
                value={formData.detailAddress}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, detailAddress: text }))}
                multiline
                textAlignVertical='top'
                maxLength={200}
              />
            </View>
          </ScrollView>
        </View>
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  addressCard: {
    backgroundColor: 'white',
    borderRadius: theme.radii.md,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    flexWrap: 'wrap',
  },
  consignee: {
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text_default,
  },
  mobile: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_secondary,
  },
  defaultBadge: {
    backgroundColor: theme.colors.selected,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: theme.fontSizes.sm,
    color: 'white',
    fontWeight: '500',
  },
  detailAddress: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_secondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.bg_gray,
  },
  setDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setDefaultText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_secondary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: {
    fontSize: theme.fontSizes.sm,
    color: '#EF4444',
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
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text_default,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text_secondary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.bg_gray,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.selected,
    paddingVertical: 14,
    borderRadius: theme.radii.md,
  },
  addButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '600',
    color: theme.colors.text_default,
  },
  saveText: {
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
    color: theme.colors.selected,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: theme.fontSizes.md,
    fontWeight: '500',
    color: theme.colors.text_default,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: theme.radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text_default,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
