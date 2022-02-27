const ProxyHandler = (router, promiseStore, destination, targetName) => {
  return {
    apply(targetObj, thisArgs, args, receiver) {
      // A trap for a function call
      // Arguments might need to be handled specially
      const [promiseId, promise] = promiseStore.makePromise();

      router.route({
        type: 'call',
        targetName,
        args,
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
      const [promiseId, promise] = promiseStore.makePromise();

      router.route({
        type: 'set',
        targetName,
        property,
        destination,
        value,
        from: router.name,
        source: router.path,
        promiseId
      });

      return promise;
    },

    setPrototypeOf() {
      // Throw?
    },
  };
}

export default ProxyHandler;
