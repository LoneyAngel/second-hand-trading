import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  // 1. 当子组件发生错误，触发此生命周期，更新状态以渲染降级 UI
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // 2. 捕获错误日志，通常在这里将错误上报给你的 Express 后端或监控平台
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log('⚡ 触发 RN 错误边界:', error, errorInfo);
    // TODO: fetch('https://your-express-api/log', { method: 'POST', body: ... })
  }

  public render() {
    if (this.state.hasError) {
      // 🎨 降级渲染的用户界面
      return (
        <View style={styles.container}>
          <Text style={styles.title}>抱歉，当前页面产生了一点小故障</Text>
          <Text style={styles.sub}>{this.state.error?.message}</Text>
          <Button
            title='重试一下'
            onPress={() => this.setState({ hasError: false, error: null })}
          />
        </View>
      );
    }
    return this.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  sub: { fontSize: 14, color: '#999', marginBottom: 20, textAlign: 'center' },
});
