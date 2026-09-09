import type { StoreContainer } from '../core';
import type {
    AnyLike,
    AsertActions,
    AsertGetters,
    AsertObject,
    FunctionLike,
    Prettify,
    RecordKeyLike,
    RecordLike,
    StorePrimaryKeyLike,
    StoreRecordFunctionsLike,
} from './shared';
import { Merge } from './shared';

export type StoreContainerOptions<TState extends RecordLike> = {
    getPrimaryKey?: () => string;
} & (
        | {
            /**
             * @description 容器类型
             * @default 'temp' 临时容器 超过一定数量会被按更新时间排序清理掉
             */
            type?: 'temp';
        }
        | {
            /**
             * @description 容器类型
             * @default 'persisted' 长期容器 不会被清理掉
             */
            type?: 'persisted';
        }
        | {
            type: 'sessionStorage';
            storage: {
                getStoreKey: (store: StoreContainer<StoreConfig<TState>, TState>) => string;
                partialize: (state: TState) => Partial<TState>;
            };
        }
        | {
            type: 'localStorage';
            storage: {
                getStoreKey: (store: StoreContainer<StoreConfig<TState>, TState>) => string;
                partialize: (state: TState) => Partial<TState>;
            };
        }
    );

export type StoreConfig<
    TState = AnyLike,
    TActions extends StoreRecordFunctionsLike = {},
    TGetters extends StoreRecordFunctionsLike = {},
    TDynamic extends boolean = boolean,
    TOptions = StoreContainerOptions<TState & RecordLike>,
> = {
    state: (getContainer: GetContainer, primateKey: RecordKeyLike) => TState;
    isDynamic: TDynamic;
    actions: ((
        state: NoInfer<TState>,
        getContainer: GetContainer,
        primateKey: RecordKeyLike
    ) => TActions) &
    BindStoreContext<TActions, TState, TGetters>;
    getters: ((
        state: NoInfer<TState>,
        getContainer: GetContainer,
        primateKey: RecordKeyLike
    ) => TGetters) &
    BindStoreContext<TActions, TState, TGetters>;
    onInitialize?: FunctionLike;
    onDestroy?: FunctionLike;
    option?: TOptions;
    merge: <const UState, const UActions, const UGetters, const UIsDynamic, const UOptions>(
        config: DefinedConfigParamsType<UState, UActions, UGetters, TState, TActions, TGetters>,
        isDynamic?: UIsDynamic,
        option?: UOptions
    ) => StoreConfig<
        Prettify<UState & TState>,
        Prettify<UActions & TActions>,
        Prettify<UGetters & TGetters>,
        UIsDynamic extends undefined ? TDynamic : UIsDynamic extends boolean ? UIsDynamic : false,
        UOptions extends undefined ? TOptions : StoreContainerOptions<Prettify<TState & UState>>
    >;
};

export type BindStoreContext<TActions, TState, TGetters> = NoInfer<
    ThisType<
        Pick<
            StoreContainer<StoreConfig<TState, AsertActions<TActions>, AsertGetters<TGetters>>>,
            | 'actions'
            | 'getters'
            | 'state'
            | 'setState'
            | 'getState'
            | 'getContainer'
            | 'primaryKey'
            | 'uuid'
        >
    >
>;

export type DefinedConfigParamsType<
    TState,
    TActions,
    TGetters,
    TContextState = {},
    TContectActions = {},
    TContextGetter = {},
> = {
    state?: (getContainer: GetContainer, primateKey: RecordKeyLike) => TState;
    actions?: (
        state: Merge<AsertObject<TState>, AsertObject<TContextState>>,
        getContainer: GetContainer,
        primateKey: RecordKeyLike
    ) => TActions &
        BindStoreContext<TActions & TContectActions, TState & TContextState, TGetters & TContextGetter>;
    getters?: (
        state: Merge<AsertObject<TState>, AsertObject<TContextState>>,
        getContainer: GetContainer,
        primateKey: RecordKeyLike
    ) => TGetters &
        BindStoreContext<TActions & TContectActions, TState & TContextState, TGetters & TContextGetter>;
} & {
    onInitialize?: FunctionLike;
    onDestroy?: FunctionLike;
} & BindStoreContext<TActions & TContectActions, TState & TContextState, TGetters & TContextGetter>;

export type GetContainer = <
    TModel extends StoreConfig<
        AnyLike,
        Record<RecordKeyLike, AnyLike>,
        Record<RecordKeyLike, AnyLike>,
        boolean
    >,
>(
    model: TModel,
    containerKey?: StorePrimaryKeyLike,
    option?: StoreContainerOptions<NoInfer<ReturnType<TModel['state']>>>
) => StoreContainer<TModel>;

export type ExtractType<
    TState extends RecordLike,
    TType extends StoreContainerOptions<TState>['type'],
> =
    StoreContainerOptions<TState> extends infer U ? (U extends { type?: TType } ? U : never) : never;
