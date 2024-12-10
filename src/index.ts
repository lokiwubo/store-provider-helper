/**
 *
 * @param {string} storeName 容器中使用的仓库名
 * @param {any} context 执行上下文
 * @returns {
 *   api
 * } defineModel 用来定义store Entity
 */

import { Container } from "inversify";
import { SeniorNonNullable } from "ts-utils-helper";
import {
  createDynamicModel,
  createStaticModel,
  shackleDefinedStore,
  shackleDefineModel,
} from "./helper";
import { createStoreApis, createStoreContainer, StoreContainer } from "./store";
import { DefineModelOutput, ModelStructureData } from "./types/model";
import { ExtractState } from "./types/shared";
import { DefinedStore } from "./types/store";

export const defineStore: DefinedStore = shackleDefinedStore(
  (storeName, context) => {
    const container = new Container({ defaultScope: "Singleton" });
    const defineModel = shackleDefineModel((stateCreator, isDynamic) => {
      type TState = ExtractState<typeof stateCreator>;
      type TContext = typeof context;
      type TIsDynamic = typeof isDynamic;
      const containerName = `${storeName}-${Date.now().toString()}`;
      /**
       * @name storeContainer
       * @description 绑定store 单例容器
       */
      container
        .bind(containerName)
        .toConstantValue(createStoreContainer(stateCreator, () => context));

      const getStoreContainer = () => {
        return container.get<StoreContainer<typeof stateCreator, TContext>>(
          containerName
        );
      };
      const getStore = () => {
        return getStoreContainer().getStore<TState>();
      };
      const setStore = (state: TState) => {
        return getStoreContainer().setStore(state);
      };

      const storeApis = createStoreApis<TState>(getStore, setStore);

      const output = isDynamic
        ? createDynamicModel(storeApis)
        : createStaticModel(storeApis);

      return output as DefineModelOutput<
        ModelStructureData<TState>,
        TContext,
        SeniorNonNullable<TIsDynamic>
      >;
    });
    return {
      defineModel: defineModel,
      storeName,
      context,
      container,
    } as any;
  }
);

const store = defineStore("", {});
const model = store.defineModel(async () => {
  return { name: "test" };
}, true);
const bindModel = model.bindActions(() => {
  return {
    test: () => {
      console.log("test");
    },
  };
});
const value = bindModel.bindActions(() => {
  return {
    test2: () => {
      console.log("test");
    },
  };
});

const b = value("123123").actions.test2;
