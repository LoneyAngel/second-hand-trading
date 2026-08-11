import { Text, StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';

interface PublishButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  text?: string;
}

export default function GreenButton({
  onPress,
  disabled = false,
  text = '申请',
}: PublishButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabledButton]}
      onPress={onPress}
      activeOpacity={0.8} // 🚀 极关键：触碰时温和地变淡，提供顶级长相的点击反馈
      disabled={disabled}
    >
      <Text style={styles.buttonText}>申请</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#10B981', // 🎨 精选：现代化高级极客绿（Emerald 500），比纯绿更有质感
    paddingVertical: 10, // 上下内边距，确保按钮足够饱满
    paddingHorizontal: 20, // 左右内边距
    borderRadius: 40, // 🧠 大圆角设计，符合现代 iOS/Android 扁平化美学
    alignItems: 'center', // 文字水平居中
    justifyContent: 'center', // 文字垂直居中
    width: '100%', // 默认撑满父容器宽度

    // 🌟 移动端微阴影（iOS）
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,

    // 🌟 移动端微阴影（Android）
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF', // 纯白文字
    fontSize: 16, // 标准大按钮字号
    fontWeight: '600', // 半粗体，比 bold 更优雅
    letterSpacing: 4, // 🚀 细节控：中文字符之间空出 4px 呼吸感，瞬间提升高级感
  },
  // 💡 禁用状态的兜底样式（比如未填写完表单时按钮变灰）
  disabledButton: {
    backgroundColor: '#A7F3D0', // 变淡的绿色
    elevation: 0,
    shadowOpacity: 0,
  },
});
