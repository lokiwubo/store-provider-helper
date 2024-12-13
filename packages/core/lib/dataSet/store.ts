import { AnyLike, middleware, RecordLike } from "ts-utils-helper";
import { getMiddlewareListen } from "./helper";
import { ContainerDependenciesUnion } from "./types/dependencies";
import {
  ExtractState,
  GetState,
  GuardListener,
  InterceptListener,
  MiddleListener,
  SetState,
} from "./types/shared";
import { ModelStateTemplate } from "./types/template";

export const createStoreApis = <TState>(
  getStore: () => TState,
  setStore: (storeData: TState) => void
) => {
  return new ModelApiProvider<TState>(getStore, setStore);
};

export const proxyStore = <TState extends RecordLike>(storeState: TState) => {
  const proxyStore = new Proxy(storeState, {
    get: (target, key) => {
      return target[key];
    },
    set: (target, key: keyof TState, value) => {
      target[key] = value;
      return true;
    },
  });
  return proxyStore;
};

/**
 * @description store 容器
 */
export class StoreContainer<
  TCreator extends ModelStateTemplate = () => {},
  TDependencies extends
    ContainerDependenciesUnion = ContainerDependenciesUnion<RecordLike>,
  TState = ExtractState<TCreator>,
> {
  private storeData: AnyLike = undefined;
  public isInitialized: boolean = true;
  private subscribers: Set<(storeData: TState) => void> = new Set();
  constructor(
    private storeCreator: TCreator,
    private getDependencies: () => TDependencies
  ) {
    this.reload();
  }
  reload() {
    try {
      const result = this.storeCreator(this.getDependencies());
      // 判断返回的 result 是否为 Promise
      if (result instanceof Promise) {
        result.then((res) => {
          this.storeCreator(res);
        });
      } else {
        this.storeCreator(result);
      }
    } catch (error) {
      console.error(error);
    }
  }
  getStore<TState>(): TState {
    return this.storeData;
  }
  setStore(storeData: AnyLike) {
    this.isInitialized = false;
    this.storeData = storeData;
    this.subscribers.forEach((subscriberItem) =>
      subscriberItem(this.storeData)
    );
  }
  subscriber(listener: (storeData: AnyLike) => void) {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }
}

/**
 * @description 创建 store 容器
 */
export const createStoreContainer = <
  TCreator extends ModelStateTemplate,
  TDependencies extends ContainerDependenciesUnion,
>(
  storeCreator: TCreator,
  getDependencies: () => TDependencies
) => new StoreContainer(storeCreator, getDependencies);

export class ModelApiProvider<TStore = AnyLike> {
  constructor(
    private getStore: () => TStore,
    private setStore: (storeData: TStore) => void
  ) {}
  private middlewareListeners = new Set<MiddleListener<TStore>>();
  // 守卫中间件
  private guardListeners = new Set<GuardListener<TStore>>();
  // 拦截中间件
  private interceptListeners = new Set<InterceptListener<TStore>>();
  public getState: GetState<TStore> = (
    selector?: (data: TStore) => AnyLike
  ) => {
    const store = this.getStore();
    return selector ? selector(store) : store;
  };
  private updateStore(nextStore: TStore) {
    const store = this.getStore();
    // 调用中间件
    middleware(
      [...this.middlewareListeners].concat([
        getMiddlewareListen<TStore>(async (context, next) => {
          next(context);
          this.setStore(context.state);
        }),
      ])
    )({
      state: nextStore,
      prevState: store,
    });
  }
  setState: SetState<TStore> = <TData extends Partial<TStore>>(
    firstArg: AnyLike,
    replace: boolean = false
  ) => {
    const store = this.getStore();
    if (typeof firstArg === "function") {
      // 如果参数是函数，则调用它来更新状态
      const updateFn = firstArg as (data: TStore) => TData;
      this.updateStore({ ...store, ...updateFn(store) });
    } else {
      // 如果参数是对象，则根据是否替换进行状态更新
      const data = firstArg as Partial<TStore>;
      if (replace) {
        this.updateStore({ ...data } as TStore);
      } else {
        this.updateStore({ ...store, ...data }); // 部分更新状态
      }
    }
  };
  useMiddleware = (Listener: MiddleListener<TStore>) => {
    this.middlewareListeners.add(Listener);
    return () => {
      this.middlewareListeners.delete(Listener);
    };
  };

  /**
   * @description 管道中间件
   * 使用管道中间件在将数据设置到存储之前对其进行转换
   */
  // TODO: 管道中间件 待实现
  pipe = () => {};
  /**
   * @description 拦截中间件
   * 使用拦截中间件在将数据设置到存储之前对其进行拦截，并返回新的值
   */
  useIntercept = (Listener: InterceptListener<TStore>) => {
    this.interceptListeners.add(Listener);
    return () => {
      this.interceptListeners.delete(Listener);
    };
  };
  /**
   * @description 守卫中间件
   * 使用守卫中间件在设置数据之前对其进行检查，如果检查失败则不会设置数据
   */
  useGuard = (Listener: GuardListener<TStore>) => {
    this.guardListeners.add(Listener);
    return () => {
      this.guardListeners.delete(Listener);
    };
  };
}
