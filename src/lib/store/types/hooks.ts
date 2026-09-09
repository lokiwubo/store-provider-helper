import type { BindStoreContext, StoreConfig, StoreContainer } from '../core';
import type {
    AnyLike,
    ExtraStoreGetter,
    RecordKeyLike,
    StorePrimaryKeyLike,
    StoreRecordFunctionsLike,
    StoreSetState,
} from './shared';

export interface UseGetContainer {
    /**
     * @description 静态容器
     */
    <
        TModel extends StoreConfig<
            AnyLike,
            Record<RecordKeyLike, AnyLike>,
            Record<RecordKeyLike, AnyLike>,
            false
        >,
    >(
        model: TModel
    ): UseGetContainerOut<TModel>;
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
    ): UseGetContainerOut<TModel>;
}
export type UseGetContainerOut<
    TModel extends StoreConfig<AnyLike, StoreRecordFunctionsLike, StoreRecordFunctionsLike, boolean>,
    TState = ReturnType<TModel['state']>,
> = {
    state: TState;
    setState: StoreSetState<TState>;
    actions: TModel['actions'] & BindStoreContext<TModel['actions'], TState, TModel['getters']>;
    container: StoreContainer<TModel>;
    getters: ExtraStoreGetter<TState, ReturnType<TModel['getters']>> &
    BindStoreContext<TModel['actions'], TState, TModel['getters']>;
    subscribeState: StoreContainer<TModel>['subscribeState'];
    subscribeActions: StoreContainer<TModel>['subscribeActions'];
    subscribeGetters: StoreContainer<TModel>['subscribeGetters'];
};
