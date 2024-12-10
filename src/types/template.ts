/**
 * @fileoverview用来定义一些约束类型的模板
 */

import { ClassLike, PromiseEither } from "ts-utils-helper";
import { GetState, SetState } from "./shared";

/**
 * @name 定义model 生成数据模板
 */
export interface ModelStateTemplate<TDependencies = any> {
  (dependencies: TDependencies): PromiseEither<any>;
}

export type ActionsOutputTemplate =
  | Record<string, (...args: any[]) => any>
  | ClassLike;

/**
 * @name 定义model 生成action 的模板
 */
export interface ModelActionsTemplate<
  TEvents extends ActionsOutputTemplate = any,
  TState = any,
  TDependencies = any,
> {
  (
    get: GetState<TState>,
    set: SetState<TState>,
    dependencies: TDependencies
  ): TEvents;
}

/**
 * @name 定义model 生成getter 的模板
 */
export interface ModelGettersTemplate<TState = any, TDependencies = any> {
  [getterKey: string]: (
    state: GetState<TState>,
    dependencies: TDependencies
  ) => any;
}
