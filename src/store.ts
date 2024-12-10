import { RecordLike } from "ts-utils-helper";
import {
  GuardListener,
  InterceptListener,
  MiddleListener,
} from "./types/shared";
import { StoreApis } from "./types/store";
import { ModelStateTemplate } from "./types/template";

/**
 * @description 创建和约束 store api 配置
 * @param {StoreApis} config
 */
export const shackleStoreApiConfig = <TState>(
  config: StoreApis<TState>
): StoreApis<TState> => config;

export const createStoreApis = <TState>(
  getStore: () => TState,
  setStore: (storeData: TState) => void
) => {
  // 洋葱模型中间件;
  const middlewareListeners = new Set<MiddleListener<TState>>();
  // 守卫中间件
  const guardListeners = new Set<GuardListener<TState>>();
  // 拦截中间件
  const interceptListeners = new Set<InterceptListener<TState>>();
  // 管道中间件
  const pipeListeners = new Set<InterceptListener<TState>>();

  return shackleStoreApiConfig<TState>({
    getState: (selector?: (data: TState) => any) => {
      const store = getStore();
      return selector ? selector(store) : store;
    },
    setState: (nextState: TState, replacer?: boolean) => {
      const store = getStore();
      /**
       * @name 执行中间件
       */
      if (replacer) {
        setStore(nextState);
      } else {
        setStore({ ...store, ...nextState });
      }
    },

    useMiddleware: (Listener) => {
      middlewareListeners.add(Listener);
      return () => {
        middlewareListeners.delete(Listener);
      };
    },
    // TODO: 管道中间件
    pipe: () => {},

    useIntercept: (Listener) => {
      interceptListeners.add(Listener);
      return () => {
        interceptListeners.delete(Listener);
      };
    },
    useGuard: (Listener) => {
      guardListeners.add(Listener);
      return () => {
        guardListeners.delete(Listener);
      };
    },
  });
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
  TCreator extends ModelStateTemplate,
  TDependencies,
> {
  private storeData: any;
  public isInitialized: boolean = true;
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
    } catch (error) {}
  }
  getStore<TState>(): TState {
    return this.storeData;
  }
  setStore(storeData: any) {
    this.isInitialized = false;
    this.storeData = storeData;
    this.storeDataChange(this.storeData);
  }
  storeDataChange(listener: (storeData: any) => void) {
    return () => {
      listener(this.storeData);
    };
  }
}

/**
 * @description 创建 store 容器
 */
export const createStoreContainer = <
  TCreator extends ModelStateTemplate,
  TDependencies,
>(
  storeCreator: TCreator,
  getDependencies: () => TDependencies
) => new StoreContainer(storeCreator, getDependencies);
