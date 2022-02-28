import ProxyHandler from './proxy-handler';
import isStructuredCloneable from './is-structured-cloneable';

const noop = () => {};

export default class Reflector {
  constructor(router, promiseStore, retainedStore) {
    this.router = router;
    this.promiseStore = promiseStore;
    this.retainedStore = retainedStore;

    this.router.on('get', (message) => this.onGet(message));
    this.router.on('set', (message) => this.onSet(message));
    this.router.on('call', (message) => this.onCall(message));
    this.finalizationRegistry = new FinalizationRegistry((heldValue) => this.onFinalization(heldValue));
  }

  doReturn (message, value, error) {
    const { source, promiseId} = message;

    if (!isStructuredCloneable(value)) {
      value = 'todo';
    }

    this.router.route({
      type: 'return',
      destination: source,
      value,
      error,
      from: this.router.name,
      source: this.router.path,
      promiseId
    });
  }

  onFinalization(heldValue) {
    const { destination, functionId } = heldValue;

    this.router.route({
      type: 'final',
      destination,
      functionId,
      from: this.router.name,
      source: this.router.path
    });
  }

  async onGet(message) {
    const {targetName, property } = message;

    try {
      //const propertyPath = property.split('.');
      const target = this.retainedStore.get(targetName);

      if (!target) {
        return this.doReturn(message, undefined);
      }

      const value = await Reflect.get(target, property);

      this.doReturn(message, value);
    } catch (error) {
      this.doReturn(message, undefined, error);
    }
  }

  async onCall(message) {
    const {targetName, args, source } = message;
    // if any arguments are functions - ie. callbacks:
    // 1) get the remote function id
    // 2) generate proxy function that calls to that id
    // 3) replace parameter with proxy

    try {
      const newArgs = args.map((arg) => {
        if (typeof arg !== 'string' || arg.indexOf('@function.') === -1) {
          return arg;
        }
        const functionId = arg.slice(10);
        const proxy = new Proxy(noop, ProxyHandler(this.router, this.promiseStore, this.retainedStore, source, functionId));

        this.finalizationRegistry.register(proxy, {
          destination: source,
          functionId
        });

        return proxy;
      });

      const target = this.retainedStore.get(targetName);
      if (!target) {
        return this.doReturn(message, undefined);
      }

      const value = await Reflect.apply(target, undefined, newArgs);

      this.doReturn(message, value);
    } catch (error) {
      this.doReturn(message, undefined, error);
    }
  }

  async onSet(message) {
    const {targetName, property, value } = message;

    try {
      const target = this.retainedStore.get(targetName);

      if (!target) {
        return this.doReturn(message, undefined);
      }

      Reflect.set(target, property, value);
      this.doReturn(message, value);
    } catch (error) {
      this.doReturn(message, undefined, error);
    }
  }
}
