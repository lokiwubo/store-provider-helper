/**
 * @fileoverview 用来提供历史数据存储的接口
 */

import { isNull } from "lodash-es";

const constant = {
  HISTORY_KEY: "_HRecord",
  HISTORY_SESSION_KEYS: "SessionKeys",
};

export const createHistoryState = () => {
  // 1.url 中存在record key 的参数
  const recordKey = getHistoryParam(window.location.href);
  if (recordKey) {
    window.sessionStorage.setItem("history", JSON.stringify({}));
  }
  return {};
};

/**
 * @name 提取url中的history参数
 * @param {string} url
 * @returns {string | null}
 */
function getHistoryParam(url: string) {
  const urlObj = new URL(url);
  return urlObj.searchParams.get(constant["HISTORY_KEY"]);
}
/**
 *
 * @param recordKey
 * @returns {boolean} true: 存在说明是一个历史页面 false: 不存在说明是一个新增
 */
function hasHistoryRecordKeyFormSession(recordKey: string) {
  const historyRecordKeys = window.sessionStorage.getItem(
    constant["HISTORY_SESSION_KEYS"]
  );
  return isNull(historyRecordKeys) ? false : JSON.parse(historyRecordKeys);
}

function setHistoryRecord(recordKey: string, record: any) {
  const key = "";
  history.replaceState({ key: "value" }, "页面1");
  window.sessionStorage.setItem(recordKey, JSON.stringify(record));
}
