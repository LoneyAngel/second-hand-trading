import React, { useRef, useEffect } from 'react';
import { StyleSheet, Animated, Pressable, ViewStyle, StyleProp, Easing } from 'react-native';
import { theme } from 'theme';

interface AnimatedChipProps {
  children: React.ReactNode;
  onPress: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function CateButton({
  children,
  onPress,
  selected = false,
  style,
}: AnimatedChipProps) {
  // 🚀 核心控制：B站风格水波纹需要三个变量紧密配合
  const rippleScale = useRef(new Animated.Value(0)).current; // 水波纹的扩散比例
  const rippleOpacity = useRef(new Animated.Value(0)).current; // 水波纹的透明度
  const chipScale = useRef(new Animated.Value(selected ? 1.05 : 1)).current; // 整个 Chip 的呼吸感

  // 监听选中状态（保持原本的丝滑切换）
  useEffect(() => {
    Animated.spring(chipScale, {
      toValue: selected ? 1.05 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [selected]);

  // 🚀 手指按下：致敬 B站最核心的【温和扩散】
  const onPressIn = () => {
    // 重置水波纹状态（防止连续点击时状态错乱）
    rippleScale.setValue(0);
    rippleOpacity.setValue(0);

    Animated.parallel([
      // 1. 水波纹扩散：不能太急！
      Animated.timing(rippleScale, {
        toValue: 1, // 放大到 1（即填满 100% 模具）
        duration: 350, // 🚀 B站风格的关键：时间要足够长（350ms），让扩散过程温和、丝滑、不急促
        easing: Easing.out(Easing.quad), // 🚀 使用“减速”缓动函数，让水波纹越往外扩散越慢，富有物理美感
        useNativeDriver: true,
      }),
      // 2. 水波纹淡入：比扩散稍微快一点点闪现出来
      Animated.timing(rippleOpacity, {
        toValue: 1,
        duration: 150, // 快速淡入
        useNativeDriver: true,
      }),
      // 3. 整体 Chip 微微放大：提供跟手反馈
      Animated.spring(chipScale, {
        toValue: 1.06,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 🚀 手指抬起：水波纹优雅淡出
  const onPressOut = () => {
    Animated.parallel([
      // 1. 水波纹淡出：手指离开后，水波纹默默隐去
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 300, // 用 300ms 优雅淡出
        useNativeDriver: true,
      }),
      // 2. 整体 Chip 回弹
      Animated.spring(chipScale, {
        toValue: selected ? 1.05 : 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
      <Animated.View
        style={[
          styles.categoryChip, // 初始没有任何背景色
          style,
          {
            transform: [{ scale: chipScale }],
          },
        ]}
      >
        {/* 💡 B站风格核心：扩散的水波纹层 */}
        <Animated.View
          style={[
            styles.rippleBg,
            {
              opacity: rippleOpacity,
              // 🚀 核心技巧：通过 scale 缩放，配合父容器的 overflow: hidden，实现由中心向四周扩散圆环效果
              transform: [{ scale: rippleScale }],
            },
          ]}
        />
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // 🚀 极其重要：切掉圆柱形背景放大后超出 Chip 自身圆角的部分
    position: 'relative',
    backgroundColor: 'transparent', // 初始完全镂空
  },

  rippleBg: {
    position: 'absolute',
    // 🚀 B站风格秘籍：不要让它初始铺满！
    // 我们定义一个巨大的正方形模具（比如 200x200，保证肯定能覆盖住 Chip）
    width: 200,
    height: 200,
    borderRadius: 100, // 锁死成一个完美的圆点
    alignSelf: 'center', // 水平居中
    top: '50%', // 🚀 垂直也居中
    marginTop: -100, // 利用负边距将 200px 的圆点中心，完美对齐到父容器的 0,0 点

    backgroundColor: theme.colors.bg_gray,
  },
});
