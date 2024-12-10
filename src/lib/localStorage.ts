import { Draft, produce } from "immer";
import { z, ZodType, ZodTypeDef } from "zod";
export interface CustomEventParams<T, TPartial = Partial<T>> {
  data: TPartial;
  nextData: TPartial;
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
export function createStorage<T extends ZodType<unknown, ZodTypeDef, unknown>>(
  storeName: string,
  schema: T
) {
  type StateType = z.infer<typeof schema>;
  type StateKeyUnion = keyof StateType & string;
  return new (class StorageStore {
    public key = storeName;
    public eventName = `${this.key}-event-storage`;
    private generateData(storeData: StateType): string {
      return JSON.stringify({
        date: Date.now(),
        state: storeData,
      });
    }
    public getStoreData() {
      return (
        JSON.parse(
          localStorage.getItem(storeName) ?? this.generateData({})
        ) as { state: Partial<StateType>; date: number }
      ).state;
    }
    setItem<T extends StateKeyUnion>(key: T, value: StateType[T]) {
      const storeData = this.getStoreData();
      const draftData = produce(storeData, (draft) => {
        draft[key] = value as Draft<Partial<StateType[T]>>[T];
      });
      try {
        schema.parse(draftData);
        const event = new CustomEvent<CustomEventParams<StateType>>(
          this.eventName,
          {
            detail: {
              data: storeData,
              nextData: draftData, // 传递的数据
            },
          }
        );
        window.dispatchEvent(event);
        localStorage.setItem(storeName, this.generateData(draftData));
      } catch (error) {
        console.error(`${this.key} 存储数据验证失败:`, error);
      }
    }
    getItem<T extends StateKeyUnion>(key: T): StateType[T] | undefined;
    getItem<T extends StateKeyUnion>(key: T, b: StateType[T]): StateType[T];
    getItem<T extends StateKeyUnion>(
      key: T,
      defaultValue?: StateType[T]
    ): StateType[T] | undefined {
      const storeData = this.getStoreData();
      return storeData[key] ?? defaultValue;
    }
    removeItem<T extends StateKeyUnion>(key: T) {
      const storeData = this.getStoreData();
      const draftData = produce(storeData, (draft) => {
        Object.assign(draft, {
          [key]: undefined,
        });
      });
      localStorage.setItem(storeName, this.generateData(draftData));
    }
    subscribe(callback: () => void) {
      window.addEventListener(this.eventName, () => {
        callback();
      });
      return () => window.removeEventListener(this.eventName, callback);
    }
  })();
}
