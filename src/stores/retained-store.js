export default class RetainedStore {
  constructor () {
    this.keyToObj = new Map();
    this.objToKey = new WeakMap();
  }

  get (key) {
    return this.keyToObj.get(key);
  }

  find (obj) {
    return this.objToKey.get(obj);
  }

  set (key, obj) {
    this.keyToObj.set(key, obj);
    this.objToKey.set(obj, key);
  }

  delete (key) {
    const obj = this.keyToObj.get(key);
    this.keyToObj.delete(key);
    this.objToKey.delete(obj);
  }
}
