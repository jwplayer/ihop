const eventFunctions = ['addEventListener', 'removeEventListener', 'dispatchEvent'];

const prefixProperty = (propPrefix, prop) => {
  return propPrefix?.length ? `${propPrefix}.${prop}` : prop;
};

const handlerFactory = (localIhop, destNode, targetName, propPrefix) => {
  return {
    get (targetObj, targetProp, receiver) {
      if (typeof targetObj[targetProp] !== 'undefined' || targetProp === 'then') {
        if (typeof targetObj[targetProp] === 'function') {
          return targetObj[targetProp].bind(targetObj);
        }
        return targetObj[targetProp];
      }

      // For event functions, we just return them directly from the local object
      // if (eventFunctions.indexOf(prop) !== -1) {
      //   return target[prop].bind(target);
      // }

      //const [promiseId, promise] = localIhop.getTrackingPromise(target, prop, targetName, targetPath);

      const [promiseId, promise] = makePromise(targetObj, targetProp, localIhop, targetName, destNode, propPrefix);

      localIhop.doGet(targetName, prefixProperty(propPrefix, targetProp), destNode, localIhop.path, promiseId);

      //return promise;

      // This is a hack to make callable top level properties work without await
      const fnPromise = (...args) => {
        const [promiseId, promise] = makePromise(targetObj, targetProp, localIhop, targetName, destNode, propPrefix);

        localIhop.doCall(targetName, prefixProperty(propPrefix, targetProp), destNode, localIhop.path, promiseId, args);

        return promise;
      };
      fnPromise.then = promise.then.bind(promise);

      return fnPromise;
    },
    apply (targetObj, thisArg, args) {
      const [promiseId, promise] = makePromise(targetObj, '', localIhop, targetName, destNode, propPrefix);

      localIhop.doCall(targetName, propPrefix, destNode, localIhop.path, promiseId, args);

      return promise;
    },
    set (targetObj, targetProp, value) {
      const [promiseId, promise] = makePromise(targetObj, targetProp, localIhop, targetName, destNode, propPrefix);

      localIhop.doSet(targetName, prefixProperty(propPrefix, targetProp), destNode, localIhop.path, promiseId, value);

      return promise;
    }
  };
};

class ReturnTracker {
  constructor(promiseId, accept, reject, targetObj, targetProp, ihop, targetName, destNode, finalProp) {
    this.promiseId = promiseId;
    this.accept = accept;
    this.reject = reject;
    this.targetObj = targetObj;
    this.targetProp = targetProp;
    this.localIhop = ihop;
    this.targetName = targetName;
    this.destNode = destNode;
    this.finalProp = finalProp;
  }

  makeProxy() {
    // We can locally cache the proxies to reduce traffic for next-time
    const proxy = new ProxyEmitter(this.localIhop, this.destNode, this.targetName, this.finalProp);
    // this.targetObj[this.targetProp] = proxy;
    this.accept(proxy);
  }

  makeFunctionProxy() {
    // We can locally cache the proxies to reduce traffic for next-time
    const proxy = new Proxy(()=>{}, handlerFactory(this.localIhop, this.destNode, this.targetName, this.finalProp));
    // this.targetObj[this.targetProp] = proxy;
    this.accept(proxy);
  }
}

const makePromise = (targetObj, targetProp, localIhop, targetName, destNode, propPrefix) => {
  const promiseId = Math.random() * Number.MAX_SAFE_INTEGER;
  const promise = new Promise((accept, reject) => {
    const returnHelper = new ReturnTracker(
      promiseId,
      accept,
      reject,
      targetObj,
      targetProp,
      localIhop,
      targetName,
      destNode,
      prefixProperty(propPrefix, targetProp));

    localIhop.promises_.set(promiseId, returnHelper);
  });

  return [promiseId, promise];
};

// Used for all proxy's
export default class ProxyEmitter extends EventTarget {
  constructor(localIhop, targetPath, targetName, propPrefix) {
    super();
    const proxy = new Proxy(this, handlerFactory(localIhop, targetPath, targetName, propPrefix));

    return proxy;
  }
}
