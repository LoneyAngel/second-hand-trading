import { TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '../../theme';

export default function LoveButton({
  like,
  handleFunction,
}: {
  like: boolean;
  handleFunction: any;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={handleFunction}
      // 🚀 灵魂属性：收藏图标一般较小（24px），必须扩大点击热区！
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      style={styles.button}
    >
      {like ? (
        // 🥰 已收藏状态：实心红心
        <FontAwesome name='heart' size={24} color='#FF2442' /> // 小红书同款红
      ) : (
        // 🤍 未收藏状态：空心灰色心
        <FontAwesome name='heart-o' size={24} color={theme.colors.text_default} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20, // 💡 40/2 完美正圆
  },
});
