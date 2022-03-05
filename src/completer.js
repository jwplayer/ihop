import { IHOP_PROXY_TAG } from './constants';

export default class Completer {
  constructor(router, promiseStore, proxySchema) {
    this.router = router;
    this.promiseStore = promiseStore;
    this.proxySchema = proxySchema;

    this.router.on('return', (...args) => this.completeReturn(...args));
  }

  completeReturn(message) {
    const { source, promiseId, error } = message;
    let { value } = message;

    // if value is a complex retained obj proxy schema:
    // reconstruct the proxy
    // start a finalization listener on any proxies created
    if (this.proxySchema.isSchema(value)) {
      // Finalization needs to be tracked so the references can be
      // deleted at the "source" node
      value = this.proxySchema.fromSchema(value, source, true);
    } else if (value && value[IHOP_PROXY_TAG]) {
      value = value[IHOP_PROXY_TAG];
    }

    if (typeof error === 'undefined') {
      this.promiseStore.acceptPromise(promiseId, value);
    } else {
      this.promiseStore.rejectPromise(promiseId, error);
    }
  }
}
