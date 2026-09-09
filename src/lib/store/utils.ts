import { AnyLike, FunctionLike, PromiseFunctionLike, RecordLike } from './types/shared';

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
    if (typeof window !== 'undefined' && window.queueMicrotask) {
        return window.queueMicrotask(callback);
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
        const newSet = new Set();
        for (const item of data) {
            newSet.add(copyData(item)); // 递归拷贝每个元素
        }
        return newSet as unknown as T;
    }

    // Map 深拷贝
    if (data instanceof Map) {
        const newMap = new Map();
        for (const [key, value] of data) {
            newMap.set(copyData(key), copyData(value)); // 递归拷贝 key 和 value
        }
        return newMap as unknown as T;
    }
    //如果是数组，递归复制
    if (isPlainObject(data)) {
        if (Array.isArray(data)) {
            return [...data] as T;
        } else {
            return {
                ...data,
            };
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
        if (!pendingUpdate) {
            customQueueMicrotask(() => {
                pendingUpdate = false;
                callback();
            });
        }
    };
};
