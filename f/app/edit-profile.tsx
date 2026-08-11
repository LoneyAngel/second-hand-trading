import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { theme } from '../theme';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useAuth } from '../src/hooks/useAuth';

export default function EditProfilePage() {
  const { user, updateUser, isLoading } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('提示', '昵称不能为空');
      return;
    }

    setIsSaving(true);
    try {
      await updateUser({ nickname: nickname.trim(), avatar: avatar || undefined });
      Alert.alert('提示', '保存成功', [{ text: '确定', onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = () => {
    Alert.alert('提示', '上传头像功能开发中');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.back()}
        >
          <AntDesign name='arrow-left' size={24} color='#000' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>编辑资料</Text>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size='small' color='#00a1d6' />
          ) : (
            <Text style={styles.saveButton}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 头像区域 */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatar ? (
              <Image style={styles.avatar} source={{ uri: avatar }} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <AntDesign name='user' size={48} color={theme.colors.text_secondary} />
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.changeAvatarButton} onPress={handlePickImage}>
            <Text style={styles.changeAvatarText}>更换头像</Text>
          </TouchableOpacity>
        </View>

        {/* 昵称 */}
        <View style={styles.fieldSection}>
          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>昵称</Text>
            <TextInput
              style={styles.fieldInput}
              value={nickname}
              onChangeText={setNickname}
              placeholder='请输入昵称'
              placeholderTextColor='#999'
              maxLength={20}
            />
            <AntDesign name='right' size={16} color='#999' />
          </View>

          <View style={styles.divider} />

          {/* 手机号（只读） */}
          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>手机号</Text>
            <Text style={styles.fieldValue}>{user?.phone || ''}</Text>
            <AntDesign name='right' size={16} color='transparent' />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f2f3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e7e7',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    fontSize: 16,
    color: '#00a1d6',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f1f2f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeAvatarButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f1f2f3',
    borderRadius: 4,
  },
  changeAvatarText: {
    fontSize: 13,
    color: '#666',
  },
  fieldSection: {
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fieldLabel: {
    fontSize: 15,
    color: '#000',
    width: 64,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    textAlign: 'right',
  },
  fieldValue: {
    flex: 1,
    fontSize: 15,
    color: '#999',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#e7e7e7',
    marginLeft: 16,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#999',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingLabel: {
    fontSize: 15,
    color: '#000',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingText: {
    fontSize: 15,
    color: '#999',
  },
});
