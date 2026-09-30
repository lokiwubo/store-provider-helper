import { isEqual } from 'lodash-es';
import { DRAFT_STATE } from './constant';
import { destroyContainer, getContainer, getRaw, isDraftable } from './helpers';
import type { BindStoreContext, GetContainer, StoreConfig, StoreContainerOptions } from './types';
import type {
  AnyLike,
  ContainerGetters,
  FunctionLike,
  GetValueByPath,
  KeyPath,
  PromiseFunctionLike,
  RecordLike,
  SelectorType,
  StorePrimaryKeyLike,
  StoreRecordFunctionsLike,
  StoreSetState,
  WriteListener,
} from './types/shared';
import {
  assertNoNullable,
  copyData,
  createSameScheduleTask,
  createScheduledTask,
  filterNonNullish,
  isAsyncFunction,
} from './utils';
export type { BindStoreContext, GetContainer, StoreConfig, StoreContainerOptions };

type SubscribeParams<T = AnyLike, V = T> = {
  onChange: (current: NoInfer<V>, prev: NoInfer<V>) => void;
  select?: (state: T) => V;
  equal?: (a: NoInfer<V>, b: NoInfer<V>) => boolean;
};

interface SubscribeChange<T extends RecordLike> {
  <K extends KeyPath<T>>(key: K, change: (value: GetValueByPath<T, K>) => void): void;
  <V>(param: SubscribeParams<T, V>): void;
}

const proxyContainerActions = <TActions extends StoreRecordFunctionsLike>(
  actions: TActions,
  container: StoreContainer,
  getActionSubscribeMap: () => Map<AnyLike, FunctionLike[]> //获取action的订阅者
) => {
  /** 缓存重构后的 actions  对原有函数进行了事件关联  */
  const actionMap = new Map();
  return new Proxy(actions, {
    get: (target, propName) => {
      const action = target[propName];
      if (typeof action === 'function') {
        const actionSubscribes = getActionSubscribeMap().get(propName);
        if (!actionMap.has(propName)) {
          if (isAsyncFunction(action)) {
            actionMap.set(propName, async (...args: AnyLike[]) => {
              const result = await Reflect.apply(target[propName]!, container, args);
              actionSubscribes?.forEach((fn) => fn(args, result));
              return result;
            });
          } else {
            actionMap.set(propName, (...args: AnyLike[]) => {
              const result = Reflect.apply(target[propName]!, container, args);
              actionSubscribes?.forEach((fn) => fn(args, result));
              return result;
            });
          }
        }
        return actionMap.get(propName);
      }
      return target[propName];
    },
  });
};

const proxyContainerGetters = <TGetters extends StoreRecordFunctionsLike>(
  getters: TGetters,
  container: StoreContainer,
  getReadListeners: () => Set<ReadListener<StoreContainer>>, //获取getter的订阅者
  getGettersChangeListeners: () => Set<WriteListener<ContainerGetters<TGetters>, AnyLike>>
) => {
  const getterMap = new Map<
    keyof TGetters,
    {
      unsubscribe: (() => void)[];
      result: AnyLike;
    }
  >();
  const scheduleTaskFn = createSameScheduleTask();
  const scheduleTask = (propName: string | symbol, track: FunctionLike) =>
    scheduleTaskFn(() => {
      const cacheData = getterMap.get(propName);
      cacheData?.unsubscribe.forEach((unsubscribe) => unsubscribe());
      const [unsubscribe, result] = track();
      if (!isEqual(result, cacheData?.result)) {
        const gettersListeners = getGettersChangeListeners();
        for (const listener of gettersListeners) {
          const { select, equal, onChange, prev } = listener;
          const current = select(result);
          if (equal(prev, current)) continue;
          onChange(current, prev);
          listener.prev = current;
        }
      }
      getterMap.set(propName, { unsubscribe, result });
    });

  return new Proxy(getters, {
    get: (target, propName) => {
      // const readListeners = getReadListeners();
      const listenerParam = {
        store: container,
        property: propName,
        value: null,
        state: null,
      };
      if (getterMap.has(propName)) {
        listenerParam.value = getterMap.get(propName)?.result;
        // readListeners.forEach((listener) => listener(listenerParam));
        return listenerParam.value;
      } else {
        const getter = target[propName];
        // 只处理函数
        if (typeof getter === 'function') {
          const track = () => {
            const [dependencies, result] = container.track(() => {
              return Reflect.apply(getter, container, []);
            });
            const unsubscribe = dependencies.map((dep) => {
              return dep.subscribeStateChange({
                onChange: () => scheduleTask(propName, track),
              });
            });
            return [unsubscribe, result]; // 需要进行依赖收集
          };

          const [unsubscribe, result] = track();
          listenerParam.value = result;
          getterMap.set(propName, { unsubscribe, result });
          // readListeners.forEach((listener) => listener(listenerParam));
          return listenerParam.value;
        }
        const result = getterMap.get(propName)?.result;
        listenerParam.value = result;
        // readListeners.forEach((listener) => listener(listenerParam));
        return listenerParam.value;
      }
    },
  });
};

