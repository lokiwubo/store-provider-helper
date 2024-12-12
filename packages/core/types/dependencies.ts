/**
 * @description 用来定义上下文的
 */
export interface ContainerDependenciesBase<TContext> {
  context: TContext;
  createDate: Date;
}

/**
 * @description 动态模型的上下文
 */
export interface DynamicContainerDependencies<TContext>
  extends ContainerDependenciesBase<TContext> {
  dynamicKey: string;
  isDynamic: true;
}

export type ContainerDependenciesUnion<TContext = {}> =
  | DynamicContainerDependencies<TContext>
  | ContainerDependenciesBase<TContext>;

/**
 * @description 定义ContainerDependencies的类型
 */
export type ContainerDependencies<
  TContext,
  TDynamic extends boolean = false,
> = TDynamic extends true
  ? DynamicContainerDependencies<TContext>
  : ContainerDependenciesBase<TContext>;
