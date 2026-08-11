import { useState, useEffect, useCallback, useRef, DependencyList } from 'react';

interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useQuery<T>(
  queryFn: () => Promise<T>,
  options?: { enabled?: boolean; onSuccess?: (data: T) => void; onError?: (error: Error) => void },
  deps: DependencyList = [], // 👈 【核心核心】新增接收外部依赖项，默认为空数组
): UseQueryResult<T> {
  const { enabled = true, onSuccess, onError } = options || {};

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 使用 useRef 存储最新的回调函数，避免依赖变化
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const queryFnRef = useRef(queryFn);

  // 更新 ref
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    queryFnRef.current = queryFn;
  }, [onSuccess, onError, queryFn]);

  const fetchData = useCallback(async () => {
    // console.log('useQuery fetchData called with enabled:', enabled);
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await queryFnRef.current();
      // console.log('useQuery fetchData result:', result);
      setData(result);
      onSuccessRef.current?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onErrorRef.current?.(error);
    } finally {
      setLoading(false);
    }
  }, [enabled]); // 只依赖 enabled

  useEffect(() => {
    fetchData();
  }, [fetchData, enabled, ...deps]); // 依赖 fetchData 和外部传入的 deps

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
