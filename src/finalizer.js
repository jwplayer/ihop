export default class Finalizer {
  constructor(router, retainedStore) {
    this.router = router;
    this.retainedStore = retainedStore;

    this.router.on('final', (...args) => this.finalization(...args));
  }

  finalization(message) {
    const { retainedId } = message;

    this.retainedStore.delete(retainedId);
  }
}
