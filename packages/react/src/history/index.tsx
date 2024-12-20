import { createHash, createHistoryHelper } from '@store-provider-helper/core';
import { useCallback, useId, useMemo, useSyncExternalStore } from 'react';

// type HistoryOptions = {
//   /**过期事件 */
//   expire?: number; //  number(ms)
// };
/**
 * @description 提供把数据存储在history中的能力
 */
export const createHistory = () => {
  const historyHelper = createHistoryHelper();
  const useHistoryState = function <TState>(InitState: TState) {
    const id = useId();
    const key = useMemo(() => {
      return `${createHash(InitState)}/${id}`;
    }, [InitState, id]);

    const historyItem = historyHelper.getItem<TState>(key);

    const changeValue = useCallback(
      (curData: TState) => {
        historyHelper.setValue(key, curData);
      },
      [key],
    );

    useSyncExternalStore(
      (onStoreChange) => {
        return historyHelper.subscribe(key, onStoreChange);
      },
      () => historyHelper.getValue(key),
    );

    return useMemo(() => {
      const value = historyItem?.data || InitState;
      return [value, changeValue] as [TState, (state: TState) => void];
    }, [historyItem, InitState, changeValue]);
  };
  // TODO 后续可以新增一些方法
  return Object.assign(useHistoryState, {});
};
