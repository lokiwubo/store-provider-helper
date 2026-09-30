import { DRAFT_STATE } from './constant';
import { StoreContainer } from './core';
import type { BindStoreContext, GetContainer, StoreConfig, StoreContainerOptions } from './types';
import type {
  AnyLike,
  RecordKeyLike,
  RecordLike,
  StorePrimaryKeyLike,
  StoreRecordFunctionsLike,
} from './types/shared';
export type { BindStoreContext, GetContainer, StoreConfig, StoreContainerOptions };

// 约束 actions 必须是「函数字典」，不满足时在传入处直接报错

export const DEFAULT_PRIMATE_KEY = 'default';
const weakStoreMap = new WeakMap<StoreConfig, RecordLike>();

const cacheStoreSet = new Set<{
  store: StoreContainer;
  updateTime: number;
  config: StoreConfig<AnyLike>;
}>();
/**
 * @description 获取或者注册容器
 * @param storeConfig
 * @param primaryKey
 * @returns
 */
export const getAndRegistryContainer = <
  TConfig extends StoreConfig<AnyLike, StoreRecordFunctionsLike, StoreRecordFunctionsLike, boolean>,
>(
  storeConfig: TConfig,
  primaryKey: StorePrimaryKeyLike = DEFAULT_PRIMATE_KEY,
  option: StoreContainerOptions<ReturnType<TConfig['state']>> = {}
): StoreContainer<TConfig> => {
  const mergeOption = { ...storeConfig.option, ...option } as StoreContainerOptions<
    ReturnType<TConfig['state']>
  >;
  const { type } = mergeOption;
  const weakStore = weakStoreMap.get(storeConfig);
  const maxCacheSize = 50;
  /**
   * @description 创建新store
   */
  const createStoreValue = () => {
    /**
     * @description 写入监听器
     */
    const outValue = {
      store: new StoreContainer(storeConfig, primaryKey),
      updateTime: Date.now(),
      config: storeConfig,
    };
    // 可被清理的store 当数量超过 maxCacheSize 则清理长时间未被使用的store 按store 更新时间排序
    if (type === 'temp') {
      cacheStoreSet.add(outValue);
      if (cacheStoreSet.size >= maxCacheSize) {
        const sortTime = Array.from(cacheStoreSet).sort((a, b) => a.updateTime - b.updateTime);
        sortTime.slice(0, sortTime.length - maxCacheSize).forEach((item) => {
          cacheStoreSet.delete(item);
          item.store.uninstall();
          const storeRecord = weakStoreMap.get(item.config);
          if (storeRecord && storeRecord[primaryKey]) {
            Reflect.deleteProperty(storeRecord, primaryKey);
            weakStoreMap.set(item.config, storeRecord);
          }
        });
      }
    }
    outValue.store.subscribeStateChange({
      onChange: () => {
        outValue.updateTime = Date.now();
      },
    });
    if (type === 'localStorage') {
      const { storage } = mergeOption;
      const { getStoreKey, partialize } = storage;
      const storeKey = getStoreKey(outValue.store);
      const state = JSON.parse(localStorage.getItem(storeKey) as string) ?? {};
      outValue.store.setState((storeState) => ({
        ...storeState,
        ...state,
      }));
      outValue.store.subscribeStateChange({
        onChange: (state) => {
          localStorage.setItem(storeKey, JSON.stringify(partialize(state)));
        },
      });
    }
    if (type === 'sessionStorage') {
      const { storage } = mergeOption;
      const { getStoreKey, partialize } = storage;
      const storeKey = getStoreKey(outValue.store);
      const state = JSON.parse(sessionStorage.getItem(storeKey) as string) ?? {};
      outValue.store.setState((storeState) => ({
        ...storeState,
        ...state,
      }));
      outValue.store.subscribeStateChange({
        onChange: (state) => {
          sessionStorage.setItem(storeKey, JSON.stringify(partialize(state)));
        },
      });
    }
    return outValue.store;
  };
  if (weakStore) {
    const storeRecord = weakStore[primaryKey];
    if (!storeRecord) {
      const storeContainer = createStoreValue();
      weakStoreMap.set(storeConfig, {
        ...weakStore,
        [primaryKey]: storeContainer,
      });
      return storeContainer;
    } else {
      return storeRecord as AnyLike;
    }
  } else {
    const storeContainer = createStoreValue();
    weakStoreMap.set(storeConfig, { [primaryKey]: storeContainer });
    return storeContainer;
  }
};

