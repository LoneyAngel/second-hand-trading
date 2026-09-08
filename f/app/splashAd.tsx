import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { theme } from 'theme';

export default function SplashAd({ onFinish }) {
  const [time_tmp, setTime_Tmp] = useState<Number>(5);
  let timer = null;
  useEffect(() => {
    if (time_tmp) {
      timer = setTimeout(() => {
        setTime_Tmp((prev) => prev - 1);
      }, 1000);
    } else {
      onFinish();
      return;
    }
    return () => clearTimeout(timer);
  }, [time_tmp]);
  return (
    <View
      style={{
        display: 'flex',
        position: 'relative',
        justifyContent: 'center',
        alignContent: 'center',
      }}
    >
      <Pressable style={{ position: 'absolute', top: 8, right: 8 }}>
        <Text style={{ fontSize: theme.fontSizes.sm }}>关闭</Text>
      </Pressable>
      <Text>广告招商中...</Text>
    </View>
  );
}
