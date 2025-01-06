/**
 * @fileoverview 用来提供历史数据存储的接口
 */
import { produce } from 'immer';
import { get } from 'lodash-es';
import type { AnyLike } from 'ts-utils-helper';
import { deepFreeze } from 'ts-utils-helper';
import { HISTORY_CUSTOM_EVENT_NAME } from './constants';
import { createHistoryRecordData, createProxyStoreData, shallowCompareValues } from './helper';
import { HistoryStorage } from './history';
import { CustomEventParams, HistoryRecordData, HistoryStructData } from './types';

export { createHash } from './helper';

const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

// 复写原有方法 打开新路由触发
history.pushState = function (...args) {
  originalPushState.apply(this, args);
  const event = new CustomEvent(HISTORY_CUSTOM_EVENT_NAME, { detail: { action: 'push' } });
  window.dispatchEvent(event);
};
// 复写原有会改变路
history.replaceState = function (...args) {
  originalReplaceState.apply(this, args);
  const event = new CustomEvent(HISTORY_CUSTOM_EVENT_NAME, { detail: { action: 'replace' } });
  window.dispatchEvent(event);
};

type HistorySubscriber = {
  key: string;
  callback: (data: AnyLike, preData?: AnyLike) => void;
};

export const createHistoryHelper = () => {
  const historyStorage = new HistoryStorage();
  const subscribes = new Set<HistorySubscriber>();
  /**
   * 创建代理对象
   * @param {object} data
   * @returns
   */
  const proxyStoreApi = (() => {
    let _proxyStoreData: HistoryStructData = historyStorage.getStore();
    return {
      get: () => _proxyStoreData,
      set: (data: HistoryStructData) => {
        _proxyStoreData = createProxyStoreData(data);
      },
      clear: () => {
        _proxyStoreData = createProxyStoreData({});
      },
    };
  })();

  const getItem = <TState>(key: string): HistoryRecordData<TState> | undefined =>
    deepFreeze(get(proxyStoreApi.get(), key));

  window.addEventListener(HISTORY_CUSTOM_EVENT_NAME, (env: Event) => {
    const { detail } = env as CustomEvent<CustomEventParams>;
    if (detail.action === 'push') {
      historyStorage.updateHistoryState(proxyStoreApi.get());
    } else {
      proxyStoreApi.set(historyStorage.getStore());
    }
  });

  //页面离开或者刷新的时候执行的事件
  window.addEventListener('beforeunload', () => {
    proxyStoreApi.clear();
    historyStorage.updateHistoryState(proxyStoreApi);
  });

  //监听页面后退和前进事件
  window.addEventListener('popstate', () => {
    // 还原页面数据
    proxyStoreApi.set(historyStorage.getStore());
  });

  return {
    setValue: <TData>(key: string, value: TData) => {
      const oldData = getItem(key)?.data;
      const isSame = shallowCompareValues(oldData, value);
      if (!isSame) {
        const newStoreData = produce(proxyStoreApi.get(), (draft) => {
          Object.assign(draft, {
            [key]: createHistoryRecordData(key, value),
          });
        });
        proxyStoreApi.set(newStoreData);
        subscribes.forEach((subscribe) => {
          if (subscribe.key === key) {
            subscribe.callback(value, oldData);
          }
        });
      }
      //监听页面进入和离开
    },
    getItem: getItem,
    getValue: (key: string): HistoryRecordData['data'] => getItem(key)?.['data'],
    removeItem: (key: string) => Reflect.deleteProperty(proxyStoreApi.get(), key),
    subscribe: <TData>(key: string, callback: (data: TData, preData?: TData) => void) => {
      const subscribe = {
        key,
        callback,
      };
      subscribes.add(subscribe);
      return () => {
        subscribes.delete(subscribe);
      };
    },
  };
};
