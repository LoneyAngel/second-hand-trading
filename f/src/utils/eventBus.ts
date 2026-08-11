/**
 * 轻量级 Event Emitter
 * 用于跨模块通信，例如：axios 拦截器通知 useAuth 执行登出
 */
type EventCallback = (...args: any[]) => void;

class EventBus {
  private listeners: Record<string, EventCallback[]> = {};

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // 返回取消订阅的函数，方便 useEffect cleanup
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`[EventBus] Error in listener for event "${event}":`, error);
      }
    });
  }

  clear(event?: string): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

export const eventBus = new EventBus();

// 预定义事件名，避免魔法字符串
export const AuthEvents = {
  LOGOUT: 'auth:logout',
  TOKEN_REFRESHED: 'auth:tokenRefreshed',
} as const;