/** 变化的数据结构 */
type DataStateType = {
  /**原始数据 */
  base: AnyLike;
  /**草稿数据 */
  copy: AnyLike;
  parent: DataStateType | null;
  paths: (string | number | symbol)[];
  draft: ProxyBaseDataType<AnyLike>;
  modified: boolean;
  context: ProxyScopeContext;
  /**撤销代理 */
  revoke: (() => void) | null;
  /**修改的keys */
  modifiedMap: Map<
    symbol | string | number,
    {
      rawValue: AnyLike;
      modifyValue: AnyLike;
      type: 'add' | 'delete' | 'update';
    }
  >; //
};

type ProxyBaseDataType<T> = {
  [DRAFT_STATE]: T;
} & T;

type ModifyStateType = {
  state: DataStateType;
  preValue: AnyLike;
  curValue: AnyLike;
  property: symbol | string;
};

type ProxyScopeContext = {
  container: StoreContainer;
  /**防止重复代理 */
  draftRecord: WeakMap<WeakKey, DataStateType>;
  /** 保存修改对象 保存为对象方便给覆盖 */
  peddingChangeMap: Map<string, ModifyStateType>; //
  /** 创建调度任务 */
  scheduleTask: () => void;
  /** 获取  */
  getReadListeners: () => Set<ReadListener<StoreContainer>>;
  getChangeListeners: () => Set<WriteListener<AnyLike, AnyLike>>;
  isEdit: boolean;
};

