import {
  ContainerDependenciesBase,
  DynamicContainerDependencies,
} from "./types/dependencies";
import {
  DefineModel,
  DefineModelOutput,
  ModelStructureData,
} from "./types/model";
import { ExtractState } from "./types/shared";
import { DefinedStore } from "./types/store";
import { ModelStateTemplate } from "./types/template";

export const shackleDefinedStore = <TDefineStore extends DefinedStore>(
  defineStoreHandle: TDefineStore
): TDefineStore => defineStoreHandle;

export const shackleDefineModel = <TDefineModel extends DefineModel<any>>(
  config: TDefineModel
) => config;

export const shackleDependencies = <TContext>(
  context: TContext
): ContainerDependenciesBase<TContext> => {
  return {
    context,
  };
};
export const shackleDynamicModelOutput = <
  TStateCreator extends ModelStateTemplate<any>,
  TContext extends DefineModelOutput<
    ModelStructureData<ExtractState<TStateCreator>>,
    TContext,
    true
  >,
>(
  config: TContext
) => config;

export const shackleStaticModelOutput = <
  TStateCreator extends ModelStateTemplate<any>,
  TContext extends DefineModelOutput<
    ModelStructureData<ExtractState<TStateCreator>>,
    TContext,
    false
  >,
>(
  config: TContext
) => config;

export const shackleDynamicDependencies = <TContext>(
  context: TContext,
  storeKey: string
): DynamicContainerDependencies<TContext> => {
  return {
    context,
    storeKey: storeKey,
  };
};

export const createBindActions = () => {};

export const createDynamicModel = (apis: any) => {
  const injectModel = (modelId: string) => {
    const dependencies = createDynamicDependencies(context, modelId);
  };
  return shackleDynamicModelOutput({
    bindActions: () => {},
  });
};

export const createStaticModel = (apis: any) => {
  const dependencies = shackleDependencies(context);
  return shackleStaticModelOutput({
    get: () => {},
    set: () => {},
    bindActions: () => {},
  });
};
