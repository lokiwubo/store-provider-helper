import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  createLocalStorageContainer,
  StorageStore,
  StorageStoreSchema,
} from '@store-provider-helper/core';
import { AnyLike, createDeepReactiveProxy, shallow } from 'ts-utils-helper';
import { TypeOf } from 'zod';

type SelectorType = (value: AnyLike) => AnyLike;
/**
 * @description
 */
export const createLocalStorage = <TName extends string, TSchema extends StorageStoreSchema>(
  name: TName,
  schema: TSchema,
) => {
  type SchemaDataType = TypeOf<TSchema>;
  const container = createLocalStorageContainer(name, schema);
  const useLocalStorage = function <TSelector extends SelectorType>(selector?: TSelector) {
    const getSelectorData = useCallback(
      (data: SchemaDataType) => {
        return selector ? selector(data) : data;
      },
      [selector],
    );

    const store = useSyncExternalStore(
      (onStoreChange) => {
        return container.subscribe((curData, preData) => {
          // 应用的值变了，通知组件更新
          if (!shallow(getSelectorData(curData), getSelectorData(preData))) {
            onStoreChange();
          }
        });
      },
      container.getStoreData,
      container.getStoreData,
    );

    return useMemo(() => {
      const storeData = createDeepReactiveProxy(store, (_key, _value, metaData) => {
        container.setStoreData(metaData);
      }) as SchemaDataType;
      // 使用代理对象返回
      return getSelectorData(storeData);
    }, [getSelectorData, store]);
  };
  return Object.assign(useLocalStorage, {
    getItem: container.getItem,
    setItem: container.setItem,
  }) as unknown as {
    getItem: StorageStore<TSchema>['getItem'];
    setItem: StorageStore<TSchema>['setItem'];
    <TSelector extends SelectorType>(
      selector?: TSelector,
    ): TSelector extends undefined ? SchemaDataType : ReturnType<TSelector>;
  };
};
