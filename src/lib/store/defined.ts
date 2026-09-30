import type { StoreContainer } from './core';
import { DEFAULT_PRIMATE_KEY, getContainer } from './helpers';
import type {
  BindStoreContext,
  DefinedConfigParamsType,
  GetContainer,
  StoreConfig,
  StoreContainerOptions,
} from './types';
import type {
  AnyLike,
  AsertActions,
  AsertGetters,
  AsertObject,
  AsertRecordFunctionsLike,
  RecordLike,
  StorePrimaryKeyLike,
} from './types/shared';
import { mergeOptionsToFunction } from './utils';
export type { BindStoreContext, GetContainer, StoreConfig, StoreContainerOptions };

const identityStore = <TConfig extends StoreConfig<AnyLike>>(
  config: TConfig
): StoreConfig<
  TConfig['state'],
  AsertRecordFunctionsLike<TConfig['actions']>,
  AsertRecordFunctionsLike<TConfig['getters']>,
  TConfig['isDynamic']
> => config as AnyLike;

const definedStore = <
  const TState,
  const TActions,
  const TGetters,
  const TOptions extends StoreContainerOptions<AsertObject<TState>>,
  TIsDynamic extends boolean = false,
>(
  config: DefinedConfigParamsType<TState, TActions, TGetters>,
  isDynamic: TIsDynamic,
  option?: TOptions
) => {
  const storeConfig = identityStore({
    ...config,
    isDynamic,
    actions: config.actions! ?? (() => ({}) as TActions),
    getters: config.getters! ?? (() => ({}) as TGetters),
    state: config.state ?? (() => ({}) as TState),
    option: option ?? {},
    merge: ((config: RecordLike, _isDynamic?: boolean, _option?: RecordLike) =>
      definedStore(
        config,
        _isDynamic ?? isDynamic,
        (_option ?? option) as AnyLike
      )) as StoreConfig<AnyLike>['merge'],
  }) as unknown as StoreConfig<TState, AsertActions<TActions>, AsertGetters<TGetters>, TIsDynamic>;
  const store = mergeOptionsToFunction(
    (
      _option:
        | StorePrimaryKeyLike
        | {
            // 使用 option里的动态key 作为 key 值
            primaryKey?: StorePrimaryKeyLike;
          } = DEFAULT_PRIMATE_KEY
    ) =>
      getContainer(store, typeof _option === 'object' ? _option.primaryKey : _option, {
        type: 'temp',
        ...option,
      } as AnyLike),
    storeConfig
  );

  return store;
};
/**
 * @description   定义动态存储
 */
export const definedDynamicStore = <TState, TActions, TGetters>(
  config: DefinedConfigParamsType<TState, TActions, TGetters>,
  option: StoreContainerOptions<AsertObject<TState>> = {}
) => definedStore(config, true, option);

/**
 * @description   定义静态存储
 */
export const definedStaticStore = <TState, TActions, TGetters>(
  config: DefinedConfigParamsType<TState, TActions, TGetters>,
  option: StoreContainerOptions<AsertObject<TState>> = {}
) => definedStore(config, false, option);

/**
 * @description 创建sessionStorage容器
 * @param {StoreContainer} container
 * @param {object} options
 * @param {Function} options.getStoreKey 获取存储key
 * @param {Function} options.partialize 部分存储
 * @returns {[StoreContainer, Function]} 返回容器和卸载函数
 */
export const definedSessionStorageContainer = <T extends StoreContainer>(
  container: T,
  options: {
    getStoreKey: () => string;
    partialize?: <TState = T['state']>(state: TState) => Partial<TState>;
  }
) => {
  const { getStoreKey, partialize = (state) => state } = options;
  const storeKey = getStoreKey();
  if (sessionStorage.getItem(storeKey)) {
    const state = JSON.parse(sessionStorage.getItem(storeKey) as string);
    container.setState(state);
  }
  const unsubscribe = container.subscribeStateChange({
    onChange: (state) => {
      sessionStorage.setItem(storeKey, JSON.stringify(partialize(state)));
    },
  });
  container.subscribeUninstall(() => {
    sessionStorage.removeItem(storeKey);
  });
  return [container, unsubscribe] as const;
};
