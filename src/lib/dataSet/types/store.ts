import { Container } from 'inversify';
import type { RecordLike } from 'ts-utils-helper';
import { DefineModel } from './model';

/**
 * @name 定义构建store的入参
 * @template TName 定义StoreName
 * @template TContext 定义StoreContainer的依赖类型
 * @description 定义StoreContainer的类型
 */
export interface DefinedStoreInput<TName, TContext> {
  containerName: TName;
  context: TContext;
}

/**
 * @name 定义构建Store的出参
 * @template TName 来自入参的TName
 * @template TContext 来自入参的TContext
 * @params defineModel 需要对外暴露的 方法
 * @params container 需要对外暴露的 方法
 */
export interface DefinedStoreOutput<TName, TContext> {
  defineModel: DefineModel<TContext>;
  storeName: TName;
  context: TContext;
  /** 来自store 内部构件的 container */
  container: Container;
  // actions: StoreApis<any>;
}

export interface DefinedStore {
  <TName, TContext extends RecordLike = {}>(
    storeName: TName,
    context?: TContext
  ): DefinedStoreOutput<TName, TContext>;
}
