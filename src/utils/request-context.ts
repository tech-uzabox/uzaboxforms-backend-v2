import { AsyncLocalStorage } from 'node:async_hooks';

type CtxStore = {
  userId?: string;
};

const storage = new AsyncLocalStorage<CtxStore>();

export const RequestContext = {
  run<T>(value: CtxStore, callback: () => T) {
    return storage.run(value, callback);
  },
  getStore(): CtxStore | undefined {
    return storage.getStore();
  },
  getUserId(): string | undefined {
    return storage.getStore()?.userId;
  },
  setUserId(userId?: string) {
    const store = storage.getStore();
    if (store) store.userId = userId;
  },
};


