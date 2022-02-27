export default class Reflector {
  constructor(router, exportStore) {
    this.router = router;
    this.exportStore = exportStore;

    this.router.on('get', (message) => this.onGet(message));
    this.router.on('set', (message) => this.onSet(message));
    this.router.on('call', (message) => this.onCall(message));
  }

  findExport() {

  }

  doReturn (message, value, error) {
    const { source, promiseId} = message;

    this.router.route({
      type: 'return',
      destination: source,
      promiseId,
      value,
      error,
      from: this.router.name,
      source: this.router.path,
      promiseId
    });
  }

  async onGet(message) {
    const {targetName, property } = message;

    try {
      const propertyPath = property.split('.');
      let value = this.exportStore.get(targetName);

      if (!value) {
        return this.doReturn(message, undefined);
      }

      for (let prop of propertyPath) {
        value = await Reflect.get(value, prop);
      }

      this.doReturn(message, value);
    } catch (error) {
      this.doReturn(message, undefined, error);
    }
  }

  async onCall(message) {
    const {targetName, args } = message;

    try {
      const target = this.exportStore.get(targetName);

      if (!target) {
        return this.doReturn(message, undefined);
      }

      const value = await Reflect.apply(target, undefined, args);

      this.doReturn(message, value);
    } catch (error) {
      this.doReturn(message, undefined, error);
    }
  }

  async onSet(message) {
    const {targetName, property, value } = message;

    try {
      const propertyPath = property.split('.');
      const lastProp = propertyPath.pop();
      let target = this.exportStore.get(targetName);

      if (!target) {
        return this.doReturn(message, undefined);
      }

      for (let prop of propertyPath) {
        target = await Reflect.get(target, prop);
      }
      await Reflect.set(target, lastProp, value);
      this.doReturn(message, value);
    } catch (error) {
      this.doReturn(message, undefined, error);
    }
  }
}
