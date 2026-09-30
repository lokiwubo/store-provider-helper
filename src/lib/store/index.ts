/**
 * @fileoverview store 工具对外入口
 * 提供可响应式的 store 容器：支持 state / actions / getters、
 * 动态与静态容器、持久化容器以及 React hooks 集成。
 */

// 类型定义
export * from './types';
export * from './types/hooks';
export * from './types/shared';

// 容器核心
export { StoreContainer } from './core';

// 定义 store 的入口
export { definedDynamicStore, definedSessionStorageContainer, definedStaticStore } from './defined';

// 容器管理工具
export {
    DEFAULT_PRIMATE_KEY,
    destroyContainer,
    getAndRegistryContainer,
    getContainer,
    getRaw,
    isRegistryContainer
} from './helpers';

// React hooks
export { useContainer } from './hooks';

// 内部常量
export { DRAFT_STATE } from './constant';
