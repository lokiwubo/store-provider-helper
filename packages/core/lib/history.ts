/**
 * @fileoverview 用来提供历史数据存储的接口
 */

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

type HistoryRecordData = {
  expires: number;
  data: AnyLike;
  initData: AnyLike;
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
  constructor() {
  }
  private get historyState() {
    return window.history.state;
  }
  private get state() {
    return get(this.historyState, constant["HISTORY_STORE_NAME"]) as
      | HistoryRecordData
      | undefined;
  }
  // 应该是理该当前页的时候创建 historyState
  public create(data: AnyLike, expires?: number) {
    const curDate = Date.now();
    const hash = createHash(data);
    const originState = this.state ?? {};
    const historyStorageState = Object.assign({
      [hash]: {
        key: hash,
        expires,
        data: data,
        initData: data,
        date: curDate,
      },
    });
    return Object.assign(originState, {
      [constant["HISTORY_STORE_NAME"]]: historyStorageState,
    });
  }
  setState = () => {
    //监听页面进入和离开
    window.addEventListener("popstate", () => {
      history.replaceState(
        this.create({}),
        window.document.title,
        window.location.href
      );
    });
  };
}

export const createHistoryContainer = () => {
  const historyStorage = new HistoryStorage();
  //页面离开或者刷新的时候执行的事件
  window.addEventListener('beforeunload', ()=>{

  });
  //监听页面进入和离开候执行的事件
  window.addEventListener("popstate", () => {
    history.replaceState(
      historyStorage.create({}),
      window.document.title,
      window.location.href
    );
  });
  return {
    definedHistory: ()=>{
      return 

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