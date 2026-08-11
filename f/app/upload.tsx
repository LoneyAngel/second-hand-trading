import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { productService, categoryService } from '../src/services';
import { useAuth } from '../src/hooks/useAuth';
import PublishButton from '~/components/GreenButton';
import * as ImagePicker from 'expo-image-picker';
import type { PriceUnit } from '../src/types';
import CModal from '~/components/Modal';

const THEME_CYAN = '#0D9488';

// 过滤金额输入：只允许数字和一个小数点，最多 2 位小数，去除前导零，保证 > 0
const formatAmountInput = (value: string): string => {
  if (!value) return '';
  // 只保留数字和小数点
  let cleaned = value.replace(/[^\d.]/g, '');
  // 只保留第一个小数点
  const firstDotIndex = cleaned.indexOf('.');
  if (firstDotIndex !== -1) {
    cleaned =
      cleaned.slice(0, firstDotIndex + 1) +
      cleaned.slice(firstDotIndex + 1).replace(/\./g, '');
  }
  // 去除前导零（但保留 0.xx 形式，以及输入过程中的单个 0）
  if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
    cleaned = cleaned.replace(/^0+/, '') || '0';
  }
  // 最多 2 位小数
  if (firstDotIndex !== -1) {
    const parts = cleaned.split('.');
    if (parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    }
  }
  return cleaned;
};

const PRICE_UNITS: { value: PriceUnit; label: string }[] = [
  { value: 'day', label: '/天' },
  { value: 'hour', label: '/时' },
  { value: 'once', label: '/次' },
];

