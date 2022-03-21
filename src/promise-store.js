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
    this.store = new Map(/*<uuid, weakref(promise)>*/);
    this.highWatermark = 100;
  }

  makePromise() {
    const promiseId = nanoid();
    const promise = Esimorp();

    this.store.set(promiseId, new WeakRef(promise));

    if (this.store.size > this.highWatermark) {
      this.cleanPromises();
      this.highWatermark = this.store.size * 2;
    }

    return [promiseId, promise];
  }

  // Remove any promises that no longer have a live reference
  // since they have been garbage collected.
  cleanPromises() {
    for (let [promiseId, promiseRef] of this.store) {
      if (promiseRef.deref() === null) {
        this.store.delete(promiseId);
      }
    }
  }

  getAndDeletePromise(promiseId) {
    const weakRef = this.store.get(promiseId);
    if (!weakRef) {
      return;
    }

    this.store.delete(promiseId);
    return weakRef.deref();
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
