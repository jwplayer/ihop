import isStructuredCloneable from '../util/is-structured-cloneable.js';

const noop = () => {};

export default class Reflector {
  constructor (router, proxySchema, retainedStore) {
    this.router = router;
    this.proxySchema = proxySchema;
    this.retainedStore = retainedStore;

    this.router.on('get', (message) => this.onGet(message));
    this.router.on('set', (message) => this.onSet(message));
    this.router.on('call', (message) => this.onCall(message));
    this.router.on('new', (message) => this.onNew(message));
  }

  makeArgs_ (args, source) {
    // Arguments can be either a value or a ProxySchema
    return args.map((arg) => {
      if (!this.proxySchema.isSchema(arg)) {
        return arg;
      }

      // If the argument is a ProxySchema then generate a proxy
      // Finalization needs to be tracked so the references can be
      // deleted at the "source" node
      const proxy = this.proxySchema.fromSchema(arg, source, true);

      return proxy;
    });
  }

  doReturn (message, value, error, forceProxy = false) {
    const { source, promiseId } = message;

    if (forceProxy || !isStructuredCloneable(value)) {
      value = this.proxySchema.toSchema(value);
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

  async onGet (message) {
    const { targetName, property } = message;

    try {
      // const propertyPath = property.split('.');
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

  async onCall (message) {
    const { targetName, args, source } = message;
    const newArgs = this.makeArgs_(args, source);

    try {
      const target = this.retainedStore.get(targetName);

      if (!target) {
        // Should probably return an exception
        return this.doReturn(message, undefined);
      }

      const value = await Reflect.apply(target, undefined, newArgs);

      // if value is complex (not cloneable):
      // retain it and generate a proxy schema for it
      // send schema as value

      this.doReturn(message, value);
    } catch (error) {
      this.doReturn(message, undefined, error);
    }
  }

  async onNew (message) {
    const { targetName, args, source } = message;
    const newArgs = this.makeArgs_(args, source);

    try {
      const target = this.retainedStore.get(targetName);

      if (!target) {
        // Should probably return an exception
        return this.doReturn(message, undefined);
      }

      const value = await Reflect.construct(target, newArgs);

      // if value is complex (not cloneable):
      // retain it and generate a proxy schema for it
      // send schema as value

      this.doReturn(message, value, undefined, true);
    } catch (error) {
      this.doReturn(message, undefined, error);
    }
  }

  async onSet (message) {
    const { targetName, property, value } = message;

    try {
      const target = this.retainedStore.get(targetName);

      Reflect.set(target, property, value);
    } catch (error) {
      noop(error);
    }
  }
}
