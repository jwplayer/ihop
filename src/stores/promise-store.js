import { nanoid } from 'nanoid';

// Backwards promise - resolvable from outside
const Esimorp = () => {
  let resolve, reject;
  const promise = new Promise((...args) => {
    [resolve, reject] = args;
  });
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
};

export default class PromiseStore {
  constructor() {
    this.store = new Map(/*<uuid, promise>*/);
  }

  makePromise() {
    const promiseId = nanoid();
    const promise = Esimorp();

    this.store.set(promiseId, promise);

    return [promiseId, promise];
  }

  getAndDeletePromise(promiseId) {
    const promise = this.store.get(promiseId);

    if (!promise) {
      return;
    }

    this.store.delete(promiseId);
    return promise;
  }

  resolvePromise(promiseId, value) {
    const promise = this.getAndDeletePromise(promiseId);

    if (promise) {
      return promise.resolve(value);
    }
  }

  rejectPromise(promiseId, value) {
    const promise = this.getAndDeletePromise(promiseId);

    if (promise) {
      return promise.reject(value);
    }
  }
}
