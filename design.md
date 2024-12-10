## container 使用说明

```typescript
import { createStore } from "store-provider-helper";
/**
 *@param storeName 存储名称
 *@param context 存储上下文
 *
 */
const store = createStore("storeName", { services: {} });
// 注册模型
const model = store.defineModel(() => ({}));
```
