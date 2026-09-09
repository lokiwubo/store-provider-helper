import { isEqual } from 'lodash-es';

import { RAW_KEY } from './constant';
import { destroyContainer, getContainer, getRaw } from './helpers';
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

const bindContainerActions = <TActions extends StoreRecordFunctionsLike>(
    actions: TActions,
    container: StoreContainer,
    getActionSubscribeMap: () => Map<AnyLike, FunctionLike[]>
) => {
    /** 缓存重构后的 actions  对原有函数进行了事件关联  */
    const cachedActions = new Map();
    return new Proxy(actions, {
        get: (target, propName) => {
            const action = target[propName];
            if (typeof action === 'function') {
                const actionSubscribes = getActionSubscribeMap().get(propName);
                if (!cachedActions.has(propName)) {
                    if (isAsyncFunction(action)) {
                        cachedActions.set(propName, async (...args: AnyLike[]) => {
                            const result = await Reflect.apply(target[propName]!, container, args);
                            actionSubscribes?.forEach((fn) => fn(args, result));
                            return result;
                        });
                    } else {
                        cachedActions.set(propName, (...args: AnyLike[]) => {
                            const result = Reflect.apply(target[propName]!, container, args);
                            actionSubscribes?.forEach((fn) => fn(args, result));
                            return result;
                        });
                    }
                }
                return cachedActions.get(propName);
            }
            return target[propName];
        },
    });
};

const bindContainerGetters = <TGetters extends StoreRecordFunctionsLike>(
    getters: TGetters,
    container: StoreContainer,
    getReadListeners: () => Set<ReadListener<StoreContainer>>,
    getGettersChangeListeners: () => Set<WriteListener<ContainerGetters<TGetters>, AnyLike>>
) => {
    const cacheGetters = new Map<
        keyof TGetters,
        {
            unsubscribe: (() => void)[];
            result: AnyLike;
        }
    >();
    const scheduleTaskFn = createSameScheduleTask();
    const scheduleTask = (propName: string | symbol, track: FunctionLike) =>
        scheduleTaskFn(() => {
            const cacheData = cacheGetters.get(propName);
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
            cacheGetters.set(propName, { unsubscribe, result });
        });

    return new Proxy(getters, {
        get: (target, propName) => {
            const readListeners = getReadListeners();
            const propNameStr = String(propName);
            const listenerParam = {
                store: container,
                keyPath: propNameStr,
                value: null,
                type: 'getters' as const,
            };
            if (cacheGetters.has(propName)) {
                listenerParam.value = cacheGetters.get(propName)?.result;
                readListeners.forEach((listener) => listener(listenerParam));
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
                                onChange: scheduleTask(propName, track),
                            });
                        });
                        return [unsubscribe, result]; // 需要进行依赖收集
                    };

                    const [unsubscribe, result] = track();
                    listenerParam.value = result;
                    cacheGetters.set(propName, { unsubscribe, result });
                    readListeners.forEach((listener) => listener(listenerParam));
                    return listenerParam.value;
                }
                const result = cacheGetters.get(propName)?.result;
                listenerParam.value = result;
                readListeners.forEach((listener) => listener(listenerParam));
                return listenerParam.value;
            }
        },
    });
};
/** 变化的数据结构 */
type DataStateType = {
    /**原始数据 */
    raw: AnyLike;
    /**草稿数据 */
    draft: AnyLike;
    paths: string[];
    proxy: ProxyBaseDataType<AnyLike>;
    modified: boolean;
    context: ProxyScopeContext;
    /**撤销代理 */
    revoke: () => void;
    /**修改的keys */
    modifyKeys: Set<symbol | string>; //
};

type ProxyBaseDataType<T> = {
    [RAW_KEY]: T;
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
    cacheStateMap: WeakMap<WeakKey, DataStateType>;
    /** 保存修改对象 保存为对象方便给覆盖 */
    peddingChangeMap: Map<string, ModifyStateType>; //
    /** 创建调度任务 */
    createScheduleTask: () => void;
    /** 获取  */
    getReadListeners: () => Set<ReadListener<StoreContainer>>;
    getChangeListeners: () => Set<WriteListener<AnyLike, AnyLike>>;
    isEdit: boolean;
};

