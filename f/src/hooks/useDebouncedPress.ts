import { useRef } from 'react';

// 全局共享锁：防止在不同列表项上快速点击触发多次跳转
let globalLocked = false;

export function useDebouncedPress(callback: () => void, delay = 800) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return () => {
    if (globalLocked) return;

    globalLocked = true;

    try {
      callbackRef.current();
    } finally {
      setTimeout(() => {
        globalLocked = false;
      }, delay);
    }
  };
}
