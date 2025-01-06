/**
 * @fileoverview用来定义一些约束类型的模板
 */

import type { AnyLike, ClassLike, PromiseEither } from 'ts-utils-helper';
import { GetState, SetState } from './shared';

/**
 * @name 定义model 生成数据模板
 */
export interface ModelStateTemplate<TDependencies = AnyLike> {
  (dependencies: TDependencies): PromiseEither<AnyLike>;
}

export type ActionsOutputTemplate = Record<string, (...args: AnyLike[]) => AnyLike> | ClassLike;

/**
 * @name 定义model 生成action 的模板
 */
export interface ModelActionsTemplate<
  TEvents extends ActionsOutputTemplate = ActionsOutputTemplate,
  TState = AnyLike,
> {
  (getState: GetState<TState>, setState: SetState<TState>): TEvents;
}

/**
 * @name 定义model 生成getter 的模板
 */
export interface ModelGettersTemplate<TState = AnyLike, TDependencies = {}> {
  [getterKey: string]: (state: GetState<TState>, dependencies: TDependencies) => AnyLike;
}
