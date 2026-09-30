import { describe, expect, it, vi } from 'vitest';

import { definedDynamicStore, definedStaticStore, getRaw } from './index';

/** 等待一个宏任务，让调度器内的微任务全部执行完毕 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('definedStaticStore', () => {
    it('初始化 state 并支持读取', () => {
        const store = definedStaticStore({
            state: () => ({ count: 0, name: 'loki' }),
        });

        const container = store();
        expect(container.state.count).toBe(0);
        expect(container.state.name).toBe('loki');
    });

    it('setState 支持对象形式的局部更新', async () => {
        const store = definedStaticStore({
            state: () => ({ count: 0, name: 'loki' }),
        });

        const container = store();
        await container.setState({ count: 1 });
        await flush();

        expect(container.state.count).toBe(1);
        expect(container.state.name).toBe('loki');
    });

    it('setState 支持函数形式更新', async () => {
        const store = definedStaticStore({
            state: () => ({ count: 0 }),
        });

        const container = store();
        await container.setState((state) => {
            state.count += 10;
        });
        await flush();

        expect(container.state.count).toBe(10);
    });

    it('subscribeStateChange 在 state 变化时触发', async () => {
        const store = definedStaticStore({
            state: () => ({ count: 0 }),
        });

        const container = store();
        const onChange = vi.fn();
        container.subscribeStateChange({ onChange });

        await container.setState({ count: 1 });
        await flush();

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0]?.[0]).toMatchObject({ count: 1 });
    });

    it('支持 select 与 equal 选择器订阅', async () => {
        const store = definedStaticStore({
            state: () => ({ count: 0, name: 'loki' }),
        });

        const container = store();
        const onChange = vi.fn();
        container.subscribeStateChange({
            select: (state) => state.count,
            onChange,
        });

        // name 变化不应触发 count 的订阅
        await container.setState({ name: 'change' });
        await flush();
        expect(onChange).toHaveBeenCalledTimes(0);

        await container.setState({ count: 2 });
        await flush();
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0]?.[0]).toBe(2);
    });

    it('getRaw 返回原始数据对象', () => {
        const store = definedStaticStore({
            state: () => ({ count: 0 }),
        });

        const container = store();
        const raw = getRaw(container.state);
        expect(raw).toEqual({ count: 0 });
    });
});

describe('actions', () => {
    it('支持同步 action 并可通过 this 访问容器', async () => {
        const store = definedStaticStore({
            state: () => ({ count: 0 }),
            actions: () => ({
                increment() {
                    this.setState({ count: this.state.count + 1 });
                },
            }),
        });

        const container = store();
        container.actions.increment();
        await flush();

        expect(container.state.count).toBe(1);
    });

    it('subscribeActionRun 在 action 执行后触发', () => {
        const store = definedStaticStore({
            state: () => ({ count: 0 }),
            actions: () => ({
                add(step: number) {
                    return this.state.count + step;
                },
            }),
        });

        const container = store();
        const listener = vi.fn();
        container.subscribeActionRun('add', listener);

        container.actions.add(3);
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

describe('getters', () => {
    it('返回计算值', () => {
        const store = definedStaticStore({
            state: () => ({ count: 2 }),
            getters: () => ({
                double() {
                    return this.state.count * 2;
                },
            }),
        });

        const container = store();
        expect(container.getters.double).toBe(4);
    });

    it('state 变化后 getter 重新计算并通知订阅者', async () => {
        const store = definedStaticStore({
            state: () => ({ count: 2 }),
            getters: () => ({
                double() {
                    return this.state.count * 2;
                },
            }),
        });

        const container = store();
        expect(container.getters.double).toBe(4);

        const onChange = vi.fn();
        container.subscribeGetterChange({
            select: (getters) => getters.double,
            onChange,
        });

        await container.setState({ count: 3 });
        await flush();

        expect(container.getters.double).toBe(6);
        expect(onChange).toHaveBeenCalled();
        expect(onChange.mock.calls[0]?.[0]).toBe(6);
    });
});

describe('definedDynamicStore', () => {
    it('不同 key 对应不同实例', () => {
        const store = definedDynamicStore({
            state: () => ({ count: 0 }),
        });

        const a = store('a');
        const b = store('b');

        expect(a).not.toBe(b);
    });

    it('相同 key 返回相同实例', () => {
        const store = definedDynamicStore({
            state: () => ({ count: 0 }),
        });

        const a1 = store('a');
        const a2 = store('a');
        expect(a1).toBe(a2);
    });
});
