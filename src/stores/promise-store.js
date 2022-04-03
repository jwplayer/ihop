import { nanoid } from 'nanoid';
import esimorp from '../util/esimorp.js';

export default class PromiseStore {
  constructor () {
    this.store = new Map(/* <uuid, promise> */);
  }

  makePromise () {
    const promiseId = nanoid();
    const promise = esimorp();

    this.store.set(promiseId, promise);

    return [promiseId, promise];
  }

  getAndDeletePromise (promiseId) {
    const promise = this.store.get(promiseId);

    if (!promise) {
      return;
    }

    this.store.delete(promiseId);
    return promise;
  }

  resolvePromise (promiseId, value) {
    const promise = this.getAndDeletePromise(promiseId);

    if (promise) {
      return promise.resolve(value);
    }
  }

  rejectPromise (promiseId, value) {
    const promise = this.getAndDeletePromise(promiseId);

    if (promise) {
      return promise.reject(value);
    }
  }
}