function createStateProxy<T extends RecordLike>(
  value: T,
  parentState: DataStateType,
  paths: (string | number | symbol)[],
  onChange: (key: string | number | symbol, value: AnyLike) => void
): DataStateType {
  const context = parentState.context; // 获取上下文
  const cacheState = context.draftRecord.get(value);
  if (cacheState) {
    return cacheState;
  }
  const state = {
    base: value, // 原始数据引用
    modified: false as boolean, // 是否被修改
    copy: null, // 浅copy数据
    parent: parentState,
    paths: paths,
    context: context,
    draft: null,
    revoke: null,
    modifiedMap: new Map(),
  } satisfies DataStateType as DataStateType;

  const triggerChange = (
    property: string | number | symbol,
    value: AnyLike,
    actionType: 'update' | 'add' | 'delete'
  ) => {
    // 在非编辑模式下不触发
    if (!context.isEdit) {
      return false;
    }
    // 如果值相同忽略
    if (state.copy[property] !== undefined && state.copy[property] === value) {
      return false;
    }
    const preValue = state.copy[property];
    const propertyStr = String(property);
    const nextPath = filterNonNullish([...paths, propertyStr]);
    state.modifiedMap.set(property, {
      rawValue: state.base[property],
      modifyValue: value,
      type: actionType,
    });
    onChange(propertyStr, value);
    context.scheduleTask();
    return true;
  };

  const { proxy, revoke } = Proxy.revocable(value, {
    get(target, property, receiver) {
      const baseValue = Reflect.get(state.base, property, receiver);
      // 获取原始值
      if (property === DRAFT_STATE) {
        return value;
      }
      if (!context.isEdit) {
        return baseValue;
      }
      if (!state.copy) {
        state.copy = copyData(value);
      }
      let output = Reflect.get(state.copy, property, receiver);
      const readListeners = state.context.getReadListeners();
      const nextPath = filterNonNullish([...state.paths, property]);
      if (isDraftable(output)) {
        output = createStateProxy(output, state, nextPath, () => {
          state.modified = true;
        });
        Reflect.set(state.copy, property, output);
      }

      // 需要特殊处理

      readListeners.forEach((listener) =>
        listener({
          store: context.container,
          state,
          property,
          value: output,
        })
      );
      return output;
    },
    set(_target, property, value) {
      const isNew = !Object.hasOwn(state.base, property);
      return triggerChange(property, value, isNew ? 'add' : 'update');
    },
    deleteProperty(target, property) {
      if (Object.hasOwn(state.base, property) || Object.hasOwn(state.copy, property)) {
        return triggerChange(property, null, 'delete');
      }
      return false;
    },
    getOwnPropertyDescriptor(target: T, property: string | symbol) {
      if (Object.hasOwn(state.copy, property)) {
        return Reflect.getOwnPropertyDescriptor(state.copy, property);
      } else if (Object.hasOwn(state.base, property)) {
        return Reflect.getOwnPropertyDescriptor(state.base, property);
      }
      return undefined;
    },
  });
  state.draft = proxy as ProxyBaseDataType<T>;
  state.revoke = () => {
    revoke();
  };
  context.draftRecord.set(value, state);
  return state;
}

const createScheduleTask = (context: ProxyScopeContext) => {
  return createScheduledTask(() => {
    if (context.peddingChangeMap.size > 0) {
      // 处理state变化
      context.peddingChangeMap.forEach((changeInfo) => {
        const { state } = changeInfo;
        state.modifiedMap.forEach((property) => {
          Reflect.set(state.base, property, state.copy[property]);
        });
      });
      context.peddingChangeMap = new Map();
      context.draftRecord = new WeakMap();
      const _writeStateSubscribs = context.getChangeListeners();
      // 粗颗粒度通知更新
      for (const listener of _writeStateSubscribs) {
        const { select, equal, onChange, prev } = listener;
        const current = select(context.container.state);
        if (equal(prev, current)) continue;
        onChange(current, prev);
        listener.prev = current;
      }
    }
  });
};

const bindProxyHostState = <TState extends RecordLike>(
  base: TState,
  container: StoreContainer,
  getReadListeners: () => Set<ReadListener<StoreContainer>>,
  getWriteListeners: () => Set<WriteListener<TState, AnyLike>>,
  getIsEdit: () => boolean
): TState => {
  const context = {
    container,
    peddingChangeMap: new Map<string, ModifyStateType>(),
    draftRecord: new WeakMap(),
    get isEdit() {
      return getIsEdit();
    },
    scheduleTask: null as unknown as ProxyScopeContext['scheduleTask'],
    getReadListeners: getReadListeners,
    getChangeListeners: getWriteListeners,
  } satisfies ProxyScopeContext as ProxyScopeContext;

  /**创建调取器 */
  const scheduleTask = createScheduleTask(context);
  context.scheduleTask = scheduleTask.run; // 创建调度任务

  const hostState = {
    base: null,
    modified: false,
    parent: null,
    copy: null,
    paths: [],
    context: context,
    draft: null as unknown as ProxyBaseDataType<TState>,
    revoke: null as unknown as () => void,
    modifiedMap: new Map(),
  } satisfies DataStateType as DataStateType;

  return createStateProxy(base, hostState, [], () => {
    hostState.modified = true;
  }).draft;
};

