import { createHash, createHistoryHelper } from '@store-provider-helper/core';
import { useCallback, useId, useMemo, useSyncExternalStore } from 'react';
import { AnyLike } from 'ts-utils-helper';

// type HistoryOptions = {
//   /**过期事件 */
//   expire?: number; //  number(ms)
// };
/**
 * @description 提供把数据存储在history中的能力
 */

interface SetState<TData = AnyLike> {
  <T extends (data: TData) => TData>(updateFn: T): void;
  <T extends Partial<TData>>(data: T): void;
}

export const createHistory = () => {
  const historyHelper = createHistoryHelper();

  const useHistoryState = function <TState>(InitState: TState) {
    const id = useId();
    const key = useMemo(() => {
      return `${createHash(InitState)}/${id}`;
    }, [InitState, id]);

    const setValue = useCallback(
      (curData: Partial<TState> | ((data: TState) => TState)) => {
        if (typeof curData === 'function') {
          const updateData = curData(historyHelper.getValue(key));
          historyHelper.setValue(key, updateData);
        } else {
          historyHelper.setValue(key, curData);
        }
      },
      [key],
    );

    const state = useSyncExternalStore(
      (onStoreChange) => {
        return historyHelper.subscribe(key, onStoreChange);
      },
      () => historyHelper.getValue(key),
      () => historyHelper.getValue(key),
    );

    return useMemo(() => {
      const value = state || InitState;
      return [value, setValue] as [TState, SetState<TState>];
    }, [state, InitState, setValue]);
  };
  // TODO 后续可以新增一些方法
  return Object.assign(useHistoryState, {});
};
