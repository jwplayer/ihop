import isStructuredCloneable from '../util/is-structured-cloneable.js';
import { IHOP_PROXY_TAG } from '../util/constants.js';

const proxyHandlerFactory = (router, promiseStore, proxySchema, destination, targetName) => {
  const { name: from, path: source } = router;

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

  const doApplyOrConstruct = (type, unsafeArgs = []) => {
    const [promiseId, promise] = promiseStore.makePromise();
    // Arguments might need to be handled specially
    const args = sanitizeArgs(unsafeArgs);

    router.route({
      type,
      targetName,
      args,
      destination,
      from,
      source,
      promiseId,
    });

    return promise;
  };

  return {
    apply(targetFn, thisArgs, args, receiver) {
      // A trap for a function call
      return doApplyOrConstruct('call', args);
    },

    construct(targetObj, args, newTarget) {
      // A trap for the new operator
      return doApplyOrConstruct('new', args);
    },

    defineProperty() {
      // Throw?
      return false;
    },

    deleteProperty() {
      // TODO:
      // We can't actually return a promise from this only boolean :(
      // So we pretend the delete always succeeds
      return true;
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
        from,
        source,
        promiseId,
      });

      return promise;
    },

    getOwnPropertyDescriptor() {
      // This is possible
    },

    getPrototypeOf() {
      // TODO:
      // This is possible with two caveats:
      //   1. `instanceof` will not work
      //   2. `Object#isPrototypeOf` will not work

      // For example:
      //   obj = {};
      //    p = new Proxy(obj, {
      //       getPrototypeOf(target) {
      //           return Promise.resolve(Array.prototype);
      //       }
      //   });
      //   console.log(
      //       await Object.getPrototypeOf(p) === Array.prototype,  // true
      //       await Reflect.getPrototypeOf(p) === Array.prototype, // true
      //       await p.__proto__ === Array.prototype,               // true
      //       Array.prototype.isPrototypeOf(p),              // FALSE!!
      //       p instanceof Array                             // FALSE!!
      //   );
    },

    has() {
      // Throw?
      // I don't think you can return anything other than boolean
      throw new SyntaxError('You can not use `in` operator with remote proxies.');
    },

    isExtensible() {
      // Throw?
      // I don't think you can return anything other than boolean
      return true;
    },

    ownKeys() {
      // Throw?
      // I don't think you can return anything other than array of strings

      // Object.getOwnPropertyNames and Object.keys seem to coerce
      // the promise into an empty array.
    },

    preventExtensions() {
      // Throw?
      // I don't think you can return anything other than boolean
      return false;
    },

    set(targetObj, property, value) {
      // We can't actually return a promise from this only boolean :(
      // So we pretend the set always works

      router.route({
        type: 'set',
        targetName,
        property,
        destination,
        value,
        from,
        source,
      });

      return true;
    },

    setPrototypeOf() {
      // Throw?
      return false;
    },
  };
};

export default proxyHandlerFactory;
