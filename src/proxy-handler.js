import { nanoid } from 'nanoid';

const ProxyHandler = (router, promiseStore, retainedStore, destination, targetName) => {
  return {
    apply(targetFn, thisArgs, args, receiver) {
      // A trap for a function call
      // Arguments might need to be handled specially
      const [promiseId, promise] = promiseStore.makePromise();

      // if one of the arguments is a function - ie. a callback:
      // 1) store function locally in a store and get a uuid
      // 2) replace argument with uuid
      const sansFunctions = args.map((arg) => {
        if (typeof arg !== 'function') {
          return arg;
        }
        let functionId =retainedStore.find(arg);
        if (!functionId) {
          functionId = nanoid();
          retainedStore.set(functionId, arg);
        }
        return `@function.${functionId}`;
      });

      router.route({
        type: 'call',
        targetName,
        args: sansFunctions,
        destination,
        from: router.name,
        source: router.path,
        promiseId
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
      const [promiseId, promise] = promiseStore.makePromise();

      router.route({
        type: 'get',
        targetName,
        property,
        destination,
        from: router.name,
        source: router.path,
        promiseId
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
        // promiseId
      });

      return true;
    },

    setPrototypeOf() {
      // Throw?
    },
  };
}

export default ProxyHandler;