type ReadListener<TStore extends StoreContainer = StoreContainer> = (params: {
  store: TStore;
  value: AnyLike;
  state: DataStateType;
  property: symbol | string | number;
}) => void;

type UninstallListener<TStore extends StoreContainer = StoreContainer> = (store: TStore) => void;

export class StoreContainer<
  TConfig extends StoreConfig<
    AnyLike,
    StoreRecordFunctionsLike,
    StoreRecordFunctionsLike,
    boolean
  > = StoreConfig<AnyLike, {}, {}, boolean>,
  TState extends RecordLike = ReturnType<TConfig['state']>,
> {
  /** state变化 事件列表 */
  private static _stateReadListeners: Set<ReadListener<StoreContainer>> = new Set();
  private _stateChangeListeners: Set<WriteListener<TState, AnyLike>> = new Set();
  private _getterChangeListeners: Set<
    WriteListener<ContainerGetters<ReturnType<TConfig['getters']>>, AnyLike>
  > = new Set();
  private _uninstallListeners: Set<UninstallListener<StoreContainer>> = new Set();
  /** action 重构后的映射Record */
  private _actionChangeListenerMap = new Map<AnyLike, FunctionLike[]>();

  private _state?: TState;
  private _proxyMap: WeakMap<TState, AnyLike> = new WeakMap();
  private _actions?: ReturnType<TConfig['actions']>;
  private _getters?: ContainerGetters<ReturnType<TConfig['getters']>>;
  private _isEdit: boolean = false;
  private options: TConfig;
  public primaryKey: StorePrimaryKeyLike;
  public uuid: string;
  public getContainer: GetContainer;
  constructor(storeConfig: TConfig, primaryKey: StorePrimaryKeyLike) {
    this.options = storeConfig;
    this.getContainer = getContainer;
    this.primaryKey = primaryKey;
    this.uuid = `${Date.now()}${Math.random()}`;
    storeConfig.onInitialize?.bind(this)();
  }
  get state() {
    if (!this._state) {
      this._state = this.options.state(getContainer, this.primaryKey);
    }
    assertNoNullable(this._state);
    if (this._proxyMap.has(this._state)) {
      return this._proxyMap.get(this._state) as TState;
    }
    // 创建绑定
    this._proxyMap.set(
      this._state,
      bindProxyHostState(
        this._state,
        this,
        () => StoreContainer._stateReadListeners,
        () => this._stateChangeListeners,
        () => this._isEdit
      )
    );
    return this._proxyMap.get(this._state) as TState;
  }
  set state(newState: TState) {
    if (!isEqual(newState, getRaw(this.state))) this.setState(newState);
  }
  get actions() {
    if (!this._actions) {
      this._actions = proxyContainerActions(
        this.options.actions(this._state, this.getContainer, this.primaryKey) as ReturnType<
          TConfig['actions']
        >,
        this,
        () => this._actionChangeListenerMap
      ) as ReturnType<TConfig['actions']>;
    }
    return this._actions;
  }
  get getters() {
    if (!this._getters) {
      this._getters = proxyContainerGetters(
        this.options.getters(this._state, this.getContainer, this.primaryKey) as ReturnType<
          TConfig['getters']
        >,
        this,
        () => StoreContainer._stateReadListeners,
        () => this._getterChangeListeners
      ) as ContainerGetters<ReturnType<TConfig['getters']>>;
    }
    return this._getters;
  }
  getState: SelectorType<TState> = <V>(selector?: (data: TState) => V) =>
    selector?.(this.state) ?? this.state;
  setState: StoreSetState<TState> = (stateFn, forceUpdate?: boolean) => {
    try {
      const state = this.getState();
      this._isEdit = true;
      if (typeof stateFn === 'function') {
        stateFn(state);
      } else {
        if (forceUpdate) {
          this.state = stateFn as TState;
        } else {
          Object.assign(state, stateFn);
        }
      }
      return new Promise((resolove, reject) => {
        const UnSubscribe = this.subscribeStateChange({
          onChange: (current) => {
            resolove(current);
            UnSubscribe();
          },
        });
        setTimeout(() => {
          reject('state change failed');
          UnSubscribe();
        }, 10);
      });
    } finally {
      this._isEdit = true;
    }
  };

  // 只订阅了state 变化   还需支持  （key: string , (currentValue, preValue)=> void）
  subscribeStateChange = <V = TState>(options: {
    onChange: (current: NoInfer<V>, prev: NoInfer<V>) => void;
    select?: (state: TState) => V;
    equal?: (a: NoInfer<V>, b: NoInfer<V>) => boolean;
  }) => {
    const { onChange, select = (state) => state, equal = isEqual } = options;
    const listener = {
      onChange,
      select,
      equal,
      prev: select(Object.freeze(getRaw(this.state))),
    };
    this._stateChangeListeners.add(listener);
    return () => this._stateChangeListeners.delete(listener);
  };
  // 订阅getter 值变化    还需支持  （key: string , (currentValue, preValue)=> void）
  subscribeGetterChange: SubscribeChange<ContainerGetters<ReturnType<TConfig['getters']>>> = (
    ...args: AnyLike[]
  ) => {
    if (args.length === 1 && typeof args[0] === 'object') {
      const { onChange, select = (state) => state, equal = isEqual } = args[0] as SubscribeParams;
      const listener = {
        onChange,
        select,
        equal,
        prev: select(Object.freeze(getRaw(this.getters))),
      };
      this._getterChangeListeners.add(listener);
      return () => this._getterChangeListeners.delete(listener);
    } else if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'function') {
      //TODO
      return;
    }
    return () => void 0;
  };
  // 订阅State 读取
  private subscribeStateRead = (listener: ReadListener<this>) => {
    StoreContainer._stateReadListeners.add(listener as ReadListener);
    return () => StoreContainer._stateReadListeners.delete(listener as ReadListener);
  };

  /** 只订阅成功执行 */
  subscribeActionRun = <
    K extends keyof ReturnType<TConfig['actions']>,
    TAction = ReturnType<TConfig['actions']>[K],
  >(
    key: K,
    action: (
      payload: Parameters<ReturnType<TConfig['actions']>[K]>,
      outValue: TAction extends PromiseFunctionLike
        ? Awaited<ReturnType<TAction>>
        : TAction extends FunctionLike
          ? ReturnType<TAction>
          : null
    ) => void
  ) => {
    if (typeof action !== 'function') {
      throw new Error('action must be a function');
    }
    this._actionChangeListenerMap.set(key, [
      ...(this._actionChangeListenerMap.get(key) || []),
      action,
    ]);
    return () => {
      this._actionChangeListenerMap.set(
        key,
        (this._actionChangeListenerMap.get(key) || []).filter((fn) => fn !== action)
      );
    };
  };
  /**
   * @description 收集依赖 或者effect
   */
  track = <T>(scope: () => T) => {
    const deps = new Set<StoreContainer>();
    const unsubscribe = this.subscribeStateRead((dep) => deps.add(dep.store));
    const result = scope();
    unsubscribe();
    return [filterNonNullish([...deps]), result] as const;
  };
  subscribeUninstall = (listener: UninstallListener<this>): void => {
    this._uninstallListeners.add(listener as UninstallListener);
    return void 0;
  };
  uninstall = () => {
    this._uninstallListeners.forEach((listener) => listener(this));
    this._stateChangeListeners.clear();
    this._actionChangeListenerMap.clear();
    this._uninstallListeners.clear();
    destroyContainer(this.options, this.primaryKey);
  };
  resetState = () => {
    this.setState(this.options.state(getContainer, this.primaryKey));
  };
}
