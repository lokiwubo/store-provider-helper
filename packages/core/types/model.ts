import { AnyLike, FunctionLike } from "ts-utils-helper";
import { ContainerDependencies } from "./dependencies";
import {
  ExtractEffects,
  ExtractState,
  GetState,
  SetState,
  UnSubscribe,
} from "./shared";
import {
  ActionsOutputTemplate,
  ModelActionsTemplate,
  ModelGettersTemplate,
  ModelStateTemplate,
} from "./template";

/**
 * @name 定义数据在model 内部的结构
 */
export interface ModelStructureData<
  TState = AnyLike,
  TActions extends ActionsOutputTemplate = AnyLike,
  TGetters extends ModelGettersTemplate = AnyLike,
> {
  state: TState;
  actions: TActions;
  getters: TGetters;
}

/**
 * @name 定义DefineModel的方法结构
 * @example
 * ```typescript
 *      const model = defineModel(()=>{
 *         return {count:0}
 *      })
 * ```
 */
export interface DefineModel<TContext> {
  <
    TStateCreator extends ModelStateTemplate<
      ContainerDependencies<TContext, TDynamic>
    >,
    TDynamic extends boolean = false,
  >(
    stateCreator: TStateCreator,
    isDynamic?: TDynamic
  ): DefineModelOutput<
    ModelStructureData<ExtractState<TStateCreator>, {}>,
    TContext,
    TDynamic
  >;
}
/**
 * @name 定义动态Model对外暴露方法的接口
 */
type DynamicModelApi<
  TState,
  TDependencies,
  TStructureData extends ModelStructureData,
> = {
  bindActions: <TActions extends ActionsOutputTemplate>(
    actions: ModelActionsTemplate<TActions, TState>
  ) => DefineModelOutput<
    ModelStructureData<
      TState,
      TStructureData["actions"] & ExtractEffects<NoInfer<TActions>>
    >,
    TDependencies,
    true
  >;
  /**注入阶段 同时去实例化对象 */
  (moduleId: string): ModelBoundOutput<TStructureData>;
};

/**
 * @name 定义静态Model对外暴露方法的接口
 */
type StaticModelApi<
  TState,
  TDependencies,
  TStructureData extends ModelStructureData,
> = {
  get: GetState<TState>;
  set: SetState<TState>;
  bindActions: <TActions extends ActionsOutputTemplate>(
    actions: ModelActionsTemplate<TActions, TState>
  ) => DefineModelOutput<
    ModelStructureData<
      TState,
      TStructureData["actions"] & ExtractEffects<NoInfer<TActions>>
    >,
    TDependencies
  >;
  /**
   * @name 获取存储数据的实例
   * @example
   *  const { get, set} =  model()
   */
  (): ModelBoundOutput<TStructureData>;
};
/**
 * @name 定义DefineModel的输出结构
 * @template TState 从stateCreator 获取的响应体
 * @template TDependencies 依赖注入的上下文
 * @template TDynamic 用来判断是否是动态Model  需要更具是否是动态模型来判断返回体
 */
export type DefineModelOutput<
  TStructureData extends ModelStructureData,
  TDependencies,
  TDynamic extends boolean = false,
  TState = TStructureData["state"],
> = TDynamic extends true
  ? DynamicModelApi<TState, TDependencies, TStructureData>
  : StaticModelApi<TState, TDependencies, TStructureData>;
/**
 * @name 定义action的输出结构 支持监听事件触发
 */
type CreateBoundActionOutput<T extends ModelActionsTemplate> = {
  [actionKey in keyof T]: T[actionKey] extends FunctionLike
    ? {
        (...args: Parameters<T[actionKey]>): ReturnType<T[actionKey]>;
        subscribeAction: (
          callback: (...args: Parameters<T[actionKey]>) => void
        ) => UnSubscribe;
      }
    : never;
};

export interface ModelBoundOutput<
  T extends ModelStructureData = ModelStructureData,
> {
  actions: CreateBoundActionOutput<T["actions"]>;
  getters: T["getters"];
  state: T["state"];
  /**
   * @name 监听state变化触发回调
   * @returns 取消订阅方法
   */
  subscribe: (nextState: T["state"], state: T["state"]) => UnSubscribe;
}
