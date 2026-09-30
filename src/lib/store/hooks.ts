import { throttle } from 'lodash-es';
import { useMemo, useRef, useSyncExternalStore } from 'react';
import { DEFAULT_PRIMATE_KEY, getContainer } from './helpers';
import type { StoreConfig, StoreContainerOptions } from './types';
import type { UseGetContainer } from './types/hooks';
import type { StorePrimaryKeyLike } from './types/shared';

export const useContainer: UseGetContainer = (
  model: StoreConfig,
  primaryKey?: StorePrimaryKeyLike,
  options?: StoreContainerOptions<StoreConfig['state']>
) => {
  const primaryKeyRef = useRef(
    primaryKey ?? model.option?.getPrimaryKey?.() ?? DEFAULT_PRIMATE_KEY
  );
  const storeRef = useRef(getContainer(model, primaryKeyRef.current, options));
  storeRef.current = getContainer(model, primaryKeyRef.current, options);
  const stateKeysRef = useRef(new Set<string>());
  const gettersKeysRef = useRef(new Set<string>());

  const subscribeFn = useMemo(() => {
    return (onStoreChange: () => void) => {
      const throttledFn = throttle(() => {
        onStoreChange();
      }, 60);

      // TODO 需要更具依赖的值是否有变化
      return storeRef.current.subscribeStateChange({
        onChange: throttledFn,
      });
    };
  }, []);

  const state = useSyncExternalStore(subscribeFn, storeRef.current.getState);

  useEffect(() => {
    // TODO
  }, []);

  return useMemo(
    () => ({
      get state() {
        return new Proxy(state, {
          get: (target, propName) => {
            keysRef.current.add(propName as string);
            return target[propName];
          },
        });
      },
      setState: storeRef.current.setState,
      actions: storeRef.current.actions,
      getters: storeRef.current.getters,
      container: storeRef.current,
      subscribeState: storeRef.current.subscribeStateChange,
      subscribeActions: storeRef.current.subscribeActionRun,
      subscribeGetters: storeRef.current.subscribeGetterChange,
    }),
    [state]
  );
};