type IsRegistryContainerFn = {
  <
    TModel extends StoreConfig<
      AnyLike,
      Record<RecordKeyLike, AnyLike>,
      Record<RecordKeyLike, AnyLike>,
      false
    >,
  >(
    model: TModel
  ): boolean;
  /**
   * @description 动态容器
   */
  <
    TModel extends StoreConfig<
      AnyLike,
      Record<RecordKeyLike, AnyLike>,
      Record<RecordKeyLike, AnyLike>,
      true
    >,
  >(
    model: TModel,
    containerKey: StorePrimaryKeyLike
  ): boolean;
};

export const isRegistryContainer: IsRegistryContainerFn = (
  storeConfig: StoreConfig<
    AnyLike,
    Record<RecordKeyLike, AnyLike>,
    Record<RecordKeyLike, AnyLike>,
    AnyLike
  >,
  primaryKey = DEFAULT_PRIMATE_KEY as StorePrimaryKeyLike
): boolean => {
  const weakStore = weakStoreMap.get(storeConfig);
  if (weakStore) {
    return weakStore[primaryKey as StorePrimaryKeyLike] !== undefined;
  }
  return false;
};

export const getContainer: GetContainer = (model, containerKey, options) => {
  /**
   * @description containerKey 使用顺序
   * 1. 传入参数
   * 2. options.getPrimaryKey
   * 3. 默认值 DEFAULT_PRIMATE_KEY
   */
  return getAndRegistryContainer(
    model,
    containerKey ?? options?.getPrimaryKey?.() ?? DEFAULT_PRIMATE_KEY,
    options
  );
};
/**
 * @description 卸载容器
 * @param model
 * @param containerKey
 */
export const destroyContainer = (model: StoreConfig, containerKey?: StorePrimaryKeyLike) => {
  const weakStore = weakStoreMap.get(model);
  if (weakStore) {
    const storeValue = weakStore[containerKey ?? DEFAULT_PRIMATE_KEY];
    if (storeValue) {
      model.onDestroy?.bind(storeValue)();
      Reflect.deleteProperty(weakStore, containerKey ?? DEFAULT_PRIMATE_KEY);
      weakStoreMap.set(model, weakStore);
    }
  }
};

export const isPlainObject = (obj: AnyLike): obj is RecordLike => {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
};

// 简化的 isDraftable 核心逻辑
export function isDraftable(value: AnyLike) {
  if (!value || typeof value !== 'object') return false;
  // 1. 排除已经被代理的对象（防止无限递归或重复代理）
  if (value[DRAFT_STATE]) return false;
  // 2. 排除特殊对象（如 Date, RegExp, Promise, 各种 DOM 节点等）
  // Immer 内部有一个特殊类型的黑名单，这里用 isPlainObject 等逻辑兜底
  const proto = Object.getPrototypeOf(value);
  if (
    proto !== null &&
    proto !== Object.prototype &&
    !Array.isArray(value) &&
    !(value instanceof Map) &&
    !(value instanceof Set)
  ) {
    return false;
  }
  // 3. 排除被 Object.freeze 冻结的对象（冻结对象不可写，代理修改会报错）
  if (Object.isFrozen(value)) return false;
  return true;
}

export function getDraftableRawValue<T>(value: T): T {
  if (value && typeof value === 'object' && (value as AnyLike)[DRAFT_STATE]) {
    return (value as AnyLike)[DRAFT_STATE] as T;
  }
  return value;
}
