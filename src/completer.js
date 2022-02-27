export default class Completer {
  constructor(router, promiseStore) {
    this.router = router;
    this.promiseStore = promiseStore;
    this.router.on('return', (...args) => this.completeReturn(...args));
  }

  completeReturn(message) {
    const { promiseId, value, error } = message;

    if (typeof error === 'undefined') {
      this.promiseStore.acceptPromise(promiseId, value);
    } else {
      this.promiseStore.rejectPromise(promiseId, error);
    }
  }
}
