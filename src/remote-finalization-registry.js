const DEBOUNCE_TIME = 500; // 1/2 seconds
const MAX_CACHE_TIME = 5000; // 5 seconds
const MAX_CACHE_SIZE = 1000;

export default class RemoteFinalizationRegistry {
  constructor(router) {
    this.router = router;

    this.registry_ = new FinalizationRegistry((heldValue) => this.onFinalization_(heldValue));

    // We cache finalization because they tend to come in large groups from the VM
    this.cache_ = {};

    // If we are recieving a constant stream of message and we haven't
    // sent a message in a long time, send one
    this.lastSent_ = {};

    // We use the timer to "debounce" finalization message for 1second
    this.debounceTimer_ = {};
  }

  onFinalization_(heldValue) {
    const { destination, retainedId } = heldValue;

    // Each destination node gets its own cache and timer
    if (!this.cache_[destination]) {
      this.cache_[destination] = [];
      this.lastSent_[destination] = Date.now();
    }

    this.cache_[destination].push(retainedId);

    const sinceLastSent = Date.now() - this.lastSent_[destination];

    if (sinceLastSent > MAX_CACHE_TIME || this.cache_[destination]. length > MAX_CACHE_SIZE) {
      this.flushCache_(destination);
      return;
    }

    clearTimeout(this.debounceTimer_[destination]);
    this.debounceTimer_[destination] = setTimeout(() => this.flushCache_(destination), DEBOUNCE_TIME);
  }

  flushAllCaches_() {
    const destinations = Object.keys(this.cache_);
    destinations.forEach((destination) => this.flushCache_(destination));
  }

  flushCache_(destination) {
    if (!this.cache_[destination].length) {
      return;
    }
    clearTimeout(this.debounceTimer_[destination]);

    this.router.route({
      type: 'final',
      destination,
      retainedIds: this.cache_[destination],
      from: this.router.name,
      source: this.router.path
    });

    this.cache_[destination] = null;
    this.lastSent_[destination] = Date.now();
    this.debounceTimer_[destination] = null;
  }

  register(obj, heldValue) {
    return this.registry_.register(obj, heldValue);
  }
}
