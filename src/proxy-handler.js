import isStructuredCloneable from './is-structured-cloneable.js';
import { IHOP_PROXY_TAG } from './constants.js';

const ProxyHandler = (router, promiseStore, proxySchema, destination, targetName) => {
  const sanitizeArgs = (args) => {
    // if one of the arguments is a function - ie. a callback:
    // 1) store function locally in a store and get a uuid
    // 2) replace argument with uuid
    return args.map((arg) => {
      if (isStructuredCloneable(arg)) {
        return arg;
      }
      return proxySchema.toSchema(arg);
    });
  };

  return {
    apply(targetFn, thisArgs, args, receiver) {
      // A trap for a function call
      // Arguments might need to be handled specially
      const [promiseId, promise] = promiseStore.makePromise();
      const safeArgs = sanitizeArgs(args);

      router.route({
        type: 'call',
        targetName,
        args: safeArgs,
        destination,
        from: router.name,
        source: router.path,
        promiseId,
      });

      return promise;
    },

    construct(targetObj, args, newTarget) {
      const [promiseId, promise] = promiseStore.makePromise();
      const safeArgs = sanitizeArgs(args);

      // Throw?
      router.route({
        type: 'new',
        targetName,
        args: safeArgs,
        destination,
        from: router.name,
        source: router.path,
        promiseId,
      });

      return promise;
    },

    defineProperty() {
      // Throw?
    },

    deleteProperty() {
      return false;
    },

    get(targetObj, property, receiver) {
      const propType = typeof targetObj[property];

      if (property === IHOP_PROXY_TAG || (propType === 'object' && !targetObj[property][IHOP_PROXY_TAG]) || propType === 'function') {
        return targetObj[property];
      }
      // The engine checks if the proxy is thenable and this results in
      // spurious messages being sent if we don't "blackhole" then.
      // Because of the above check, we WILL still respond to then if it is
      // on the proxy
      if (property === 'then') {
        return;
      }

      const [promiseId, promise] = promiseStore.makePromise();

      router.route({
        type: 'get',
        targetName,
        property,
        destination,
        from: router.name,
        source: router.path,
        promiseId,
      });

      return promise;
    },

    getOwnPropertyDescriptor() {
      // Throw?
    },

    getPrototypeOf() {

    },

    has() {

    },

    isExtensible() {
      // Throw?
    },

    ownKeys() {
      // Throw?
    },

    preventExtensions() {
      // Throw?
    },

    set(targetObj, property, value) {
      // const [promiseId, promise] = promiseStore.makePromise();

      router.route({
        type: 'set',
        targetName,
        property,
        destination,
        value,
        from: router.name,
        source: router.path,
      });

      return true;
    },

    setPrototypeOf() {
      // Throw?
      return false;
    },
  };
}

export default ProxyHandler;
