import { nanoid } from 'nanoid';

// Backwards promise - resolvable from outside
const Esimorp = () => {
  let accept, reject;
  const promise = new Promise((...args) => {
    [accept, reject] = args;
  });
  promise.doAccept = accept;
  promise.doReject = reject;
  return promise;
};

export default class PromiseStore {
  constructor() {
    this.store = new Map(/*<uuid, weakref(promise)>*/);
    this.highWatermark = 1;
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

  acceptPromise(promiseId, value) {
    const promise = this.getAndDeletePromise(promiseId);
    if (promise) {
      promise.doAccept(value);
    }
  }

  rejectPromise(promiseId, value) {
    const promise = this.getAndDeletePromise(promiseId);
    if (promise) {
      promise.doReject(value);
    }
  }
}
