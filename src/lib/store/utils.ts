import type { AnyLike, FunctionLike, PromiseFunctionLike, RecordLike } from './types/shared';

export const mergeOptionsToFunction = <T extends FunctionLike, U extends {}>(fun: T, options: U) =>
  Object.assign(fun, options) as T & U;
/**
 * @description 过滤数组里的空值
 * @param {any[]} arr
 * @returns
 */
export function filterNonNullish<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter((e) => e != null) as T[];
}

export function isAsyncFunction(value: FunctionLike): value is PromiseFunctionLike {
  return Object.prototype.toString.call(value) === '[object AsyncFunction]';
}

/**
 * @description 调度器
 */
export function customQueueMicrotask(callback: FunctionLike) {
  if (typeof global !== 'undefined' && global.queueMicrotask) {
    return global.queueMicrotask(callback);
  }
  return Promise.resolve().then(callback);
}

export function assertNoNullable<T>(data: T | null | undefined): asserts data {
  if (data === null || data === undefined) {
    throw new Error('data is null or undefined');
  }
}

export const isPlainObject = (obj: AnyLike): obj is RecordLike => {
  return typeof obj === 'object' && obj !== null;
};

/** 浅拷贝 */
export function copyData<T>(data: T): T {
  // 处理 Date
  if (data instanceof Date) {
    return new Date(data.getTime()) as unknown as T;
  }
  if (data instanceof RegExp) {
    return new RegExp(data.source, data.flags) as unknown as T;
  }
  if (data instanceof Set) {
    return new Set(data) as T;
  }
  // Map 深拷贝
  if (data instanceof Map) {
    return new Map(data) as T;
  }

  //如果是数组，递归复制
  if (isPlainObject(data)) {
    if (Array.isArray(data)) {
      return [...data] as T;
    } else {
      return Object.assign(Object.create(Object.getPrototypeOf(data)), data);
    }
  }
  return data;
}
/**
 * 避免重复执行调度任务
 */
export const createSameScheduleTask = () => {
  let pendingUpdate = false;
  return (callback: FunctionLike) => {
    // 已经存在待执行的调度任务则直接返回，避免同一轮内重复调度
    if (pendingUpdate) return;
    pendingUpdate = true;
    customQueueMicrotask(() => {
      pendingUpdate = false;
      callback();
    });
  };
};

/**
 * 创建一个受控的延迟执行任务
 * @param {Function} fn - 待执行的函数
 * @param {Number} interval - 间隔时间。
 */
export const createScheduledTask = <T extends FunctionLike>(fn: T, interval: number = 3) => {
  let timerId: number | null = null; // 用于 RAF 的 ID

  let currentFrame = 0;
  const run = (...args: Parameters<T>) => {
    // 模式二：固定帧数模式（基于 requestAnimationFrame）
    const frames = typeof interval === 'number' ? Math.max(1, interval) : 1;

    const tick = () => {
      currentFrame++;
      if (currentFrame >= frames) {
        fn(...args);
        timerId = null;
      } else {
        timerId = requestAnimationFrame(tick);
      }
    };

    timerId = requestAnimationFrame(tick);
  };

  const cancel = () => {
    currentFrame = 0;
    if (timerId !== null) {
      cancelAnimationFrame(timerId);
      timerId = null;
    }
  };

  return { run, cancel };
};
