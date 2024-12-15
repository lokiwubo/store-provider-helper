/**
 * @fileoverview 用来提供历史数据存储的接口
 */

import { produce } from "immer";
import { get } from "lodash-es";
import { AnyLike } from "ts-utils-helper";

const constant = {
  HISTORY_QUERY_KEY: "_HSK",
  HISTORY_SESSION_KEYS: "SessionKeys",
  HISTORY_STORE_NAME: "historyProvider",
};

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
export type HistoryState <TData> = TData | (() => TData);


type HistoryRecordData<TData = AnyLike> = {
  expires: number;
  data: TData;
  date: Date;
};
/**
 * @name 历史记录存储器
 * @description 执行时间点只在离开页面前触发 
 * @description 存储的数据结构
 *  state: {
 *    ...originState, // 原有数据
 *    [HISTORY_STORE_NAME]: {
 *      [hashKey]: HistoryRecordData
 *    }
 *  }
 */
class HistoryStorage {
  constructor(private name: string) {
  }
  private get historyState() {
    return window.history.state;
  }
  private get storeState() {
    return get(this.historyState, constant["HISTORY_STORE_NAME"]) as
      | HistoryRecordData
      | undefined;
  }
  private updateHistoryState = (state: AnyLike) => {
    const storeState = this.storeState ?? {};
    const replaceState = Object.assign(storeState, {
      [constant["HISTORY_STORE_NAME"]]: state,
    })
    history.replaceState(
      replaceState,
      window.document.title,
      window.location.href
    );
    window.history.replaceState(state, window.document.title, window.location.href);
  };
  setState = <TData>(key: string, value: TData) => {
    //监听页面进入和离开
    const curDate = Date.now();
    const storeState = this.storeState ?? {};
    const historyStorageState = Object.assign(storeState,{
      [key]: {
        key,
        data: value,
        date: curDate,
      },
    });
    this.updateHistoryState(historyStorageState)
    
  };
  getState = <TState>(key: string) => {
    return get(this.storeState, key) as HistoryRecordData<TState>;
  };
  clearState = ():void => {
    return this.updateHistoryState(undefined)
  }
}

export const createHistoryContainer = (name: string) => {
  const historyStorage = new HistoryStorage(name);
  //页面离开或者刷新的时候执行的事件
  window.addEventListener('beforeunload', ()=>{
    historyStorage.clearState()
  });
  //监听页面进入和离开候执行的事件
  window.addEventListener("popstate", () => {
    history.replaceState(
      {},
      window.document.title,
      window.location.href
    );
  });

  return {
    getState: <TState>(getState: HistoryState<TState>):TState=>{
      const defaultState = getState?.() | getState;
      return historyStorage.getState<TState>(createHash(defaultState)).data;
    }
  };
};


/**
 *  const  asdHistoryStorage = createHistoryStorage("asd");
 *  const [data, setDate] = useHistoryStorage(()=>({}) || {},  options)
 *  options = {
 *    expires: 1000 * 60 * 60 * 24 * 7, => "1day" || "1hour" || "1minute" || "1second"  || "1week" || "1month" || "1year" || number(ms)
 *  }
 */