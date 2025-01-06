import type { AnyLike } from 'ts-utils-helper';

export type HistoryRecordData<TData = AnyLike> = {
  key: string;
  data: TData;
  date: number;
};
export type HistoryStructData = {
  [key: string]: HistoryRecordData;
};
export type CustomEventParams<TData = AnyLike> = {
  action: 'push' | 'replace';
  data: TData;
};

export type HistoryListener = {
  eventName: 'refresh';
  callback: () => void;
};
