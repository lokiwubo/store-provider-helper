import { useMemo, useSyncExternalStore } from "react";
import {
  createLocalStorageContainer,
  StorageStore,
  StorageStoreSchema,
} from "@store-provider-helper/core";
import {
  createDeepReactiveProxy,
  FunctionLike,
  RecordLike,
  shallow,
} from "ts-utils-helper";
import { TypeOf } from "zod";

/**
 * @description
 */
export const createLocalStorage = <
  TName extends string,
  TSchema extends StorageStoreSchema,
>(
  name: TName,
  schema: TSchema
) => {
  const container = createLocalStorageContainer(name, schema);
  const useLocalStorage = function <TSelector extends FunctionLike>(
    selector: TSelector
  ) {
    useSyncExternalStore((onStoreChange) => {
      const subscribe = container.subscribe((curData, preData) => {
        // 应用的值变了，通知组件更新
        if (!shallow(selector(curData), selector(preData))) {
          onStoreChange();
        }
      });
      return subscribe;
    }, container.getStoreData);

    return useMemo(() => {
      const storeData = createDeepReactiveProxy(
        container.getStoreData() as RecordLike,
        (_key, _value, metaData) => {
          container.setStoreData(metaData);
        }
      ) as TypeOf<TSchema>;
      // 使用代理对象返回
      return selector(storeData);
    }, []);
  };
  return Object.assign(
    {
      getItem: container.getItem,
      setItem: container.setItem,
    },
    useLocalStorage
  ) as unknown as {
    getItem: StorageStore<TSchema>["getItem"];
    setItem: StorageStore<TSchema>["setItem"];
  };
};
