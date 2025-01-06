/**
 *
 * @param {string} storeName 容器中使用的仓库名
 * @param {any} context 执行上下文
 *  defineModel 用来定义store Entity
 */

import { Container } from 'inversify';
import type { AnyLike, RecordLike, SeniorNonNullable } from 'ts-utils-helper';
import { deepFreeze, deepReadOnly } from 'ts-utils-helper';
import {
  createDependencies,
  createDynamicDependencies,
  createDynamicModel,
  createStaticModel,
  shackleDefinedStore,
  shackleDefineModel,
} from './helper';
import { createStoreApis, StoreContainer } from './store';
import { ContainerDependenciesUnion } from './types/dependencies';
import { DefineModelOutput, ModelStructureData } from './types/model';
import { ExtractState } from './types/shared';
import { DefinedStore } from './types/store';

export const defineStore: DefinedStore = shackleDefinedStore(
  (storeName, context: RecordLike = {}) => {
    const container = new Container({ defaultScope: 'Singleton' });
    const defineModel = shackleDefineModel((stateCreator, isDynamic) => {
      type TState = ExtractState<typeof stateCreator>;
      type TContext = typeof context;
      type TIsDynamic = typeof isDynamic;

      const dateKey = Date.now().toString();
      const containerName = `${storeName}-${dateKey}`;
      // /**
      //  * @name storeContainer
      //  * @description 绑定store 单例容器
      //  */
      // container
      //   .bind(containerName)
      //   .toConstantValue(
      //     createStoreContainer(stateCreator, () => dependencies)
      //   );

      const getStoreContainer = () => {
        return container.get<
          StoreContainer<typeof stateCreator, ContainerDependenciesUnion<TContext>>
        >(containerName);
      };
      const getStore = () => {
        return deepReadOnly(getStoreContainer().getStore<TState>()) as TState;
      };
      const setStore = (state: TState) => {
        return getStoreContainer().setStore(state);
      };
      // Dependencies 设置为只读
      const getDependencies = (modelId?: string) => {
        if (modelId) {
          return deepFreeze(createDynamicDependencies(context, modelId));
        } else {
          return deepFreeze(createDependencies(context));
        }
      };

      const storeApis = createStoreApis<TState>(getStore, setStore);

      const output = isDynamic
        ? createDynamicModel(storeApis, getDependencies)
        : createStaticModel(storeApis, getDependencies);

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
    } as AnyLike;
  }
);

// const store = defineStore('appStore', {});
// const model = store.defineModel(async (dep) => {
//   return { name: dep.dynamicKey };
// }, true);

// const bindModel = model.bindActions(() => {
//   return {
//     test: (a: number, b: string) => {
//       return Promise.resolve(a + b);
//     },
//   };
// });

// const value = bindModel('123123').actions.test.subscribeAction(() => {});
