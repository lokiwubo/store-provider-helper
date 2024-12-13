import { AnyLike, RecordLike } from "ts-utils-helper";
import { ModelApiProvider } from "./store";
import {
  ContainerDependenciesBase,
  ContainerDependenciesUnion,
  DynamicContainerDependencies,
} from "./types/dependencies";
import {
  DefineModel,
  DefineModelOutput,
  ModelBoundOutput,
  ModelStructureData,
} from "./types/model";
import { ExtractState, MiddleListener } from "./types/shared";
import { DefinedStore } from "./types/store";
import { ModelStateTemplate } from "./types/template";

export const shackleDefinedStore = <TDefineStore extends DefinedStore>(
  defineStoreHandle: TDefineStore
): TDefineStore => defineStoreHandle;

/**
 * @description 约束模型定义config
 */
export const shackleDefineModel = <TDefineModel extends DefineModel<AnyLike>>(
  config: TDefineModel
) => config;
/**
 * @description 约束动态模型输出config
 */
export const shackleDynamicModelOutput = <
  TStateCreator extends ModelStateTemplate<AnyLike>,
  TConfig extends DefineModelOutput<
    ModelStructureData<ExtractState<TStateCreator>>,
    {},
    true
  >,
>(
  config: TConfig
) => config;
/**
 * @description 约束静态模型输出config
 */
export const shackleStaticModelOutput = <
  TStateCreator extends ModelStateTemplate<AnyLike>,
  TConfig extends DefineModelOutput<
    ModelStructureData<ExtractState<TStateCreator>>,
    {},
    false
  >,
>(
  config: TConfig
) => config;

/**
 * @description 创建静态依赖
 */
export const createDependencies = <TContext>(
  context: TContext
): ContainerDependenciesBase<TContext> => {
  return {
    context,
    createDate: new Date(),
  };
};
/**
 * @description 创建动态依赖
 */
export const createDynamicDependencies = <TContext extends RecordLike>(
  context: TContext,
  dynamicKey: string
): DynamicContainerDependencies<TContext> => {
  return {
    dynamicKey,
    isDynamic: true,
    ...createDependencies(context),
  };
};
/**
 * @name 约束 模型使用输出数据结构
 */
export const getBoundModelOutput = <TConfig extends ModelBoundOutput>(
  config: TConfig
) => config;

type injectDependencies = (modelId?: string) => ContainerDependenciesUnion;

export const createUseModelApis = <
  TStructureData extends ModelStructureData,
>(): ModelBoundOutput<TStructureData> => {
  // actions 需要特殊处理 使得action 支持监听方法
  return {
    getters: {},
    actions: {},
    state: {},
  };
};

export const createDynamicModel = (
  apis: ModelApiProvider,
  injectDependencies: injectDependencies
) => {
  return Object.assign(
    shackleDynamicModelOutput({
      bindActions: (getActions) => {
        const actions = getActions(apis.getState, apis.setState);
        // 此处需要action 合并
      },
    }),
    (modelId: string) => {
      injectDependencies(modelId);
      return createUseModelApis();
    }
  );
};

export const createStaticModel = (
  apis: ModelApiProvider,
  injectDependencies: injectDependencies
) => {
  return Object.assign(
    shackleStaticModelOutput({
      get: apis.getState,
      set: apis.setState,
      bindActions: (getActions) => {
        const actions = getActions(apis.getState, apis.setState);
        // 此处需要action 合并
      },
    }),
    () => {
      injectDependencies();
      return createUseModelApis();
    }
  );
};

/**
 * @name 获取中间件类型
 */
export const getMiddlewareListen = <TState>(
  listener: MiddleListener<TState>
): MiddleListener<TState> => listener;
