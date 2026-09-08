import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useState } from 'react';
import { useAuth } from '../src/hooks/useAuth';
import { theme } from 'theme';

export default function SettingsPage() {
  const { logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  const handleLogout = async () => {
    Alert.alert('提示', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: logout,
      },
    ]);
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
        <Text style={styles.headerTitle}>设置</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 账号设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>账号设置</Text>

          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>账号安全</Text>
            </View>
            <View style={styles.settingRight}>
              <AntDesign name='right' size={16} color={theme.colors.text_gray} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>隐私设置</Text>
            </View>
            <View style={styles.settingRight}>
              <AntDesign name='right' size={16} color={theme.colors.text_gray} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 通用设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通用设置</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>深色模式</Text>
            </View>
            <View style={styles.settingRight}>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#ddd', true: '#00a1d6' }}
                thumbColor='#fff'
              />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>字体大小</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>标准</Text>
              <AntDesign name='right' size={16} color={theme.colors.text_gray} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>自动播放</Text>
            </View>
            <View style={styles.settingRight}>
              <Switch
                value={autoPlay}
                onValueChange={setAutoPlay}
                trackColor={{ false: '#ddd', true: '#00a1d6' }}
                thumbColor='#fff'
              />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>语言设置</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>简体中文</Text>
              <AntDesign name='right' size={16} color={theme.colors.text_gray} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 播放设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>播放设置</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>默认清晰度</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>720P</Text>
              <AntDesign name='right' size={16} color={theme.colors.text_gray} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>流量提醒</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>开启</Text>
              <AntDesign name='right' size={16} color={theme.colors.text_gray} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 其他 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>其他</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>关于我们</Text>
            </View>
            <View style={styles.settingRight}>
              <AntDesign name='right' size={16} color={theme.colors.text_gray} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>帮助与反馈</Text>
            </View>
            <View style={styles.settingRight}>
              <AntDesign name='right' size={16} color={theme.colors.text_gray} />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>检查更新</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>已是最新版本</Text>
              <AntDesign name='right' size={16} color={theme.colors.text_gray} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 退出登录 */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>退出登录</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
  content: {
    flex: 1,
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
    paddingVertical: 14,
  },
  settingLeft: {
    alignItems: 'center',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingLabel: {
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 14,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e076',
    marginLeft: 16,
    width: '90%',
  },
  logoutSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  logoutButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 15,
    color: '#ff6b6b',
    fontWeight: '500',
  },
});