function createProxy<T extends RecordLike>(
    context: ProxyScopeContext,
    value: T,
    paths: string[]
): DataStateType {
    const cacheState = context.cacheStateMap.get(value);
    if (cacheState) {
        return cacheState;
    }
    const state = {
        raw: value, // 原始数据引用
        modified: false, // 是否被修改
        draft: copyData(value), // 浅copy数据
        paths: paths,
        context: context,
        proxy: null as unknown as ProxyBaseDataType<T>,
        revoke: null as unknown as () => void,
        modifyKeys: new Set<string | symbol>(),
    } satisfies DataStateType;

    const { proxy, revoke } = Proxy.revocable(state.raw, {
        get(target, property, receiver) {
            const readListeners = context.getReadListeners();
            const result = context.isEdit
                ? Reflect.get(state.draft, property, receiver)
                : Reflect.get(target, property, receiver);
            const propertyStr = String(property);
            const nextPath = filterNonNullish([...paths, propertyStr]);
            if (property === RAW_KEY) {
                return result;
            }
            if (property === Symbol.toPrimitive || property === 'valueOf') {
                return () => result;
            }
            // 懒递归代理
            if (typeof result === 'object' && result !== null) {
                return createProxy(context, result, nextPath);
            }
            readListeners.forEach((listener) =>
                listener({
                    store: context.container,
                    keyPath: propertyStr,
                    value: result,
                    type: 'state', // state变化
                })
            );
            return result;
        },
        set(_target, property, value, receiver) {
            const preValue = state.draft[property];
            const propertyStr = String(property);
            const nextPath = filterNonNullish([...paths, propertyStr]);
            if (preValue != value) {
                /**
                 * 1.判断是否需要更新， 需要更新的化添加到更新队列
                 * 2.处理更新数据变为proxy 对象
                 * 3.对外通知已完成更新
                 */
                Reflect.set(state.draft, property, value, receiver);
                state.modifyKeys.add(property);
                context.peddingChangeMap.set(nextPath.join('.'), {
                    state: state,
                    property: property,
                    preValue: preValue,
                    curValue: value,
                });
                context.createScheduleTask();
            }

            // 只有当值真正发生变化时才触发更新

            return value;
        },
        deleteProperty(target, property) {
            return true;
        },
    });
    state.proxy = proxy as ProxyBaseDataType<T>;
    state.revoke = () => {
        revoke();
    };
    context.cacheStateMap.set(parent, state);
    return state;
}

const bindProxyHostState = <TState extends RecordLike>(
    hostState: TState,
    container: StoreContainer,
    getReadListeners: () => Set<ReadListener<StoreContainer>>,
    getWriteListeners: () => Set<WriteListener<TState, AnyLike>>,
    getIsEdit: () => boolean
): TState => {
    const scheduleTaskFn = createSameScheduleTask();
    const scheduleTask = () =>
        scheduleTaskFn(() => {
            if (context.peddingChangeMap.size > 0) {
                // 处理state变化
                context.peddingChangeMap.forEach((changeInfo) => {
                    const { state } = changeInfo;
                    state.modifyKeys.forEach((property) => {
                        Reflect.set(state.raw, property, state.draft[property]);
                    });
                });
                context.peddingChangeMap = new Map();
                const _writeStateSubscribs = getWriteListeners();
                // TODO 目前是完整数据通知更新之后可以细颗粒度到对应keyPath
                for (const listener of _writeStateSubscribs) {
                    const { select, equal, onChange, prev } = listener;
                    const current = select(hostState);
                    if (equal(prev, current)) continue;
                    onChange(current, prev);
                    listener.prev = current;
                }
                context.cacheStateMap = new WeakMap();
            }
        });

    const context = {
        container,
        peddingChangeMap: new Map<string, ModifyStateType>(),
        cacheStateMap: new WeakMap(),
        get isEdit() {
            return getIsEdit();
        },
        /**值变化 */
        createScheduleTask: scheduleTask,
        getReadListeners: getReadListeners,
        getChangeListeners: getWriteListeners,
    } satisfies ProxyScopeContext as ProxyScopeContext;
    return createProxy(context, hostState, []).proxy as TState;
};

type ReadListener<TStore extends StoreContainer = StoreContainer> = (params: {
    store: TStore;
    keyPath: string;
    value: AnyLike;
    type: 'state' | 'getters';
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
            this._actions = bindContainerActions(
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
            this._getters = bindContainerGetters(
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
        const listener = { onChange, select, equal, prev: select(Object.freeze(getRaw(this.state))) };
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
