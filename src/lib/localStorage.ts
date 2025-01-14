import { produce } from 'immer';
import type { RecordLike } from 'ts-utils-helper';
import { isObject } from 'ts-utils-helper';
import type { ZodTypeDef } from 'zod';
import { z, ZodType } from 'zod';
export interface CustomEventParams<T, TPartial = Partial<T>> {
  preData: TPartial;
  curData: TPartial;
}
/**
 * @description 创建一个本地存储的 store
 * @param storeName  对应localStorage的key
 * @param schema  存储类型可以用来校验数据
 * @returns {} 包含 setItem, getItem, removeItem 方法的对象和hooks 方法用来实现响应式数据更新
 * @example
 * const api = createStorage("sdf", z.object({ a: z.string(), b: z.number() }));
 * useStorage(){
 *   useSyncExternalStore(
 *    api.subscribe,
 *    api.getStoreData.bind(api),
 *    api.getStoreData.bind(api)
 *  );
 * }
 */
export type StorageStoreSchema = ZodType<unknown, ZodTypeDef, unknown>;

export class StorageStore<
  const T extends ZodType<unknown, ZodTypeDef, unknown>,
  StateType = z.infer<T>,
> {
  constructor(
    private storeName: string,
    private schema: T
  ) {}
  get key() {
    return this.storeName;
  }
  get eventName() {
    return `${this.key}-event-storage`;
  }
  private generateData<T extends StateType>(storeData: Partial<T>): string {
    return JSON.stringify({
      date: Date.now(),
      state: storeData,
    });
  }
  getStoreData() {
    return (
      JSON.parse(localStorage.getItem(this.storeName) ?? this.generateData({})) as {
        state: Partial<StateType>;
        date: number;
      }
    ).state as StateType & RecordLike;
  }
  setStoreData(data: StateType) {
    const storeData = this.getStoreData();
    try {
      this.schema.parse(data);
      const event = new CustomEvent<CustomEventParams<StateType>>(this.eventName, {
        detail: {
          preData: storeData,
          curData: data, // 传递的数据
        },
      });
      window.dispatchEvent(event);
      localStorage.setItem(this.storeName, this.generateData(data));
    } catch (error) {
      console.error(`${this.key} 存储数据验证失败:`, error);
    }
  }
  setItem<T extends keyof StateType>(key: T, value: StateType[T]) {
    const storeData = this.getStoreData();
    const draftData = produce(storeData, (draft: StateType) => {
      draft[key] = value;
    });
    this.setStoreData(draftData);
  }
  getItem<T extends keyof StateType & string>(key: T): StateType[T] | undefined;
  getItem<T extends keyof StateType & string>(key: T, b: StateType[T]): StateType[T];
  getItem<T extends keyof StateType & string>(
    key: T,
    defaultValue?: StateType[T]
  ): StateType[T] | undefined {
    const storeData = this.getStoreData();
    return storeData[key] ?? defaultValue;
  }
  removeItem<T extends keyof StateType & string>(key: T) {
    const storeData = this.getStoreData();
    const draftData = produce(storeData, (draft) => {
      if (isObject(draft)) {
        Object.assign(draft, {
          [`${key}`]: undefined,
        });
      }
    });
    localStorage.setItem(this.storeName, this.generateData(draftData));
  }
  subscribe(callback: <TData = Partial<StateType>>(curData: TData, preData: TData) => void) {
    const handler = (env: Event) => {
      const { detail } = env as CustomEvent<CustomEventParams<StateType>>;
      callback(detail.curData, detail.preData);
    };
    window.addEventListener(this.eventName, handler);
    return () => window.removeEventListener(this.eventName, handler);
  }
}
export const createLocalStorageContainer = function <
  T extends ZodType<unknown, ZodTypeDef, unknown>,
>(storeName: string, schema: T) {
  return new StorageStore(storeName, schema);
};

/**
 * 用来存储数据的本地存储
 * @example
 *   const userPresetStorage = createLocalStorageContainer(
 *    'baihu-user-preset',
 *    z.object({
 *      addMarkOptions: z.array(z.string()),
 *    }),
 * );
 */
