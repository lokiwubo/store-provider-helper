/**
 * @description 用来定义上下文的
 */
export interface ContainerDependenciesBase<TContext> {
  context: TContext;
}

/**
 * @description 动态模型的上下文
 */
export interface DynamicContainerDependencies<TContext>
  extends ContainerDependenciesBase<TContext> {
  storeKey: string;
}

/**
 * @description 定义ContainerDependencies的类型
 */
export type ContainerDependencies<
  TContext,
  TDynamic extends boolean = false,
> = TDynamic extends true
  ? DynamicContainerDependencies<TContext>
  : ContainerDependenciesBase<TContext>;
