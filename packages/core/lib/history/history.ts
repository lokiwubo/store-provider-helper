import { get } from 'lodash-es';
import { HistoryStructData } from './types';
import { HISTORY_STORE_NAME } from './constants';
import { AnyLike } from 'ts-utils-helper';
import { produce } from 'immer';

export class HistoryStorage {
  private get historyState() {
    return window.history.state;
  }
  private get storeData() {
    return get(this.historyState, HISTORY_STORE_NAME) as HistoryStructData | undefined;
  }
  updateHistoryState = (state: AnyLike) => {
    const historyState = this.historyState ?? {};
    const replaceState = Object.assign(historyState, {
      [HISTORY_STORE_NAME]: state,
    });
    history.replaceState(replaceState, window.document.title, window.location.href);
  };
  getStore = () => {
    return produce(this.storeData ?? {}, (draft) => draft);
  };
  clearStore = (): void => {
    return this.updateHistoryState(undefined);
  };
}
