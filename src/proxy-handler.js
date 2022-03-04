import isStructuredCloneable from './is-structured-cloneable';

const ProxyHandler = (router, promiseStore, proxySchema, destination, targetName) => {
  return {
    apply(targetFn, thisArgs, args, receiver) {
      // A trap for a function call
      // Arguments might need to be handled specially
      const [promiseId, promise] = promiseStore.makePromise();

      // if one of the arguments is a function - ie. a callback:
      // 1) store function locally in a store and get a uuid
      // 2) replace argument with uuid
      const safeArgs = args.map((arg) => {
        if (isStructuredCloneable(arg)) {
          return arg;
        }
        if (!(arg instanceof Event)) {
          return proxySchema.toSchema(arg);
        }
      });

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

    construct() {
      // Throw?
    },

    defineProperty() {
      // Throw?
    },

    deleteProperty() {

    },

    get(targetObj, property, receiver) {
      const propType = typeof targetObj[property];

      if (propType === 'object' || propType === 'function') {
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
    },
  };
}

export default ProxyHandler;
