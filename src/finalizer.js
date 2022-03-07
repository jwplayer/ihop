export default class Finalizer {
  constructor(router, retainedStore) {
    this.router = router;
    this.retainedStore = retainedStore;

    this.router.on('final', (...args) => this.finalization(...args));
  }

  finalization(message) {
    const { retainedIds } = message;
    retainedIds.forEach((retainedId) => {
      this.retainedStore.delete(retainedId);
    });
    console.log('final:', this.router.path, this.retainedStore.keyToObj.size)
  }
}
