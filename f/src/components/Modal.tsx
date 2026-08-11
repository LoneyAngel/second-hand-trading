import { Portal } from '@gorhom/portal';
import { StyleSheet, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import { theme } from 'theme';

interface ModalProps {
  visible: boolean; // 🚀 补丁 1：由外部状态控制是否显示
  onPress: () => void; // 🚀 补丁 2：点击遮罩层时的关闭回调
  h?: number | string; // 自定义高度（支持数字如300、字符串如'50%'、'auto'）
  children: React.ReactNode; // 规范化 children 类型
}

export default function Modal({ visible, onPress, h = 'auto', children }: ModalProps) {
  if (!visible) return null;

  // 根据h参数类型生成合适的height样式
  const getHeightStyle = (): ViewStyle => {
    if (typeof h === 'number') {
      return { height: h };
    }
    if (typeof h === 'string' && h !== 'auto') {
      // 支持百分比、具体单位等
      return { height: h as any };
    }
    // 'auto' 或其他情况，不设置固定高度
    return {};
  };

  return (
    <Portal>
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onPress}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={[styles.content, getHeightStyle()]}>{children}</View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  // 全屏容器
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    // 🚀 电商感圆角优化：因为贴在底部，所以只需要左上、右上设置大圆角
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: theme.spacing.sm,

    // 🚀 核心适配：这里需要留出手机底部横条的安全距离，防止内容被横条挡住
    paddingBottom: 34,
  },
});
