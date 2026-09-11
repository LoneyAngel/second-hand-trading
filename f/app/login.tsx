/*
登录流程：获取并保存token和用户信息，监听到这个变化完成跳转
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
import { useAuth } from '~/hooks/useAuth'; // 🚀 引入认证 Hook
import { useDebouncedPress } from '../src/hooks/useDebouncedPress';

// 🚀 定义全局大厂高级青
const THEME_CYAN = '#0D9488';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const goToRegister = useDebouncedPress(() => {
    router.replace('/register');
  });

  const goToHome = useDebouncedPress(() => {
    router.replace('/(tabs)');
  });

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('提示', '请输入手机号和密码');
      return;
    }
    if (phone.length !== 11) {
      Alert.alert('提示', '请输入正确的 11 位手机号');
      return;
    }

    try {
      await login({ phone, password });
    } catch (error: any) {
      let errorMsg = error.response?.data?.message;
      if (!errorMsg && error.request) {
        errorMsg = `网络错误\n\nmessage: ${error.message || '(空)'}\ncode: ${error.code || '(无)'}\nURL: ${error.config?.baseURL || ''}${error.config?.url || ''}\nmethod: ${error.config?.method || ''}`;
      }
      if (!errorMsg) {
        errorMsg = error.message || JSON.stringify(error) || '登录失败';
      }
      Alert.alert('登录失败', errorMsg);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* 🚀 Header 部分：去掉了显眼的纯表情，改为更有质感的呼吸感排版 */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logo}>🔄</Text>
            </View>
            <Text style={styles.title}>校园二手交易平台</Text>
            <Text style={styles.subtitle}>欢迎回来，请登录您的账号</Text>
          </View>

          {/* 🚀 表单部分：去掉了表单外层的 label，界面瞬间干净 50% */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder='请输入 11 位手机号'
              placeholderTextColor='#A3AED0' // 🚀 高级莫兰迪灰占位符
              keyboardType='phone-pad'
              maxLength={11}
              value={phone}
              onChangeText={setPhone}
              autoComplete='tel'
              textContentType='telephoneNumber'
              importantForAutofill='yes'
            />

            <TextInput
              style={styles.input}
              placeholder='请输入密码'
              placeholderTextColor='#A3AED0'
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoComplete='password'
              textContentType='password'
              importantForAutofill='yes'
              passwordRules='required: upper; required: lower; required: digit; minlength: 6; maxlength: 20;'
            />

            {/* 🚀 登录按钮：圆角放大，换成高级青，去掉沉重的阴影，改用温和的呼吸阴影 */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color='#fff' />
              ) : (
                <Text style={styles.buttonText}>登 录</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 底部跳转 */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={goToRegister} activeOpacity={0.6}>
              <Text style={styles.footerText}>还没有账号？立即注册</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goToHome}
              activeOpacity={0.6}
              style={{ marginTop: 12 }}
            >
              <Text style={styles.skipText}>先去主页浏览</Text>
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
    backgroundColor: '#fff', // 🚀 纯白底色，保持干净
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32, // 🚀 略微收紧宽度，让表单在屏幕中央显得更精致
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  // 🚀 增加一个圆润的 Logo 背后淡青色衬底，高级感立现
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 40, // 完美正圆
    backgroundColor: 'rgba(13, 148, 136, 0.08)', // 淡青色光晕
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
    color: '#1B2559', // 🚀 换成大厂最爱的“深邃藏蓝”，代替死黑颜色，界面更高级
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    color: '#8F9BBA', // 降低副标题视觉权重
  },
  form: {
    width: '100%',
    gap: 16, // 🚀 核心：利用 gap 统一控制输入框与按钮的垂直间距，代码更干净
  },
  input: {
    height: 54, // 🚀 略微加高到 54，在手机端按起来更符合人体工学
    backgroundColor: '#F4F7FE', // 🚀 极干净的冷调淡灰浅蓝底色
    borderRadius: 14, // 🚀 放大圆角（14px），极度圆润、现代
    paddingHorizontal: 20,
    fontSize: 15,
    color: '#1B2559',
  },
  button: {
    height: 54,
    backgroundColor: THEME_CYAN, // 🚀 换成你的专属深青色！
    borderRadius: 27, // 🚀 终极圆润：高度的一半，直接切成极具胶囊感的“全圆角”！
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,

    // 🌟 换成更淡、不脏的同色系青色微阴影
    shadowColor: THEME_CYAN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#66B2AC', // 禁用时呈现莫兰迪淡青色
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 2, // “登 录” 两个字中间微微空开，很大气
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
  skipText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 17,
    color: '#A3AED0',
  },
});
