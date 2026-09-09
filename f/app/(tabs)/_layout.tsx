import { Tabs } from 'expo-router';
import { theme } from '~/../theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Feather from '@expo/vector-icons/Feather';
import { Pressable } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.selected,
        tabBarInactiveTintColor: 'black',
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#EEEEEE',
          height: 60,
        },
        // 屏蔽点击水波纹与透明度
        tabBarButton: (props) => (
          <Pressable
            {...props}
            android_ripple={null}
            style={({ pressed }) => [
              props.style,
              { opacity: 1 }, // 始终保持 100% 不透明度
            ]}
          />
        ),
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          tabBarIcon: ({ color, size }) => <Feather name='home' size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name='shop'
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name='shopping-search-outline' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='messages'
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name='chat-outline' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='mine'
        options={{
          tabBarIcon: ({ color, size }) => <Feather name='user' size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
