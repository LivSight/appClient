import { useCallback, useState } from "react";

/**
 * Standard pull-to-refresh state for ScreenLayout.
 * Keeps the refresh spinner separate from initial full-screen loading.
 */
export function usePullToRefresh(refresh: () => void | Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.resolve(refresh())
      .catch(() => undefined)
      .finally(() => {
        setRefreshing(false);
      });
  }, [refresh]);

  return { refreshing, onRefresh };
}
