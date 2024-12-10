import { ContainerDependencies } from "./dependencies";
import { ExtractEffects, ExtractState, GetState, SetState } from "./shared";
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
  TState = any,
  TActions extends ActionsOutputTemplate = {},
  TGetters extends ModelGettersTemplate = {},
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
    ModelStructureData<ExtractState<TStateCreator>>,
    TContext,
    TDynamic
  >;
}

/**
 * @name 定义DefineModel的输出结构
 * @template TState 从stateCreator 获取的响应体
 * @template TContext 依赖注入的上下文
 * @template TDynamic 用来判断是否是动态Model  需要更具是否是动态模型来判断返回体
 */
export type DefineModelOutput<
  TStructureData extends ModelStructureData,
  TContext,
  TDynamic extends boolean = false,
  TState = TStructureData["state"],
  TAction = TStructureData["actions"],
> = TDynamic extends true
  ? {
      /**
       * @template TActions 事件模板
       */
      bindActions: <
        TActions extends ActionsOutputTemplate,
        TActionRecord = ExtractEffects<NoInfer<TActions>>,
      >(
        actions: ModelActionsTemplate<TActions, TState, TContext>
      ) => DefineModelOutput<
        TActionRecord extends ActionsOutputTemplate
          ? ModelStructureData<TAction, TActionRecord>
          : never,
        TContext,
        TDynamic
      >;
      /**注入阶段 同时去实例化对象 */
      (moduleId: string): ModelBoundOutput<TStructureData>;
    }
  : {
      get: GetState<TState>;
      set: SetState<TState>;
      bindActions: <TActions extends ActionsOutputTemplate>(
        actions: ModelActionsTemplate<TActions, TState, TContext>
      ) => DefineModelOutput<
        ModelStructureData<TState, ExtractEffects<NoInfer<TActions>>>,
        TContext
      >;
      /**
       * @name 获取存储数据的实例
       * @example
       *  const { get, set} =  model()
       */
      (): ModelBoundOutput<TStructureData>;
    };
/**
 * @name 定义action的输出结构
 */
type CreateBoundActionOutput<T extends ModelActionsTemplate> = {
  [actionKey in keyof T]: {
    subscribeAction: (callback: (payload: any) => void) => () => void;
  } & Pick<T, actionKey>;
};

export interface ModelBoundOutput<T extends ModelStructureData> {
  actions: CreateBoundActionOutput<T["actions"]>;
  getters: T["getters"];
  state: T["state"];
  /**
   * @name 监听state变化触发回调
   * @returns 取消订阅方法
   */
  subscribe: (nextState: T["state"], state: T["state"]) => () => void;
}