export default function UploadPage() {
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const isEdit = mode === 'edit';

  const { isAuthenticated } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  // 本地选中的图片 uri（新增时使用，发布时才上传到 OSS）
  const [localImages, setLocalImages] = useState<string[]>([]);
  // 已上传到 OSS 的图片 url（编辑模式加载已有图片时使用）
  const [ossImages, setOssImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('day');
  const [showPriceUnitModal, setShowPriceUnitModal] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);

  useEffect(() => {
    loadCategories();
    if (isEdit && id) {
      loadProduct(id);
    }
  }, [id, isEdit]);

  const loadCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadProduct = async (productId: string) => {
    try {
      const product = await productService.getProduct(productId);
      setTitle(product.title);
      setDescription(product.description || '');
      setPrice(String(product.price));
      setDeposit(String(product.deposit));
      setSelectedCategory(product.categoryId);
      setOssImages(product.images || []);
      setPriceUnit(product.priceUnit || 'day');
    } catch (error) {
      console.error('Failed to load product:', error);
      Alert.alert('错误', '加载商品信息失败');
    } finally {
      setLoadingProduct(false);
    }
  };

  const showPriceUnitOptions = () => setShowPriceUnitModal(true);
  const selectPriceUnit = (unit: PriceUnit) => {
    setPriceUnit(unit);
    setShowPriceUnitModal(false);
  };

  const showImagePickerOptions = () => setShowImagePickerModal(true);
  const handleImagePickerSelect = (type: 'camera' | 'library') => {
    setShowImagePickerModal(false);
    pickImage(type);
  };

  const pickImage = async (type: 'camera' | 'library') => {
    try {
      const permissionResult =
        type === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('提示', '需要您的授权才能访问相机或相册');
        return;
      }

      const result =
        type === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

      if (!result.canceled && result.assets[0]) {
        const totalCount = localImages.length + ossImages.length;
        if (totalCount >= 6) {
          Alert.alert('提示', '最多上传 6 张图片');
          return;
        }
        setLocalImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('错误', '选择图片失败');
    }
  };

  // 上传单张本地图片到 OSS
  const uploadSingleImage = async (uri: string): Promise<string> => {
    const formData = new FormData();
    const file = {
      uri,
      name: `image_${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any;
    formData.append('image', file);
    const response = await productService.uploadImage(formData);
    return response.url;
  };

  // 批量上传本地图片到 OSS
  const uploadLocalImages = async (): Promise<string[]> => {
    if (localImages.length === 0) return [];
    setUploadingImage(true);
    try {
      const urls = [];
      // 串行上传，避免并发问题
      for (const uri of localImages) {
        const url = await uploadSingleImage(uri);
        urls.push(url);
      }
      return urls;
    } finally {
      setUploadingImage(false);
    }
  };

  // 删除本地图片
  const removeLocalImage = (index: number) => {
    Alert.alert('确认删除', '确定要删除这张图片吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          setLocalImages((prev) => prev.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  // 删除已上传的 OSS 图片
  const removeOssImage = (index: number) => {
    Alert.alert('确认删除', '确定要删除这张图片吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          setOssImages((prev) => prev.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    const totalImages = ossImages.length + localImages.length;
    if (!title || !price || !selectedCategory) {
      Alert.alert('提示', '请填写必要信息');
      return;
    }
    if (totalImages === 0) {
      Alert.alert('提示', '请至少上传一张商品图片');
      return;
    }
    if (!isAuthenticated) {
      Alert.alert('提示', '请先登录');
      return;
    }

    setLoading(true);
    try {
      // 先把本地选中的图片批量上传到 OSS
      const uploadedUrls = await uploadLocalImages();
      // 合并已有 OSS 图片和新上传的图片
      const allImages = [...ossImages, ...uploadedUrls];

      if (isEdit && id) {
        await productService.updateProduct(id, {
          title,
          description,
          price: parseFloat(price),
          deposit: parseFloat(deposit),
          images: allImages,
          categoryId: selectedCategory,
          priceUnit,
        });
        Alert.alert('成功', '商品更新成功！', [{ text: '确定', onPress: () => router.back() }]);
      } else {
        await productService.createProduct({
          title,
          description,
          price: parseFloat(price),
          deposit: parseFloat(deposit),
          images: allImages,
          categoryId: selectedCategory,
          priceUnit,
        });
        Alert.alert('成功', '商品发布成功！', [{ text: '确定', onPress: () => router.back() }]);
      }
    } catch (error) {
      Alert.alert('失败', isEdit ? '更新商品失败，请重试' : '发布商品失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 1. 优化骨架屏状态：黑边隔离与安全区域适配
  if (loadingProduct) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={() => router.back()}
              >
                <AntDesign name='arrow-left' size={22} color='#1B2559' />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>编辑商品</Text>
            </View>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={THEME_CYAN} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    // 🚀 2. 根容器使用普通 View，全屏铺满背景色，拒绝黑边
    <View style={styles.container}>
      {/* 🚀 3. 将顶部状态栏安全区只应用在 Header 容器的外壳上 */}
      <SafeAreaView edges={['top']} style={styles.safeHeader}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={() => router.back()}
            >
              <AntDesign name='arrow-left' size={22} color='#1B2559' />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEdit ? '编辑商品' : '发布商品'}</Text>
          </View>
          <View style={styles.headerRight}>
            <PublishButton onPress={handleSubmit} disabled={loading} />
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View style={{ gap: 14, paddingVertical: 12 }}>
          {/* 1. 图片上传区域 */}
          <View style={styles.bgContainer}>
            <Text style={styles.sectionTitle}>商品图片</Text>
            <View style={styles.imageGrid}>
              {/* 已上传的 OSS 图片 */}
              {ossImages.map((uri, index) => (
                <View key={`oss-${index}`} style={styles.imageItem}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeOssImage(index)}
                  >
                    <AntDesign name='close' size={14} color='#fff' />
                  </TouchableOpacity>
                </View>
              ))}
              {/* 本地选中的图片 */}
              {localImages.map((uri, index) => (
                <View key={`local-${index}`} style={styles.imageItem}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeLocalImage(index)}
                  >
                    <AntDesign name='close' size={14} color='#fff' />
                  </TouchableOpacity>
                </View>
              ))}
              {ossImages.length + localImages.length < 6 && (
                <TouchableOpacity
                  style={styles.imageUploadButton}
                  onPress={showImagePickerOptions}
                >
                  <AntDesign name='plus' size={24} color={THEME_CYAN} />
                  {ossImages.length + localImages.length === 0 && (
                    <Text style={styles.imageUploadText}>优质图片更吸引人~</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 2. 基础文本信息区域 */}
          <View style={styles.bgContainer}>
            <View>
              <Text style={styles.sectionTitle}>商品标题</Text>
              <TextInput
                style={styles.input}
                placeholder='写个吸引人的标题吧...'
                placeholderTextColor='#A3AED0'
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>商品描述</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder='描述一下商品的成色、租用须知...'
                placeholderTextColor='#A3AED0'
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical='top'
              />
            </View>
          </View>

          {/* 3. 金额输入区域 */}
          <View style={styles.bgContainer}>
            <View>
              <Text style={styles.sectionTitle}>租金</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.currencySymbol}>¥</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder='0.00'
                  placeholderTextColor='#A3AED0'
                  value={price}
                  onChangeText={(v) => setPrice(formatAmountInput(v))}
                  keyboardType='decimal-pad'
                />
                <TouchableOpacity style={styles.priceUnitButton} onPress={showPriceUnitOptions}>
                  <Text style={styles.priceUnitText}>
                    {PRICE_UNITS.find((u) => u.value === priceUnit)?.label}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text style={styles.sectionTitle}>押金</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.currencySymbol}>¥</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder='建议为日租金的 2-3 倍'
                  placeholderTextColor='#A3AED0'
                  value={deposit}
                  onChangeText={(v) => setDeposit(formatAmountInput(v))}
                  keyboardType='decimal-pad'
                />
              </View>
            </View>
          </View>

          {/* 4. 分类选择区域 */}
          <View style={styles.bgContainer}>
            <Text style={styles.sectionTitle}>商品分类</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => {
                const isSelected = selectedCategory === category.id;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
                    onPress={() => setSelectedCategory(category.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ height: 30 }} />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* 价格单位选择弹窗 */}
      <CModal
        visible={showPriceUnitModal}
        onPress={() => {
          setShowPriceUnitModal(false);
        }}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>选择计费方式</Text>
            <TouchableOpacity onPress={() => setShowPriceUnitModal(false)}>
              <AntDesign name='close' size={20} color='#8F9BBA' />
            </TouchableOpacity>
          </View>
          <View style={styles.modalOptions}>
            {PRICE_UNITS.map((unit) => (
              <TouchableOpacity
                key={unit.value}
                style={[styles.modalOption, priceUnit === unit.value && styles.modalOptionSelected]}
                onPress={() => {
                  selectPriceUnit(unit.value);
                  setShowPriceUnitModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    priceUnit === unit.value && styles.modalOptionTextSelected,
                  ]}
                >
                  {unit.label}
                </Text>
                {priceUnit === unit.value && (
                  <AntDesign name='check' size={18} color={THEME_CYAN} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </CModal>

      {/* 图片选择弹窗 */}
      <CModal visible={showImagePickerModal} onPress={() => setShowImagePickerModal(false)}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>选择图片</Text>
            <TouchableOpacity onPress={() => setShowImagePickerModal(false)}>
              <AntDesign name='close' size={20} color='#8F9BBA' />
            </TouchableOpacity>
          </View>
          <View style={styles.modalOptions}>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleImagePickerSelect('camera')}
            >
              <AntDesign name='camera' size={20} color={THEME_CYAN} style={{ marginRight: 12 }} />
              <Text style={styles.modalOptionText}>拍照</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleImagePickerSelect('library')}
            >
              <AntDesign name='picture' size={20} color={THEME_CYAN} style={{ marginRight: 12 }} />
              <Text style={styles.modalOptionText}>从相册选择</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FE',
    // 🚀 5. 移除原有的硬编码 paddingTop: 35，完全托付给 safeHeader 掌控，防止多余间隙出现
  },
  safeHeader: {
    backgroundColor: '#fff', // 🚀 6. 确保状态栏底色为纯白，与 Header 融为一体
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDF7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#fff',
    // 🚀 7. 移除原有的 border 属性，上移至 safeHeader 防止分割线穿透刘海屏
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bgContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
    color: '#1B2559',
  },
  headerRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    color: '#1B2559',
    marginBottom: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  imageItem: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E5F2',
    borderStyle: 'dashed',
    backgroundColor: '#FAFCFF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imageUploadText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: '#8F9BBA',
    textAlign: 'center',
  },
  input: {
    height: 48,
    backgroundColor: '#F4F7FE',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1B2559',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F4F7FE',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    color: '#1B2559',
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1B2559',
    padding: 0,
  },
  priceUnitButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    borderRadius: 8,
    marginLeft: 6,
  },
  priceUnitText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    color: THEME_CYAN,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F4F7FE',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryItemSelected: {
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderColor: THEME_CYAN,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    color: '#A3AED0',
  },
  categoryTextSelected: {
    color: THEME_CYAN,
    fontWeight: '600',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
    color: '#8F9BBA',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // 🚀 8. 确保底部有全面屏手势条安全空隙
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDF7',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    color: '#1B2559',
  },
  modalOptions: {
    paddingTop: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(13, 148, 136, 0.05)',
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 19,
    color: '#1B2559',
  },
  modalOptionTextSelected: {
    color: THEME_CYAN,
    fontWeight: '600',
    lineHeight: 19,
  },
});
