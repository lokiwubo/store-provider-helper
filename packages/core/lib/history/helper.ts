/**
 * @fileoverview 用来提供历史数据存储的接口
 */
import { AnyLike, ObjectLike, shallow } from 'ts-utils-helper';
import { HistoryRecordData } from './types';
export const createHash = (data: AnyLike) => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `${hash.toString(32)}`;
};

export const createProxyStoreData = <TData extends ObjectLike>(data: TData) => {
  return new Proxy(data, {
    set(obj, prop, value, receiver) {
      const oldValue = Reflect.get(obj, prop, receiver);
      if (!shallowCompareValues(oldValue, value)) {
        const isSet = Reflect.set(obj, prop, value, receiver);
        return isSet;
      }
      return false;
    },
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value === 'object' && value !== null) {
        return createProxyStoreData(value);
      }
      return value;
    },
    deleteProperty(obj, prop) {
      const isDelete = Reflect.deleteProperty(obj, prop);
      return isDelete;
    },
  });
};

export const createHistoryRecordData = <TData>(
  key: string,
  data: TData,
): HistoryRecordData<TData> => {
  const date = Date.now();
  return {
    key,
    data,
    date,
  };
};

export function shallowCompareValues(value1: unknown, value2: unknown) {
  const type1 = typeof value1;
  const type2 = typeof value2;
  if (type1 !== type2) {
    return false;
  }
  switch (type1) {
    case 'object':
      return shallow(value1, value2);
    case 'string':
    case 'number':
    case 'boolean':
      // 对于基本类型，直接比较值
      return value1 === value2;

    default:
      return value1 === value2;
  }
}
