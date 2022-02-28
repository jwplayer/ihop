export default class Completer {
  constructor(router, promiseStore, retainedStore) {
    this.router = router;
    this.promiseStore = promiseStore;
    this.retainedStore = retainedStore;

    this.router.on('return', (...args) => this.completeReturn(...args));
    this.router.on('final', (...args) => this.finalization(...args));
  }

  completeReturn(message) {
    const { promiseId, value, error } = message;

    if (typeof error === 'undefined') {
      this.promiseStore.acceptPromise(promiseId, value);
    } else {
      this.promiseStore.rejectPromise(promiseId, error);
    }
  }

  finalization(message) {
    const { functionId } = message;

    this.retainedStore.delete(functionId);
  }
}
