import {
  ExtractClass,
  ExtractPromise,
  IsClass,
  IsPromise,
  PromiseEither,
} from "ts-utils-helper";
import { ActionsOutputTemplate, ModelStateTemplate } from "./template";

/**
 * @description 定义Listener的类型
 */
export type MiddleListener<
  TState,
  TParams = { state: TState; prevState: TState },
> = (
  param: TParams,
  next: (param: TParams) => Promise<TState>
) => PromiseEither<TState>;
/**
 * @description 定义Pipe Listener的类型
 */
export type PipeListener<TState> = (
  state: TState,
  prevState: TState
) => PromiseEither<TState>;

/**
 * @description 定义守卫Listener的类型
 */
export type GuardListener<TState> = (
  state: TState,
  prevState: TState
) => PromiseEither<boolean>;
/**
 * @description 定义拦截器Listener的类型
 */
export type InterceptListener<TState> = (
  state: TState,
  prevState: TState
) => PromiseEither<TState>;

/**
 * @description 获取数据的类型
 */
export interface GetState<TData> {
  <T extends (data: TData) => unknown>(selector: T): ReturnType<T>;
  (): TData;
}
/**
 * @description 设置数据的类型
 */
export interface SetState<TData> {
  <T extends (data: TData) => TData>(updateFn: T): void;
  <T extends Partial<TData>>(data: T, replace?: boolean): void;
}

/**
 * @description 抽取state
 */
export type ExtractState<
  T extends ModelStateTemplate,
  TReturn = ReturnType<T>,
> = IsPromise<TReturn> extends true ? ExtractPromise<TReturn> : TReturn;
/**
 * @description 抽取effects
 */
export type ExtractEffects<T extends ActionsOutputTemplate> =
  IsClass<T> extends true ? ExtractClass<T> : T;

export type MergeActions<
  T extends ActionsOutputTemplate,
  U extends ActionsOutputTemplate,
> = {
  [K in keyof T | keyof U]: K extends keyof T
    ? T[K]
    : K extends keyof U
      ? U[K]
      : never;
};
