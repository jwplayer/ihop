export default class Finalizer {
  constructor (router, retainedStore) {
    this.router = router;
    this.retainedStore = retainedStore;

    this.router.on('final', (...args) => this.finalization(...args));
  }

  finalization (message) {
    const { retainedIds } = message;
    const originalSize = this.retainedStore.keyToObj.size;
    retainedIds.forEach((retainedId) => {
      this.retainedStore.delete(retainedId);
    });

    if (process.env.NODE_ENV === 'dev') {
      console.debug('final:', this.router.path, '\tRetained size:', originalSize, '⟶', this.retainedStore.keyToObj.size);
    }
  }
}
