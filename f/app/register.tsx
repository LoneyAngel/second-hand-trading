/*
 * 注册页面 - 仿照登录页面风格
 */
import { router } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useAuth } from '~/hooks/useAuth';

// 🚀 定义全局大厂高级青
const THEME_CYAN = '#0D9488';

export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const handleRegister = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('提示', '请输入手机号和密码');
      return;
    }
    if (phone.length !== 11) {
      Alert.alert('提示', '请输入正确的 11 位手机号');
      return;
    }
    if (password.length < 6) {
      Alert.alert('提示', '密码至少需要 6 位');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('提示', '两次输入的密码不一致');
      return;
    }

    try {
      await register({
        phone,
        password,
        nickname: nickname.trim() || undefined,
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '注册失败，请检查网络';
      Alert.alert('注册失败', errorMsg);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* 🚀 Header 部分 - 与登录页保持一致 */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logo}>🔄</Text>
            </View>
            <Text style={styles.title}>创建账号</Text>
            <Text style={styles.subtitle}>加入校园二手交易平台</Text>
          </View>

          {/* 🚀 表单部分 */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder='请输入昵称（可选）'
              placeholderTextColor='#A3AED0'
              value={nickname}
              onChangeText={setNickname}
            />
            <TextInput
              style={styles.input}
              placeholder='请输入 11 位手机号'
              placeholderTextColor='#A3AED0'
              keyboardType='phone-pad'
              maxLength={11}
              value={phone}
              onChangeText={setPhone}
            />

            <TextInput
              style={styles.input}
              placeholder='请输入密码（至少6位）'
              placeholderTextColor='#A3AED0'
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TextInput
              style={styles.input}
              placeholder='请确认密码'
              placeholderTextColor='#A3AED0'
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {/* 🚀 注册按钮 */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color='#fff' />
              ) : (
                <Text style={styles.buttonText}>注 册</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 底部跳转 - 去登录 */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.replace('/login')} activeOpacity={0.6}>
              <Text style={styles.footerText}>已有账号？去登录</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 36,
    lineHeight: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
    color: '#1B2559',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    color: '#8F9BBA',
  },
  form: {
    width: '100%',
    gap: 16,
  },
  input: {
    height: 54,
    backgroundColor: '#F3F7FE',
    borderRadius: 14,
    paddingHorizontal: 20,
    fontSize: 15,
    color: '#1B2559',
  },
  button: {
    height: 54,
    backgroundColor: THEME_CYAN,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: THEME_CYAN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#66B2AC',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    color: '#A3AED0',
    textDecorationLine: 'underline',
  },
});
