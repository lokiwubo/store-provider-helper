/**
 * @fileoverview用来定义容器数据结构
 */

/**
 * @name 存储对象容器结构
 */
interface ContainerState<TData = {}> {
  namespace: string;
  updateTime: number;
  expiredTime?: number;
  isDynamic?: boolean;
  data: TData;
}
/**
 * @name 存储对象容器结构
 */
interface Container {
  [storeName: string]: {
    [modelName: string]: ContainerState;
  };
}
