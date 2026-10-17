import { act, renderHook, waitFor } from "@testing-library/react-native";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";

describe("usePullToRefresh", () => {
  it("sets refreshing while the callback runs", async () => {
    let resolveRefresh: (() => void) | undefined;
    const refresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const { result } = renderHook(() => usePullToRefresh(refresh));

    act(() => {
      result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);

    act(() => {
      resolveRefresh?.();
    });

    await waitFor(() => {
      expect(result.current.refreshing).toBe(false);
    });
  });

  it("clears refreshing when the callback throws", async () => {
    const refresh = jest.fn(async () => {
      throw new Error("network");
    });

    const { result } = renderHook(() => usePullToRefresh(refresh));

    act(() => {
      result.current.onRefresh();
    });

    await waitFor(() => {
      expect(result.current.refreshing).toBe(false);
    });
  });
});
