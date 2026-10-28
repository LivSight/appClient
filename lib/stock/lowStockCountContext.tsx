import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchLowStockProductCount } from "@/lib/stock/lowStockCount";
import { useAuth } from "@/lib/auth/AuthProvider";

type LowStockCountContextValue = {
  lowStockCount: number;
  refreshLowStockCount: () => Promise<void>;
};

const defaultValue: LowStockCountContextValue = {
  lowStockCount: 0,
  refreshLowStockCount: async () => {},
};

const LowStockCountContext = createContext<LowStockCountContextValue>(defaultValue);

/** Must be nested inside AuthProvider. */
export function LowStockCountProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [lowStockCount, setLowStockCount] = useState(0);

  const refreshLowStockCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLowStockCount(await fetchLowStockProductCount());
    } catch {
      // keep last known badge on transient errors
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    // Defer so setState is not synchronous inside the effect body.
    queueMicrotask(() => {
      void (async () => {
        try {
          const count = await fetchLowStockProductCount();
          if (!cancelled) setLowStockCount(count);
        } catch {
          // keep last known badge on transient errors
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const value = useMemo<LowStockCountContextValue>(
    () => ({
      lowStockCount: isAuthenticated ? lowStockCount : 0,
      refreshLowStockCount,
    }),
    [isAuthenticated, lowStockCount, refreshLowStockCount],
  );

  return <LowStockCountContext.Provider value={value}>{children}</LowStockCountContext.Provider>;
}

export function useLowStockCount(): LowStockCountContextValue {
  return useContext(LowStockCountContext);
}
