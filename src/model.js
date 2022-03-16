import { nanoid } from 'nanoid';
import EventEmitter from 'eventemitter3';
import global from 'global';

import isStructuredCloneable from './is-structured-cloneable.js';

const defaultOptions = {
  forceRoot: false,
};

/**
 * Iframe Hopper Base - contains the functionality related to maintaining a
 * globally consistent state between iframes.
 */
export default class Model extends EventEmitter {
  constructor(router, proxySchema, options = {}) {
    super();

    const finalOptions = Object.assign({}, defaultOptions, options);

    this.childTreeVersions_ = new Map();
    this.localTreeVersion_ = 1;
    this.globalTreeVersion_ = 0;

    // For the root node, localTree and globalTree are identical
    this.localTree_ = {};
    this.globalTree_ = {};

    // We are assumed to be a root until we know otherwise (ie. receive a poke back
    // from our parent)
    this.isRoot = true;

    this.router = router;
    this.proxySchema = proxySchema;

    if (global.parent !== global && finalOptions.forceRoot !== true) {
      this.registerWithParent_();
    }

    this.router.on('peek', (...args) => this.onPeek(...args));
    this.router.on('poke', (...args) => this.onPoke(...args));
  }

  export(name, value) {
    if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
      this.localTree_[name] = this.proxySchema.toSchema(value);
    } else {
      this.localTree_[name] = value;
    }

    this.localTreeVersion_ += 1;
    this.peekState_();
  }

  registerWithParent_() {
    // Periodically, peek parent until we get a poke back then stop
    this.parentPing_ = setInterval(()=> this.peekState_(), 1000);

    this.peekState_();
  }

  notRootAnymore_() {
    this.isRoot = false;
    clearInterval(this.parentPing_);
  }

  peekState_() {
    this.router.toParent({
      type: 'peek',
      version: this.localTreeVersion_,
      state: this.localTree_
    });
  }

  pokeState_() {
    this.emit('changed', this.globalTree_);

    this.router.toAllChildren({
      type: 'poke',
      path: this.router.path,
      version: this.globalTreeVersion_,
      state: this.globalTree_
    });
  }

  /**
   * Handles the event type "peek" used by non-root elements to signal their parents that their local state has changed
   * @param  {object} data - The event payload
   * @param  {window} eventSource - The source window the event originated from
   */
  onPeek(data) {
    const {port, from, state, version} = data;

    // If we didn't know this child exists...
    if (!this.childTreeVersions_.has(from)) {
      this.childTreeVersions_.set(from, 0);
    }

    const childStateVersion = this.childTreeVersions_.get(from);

    if (version > childStateVersion) {
      this.childTreeVersions_.set(from, version);
      this.localTree_[from] = state;
      this.localTreeVersion_ = Math.max(version, this.localTreeVersion_) + 1;

      if (this.isRoot) {
        // Start poking to send global state down the tree
        this.globalTree_ = { [this.router.name]: this.localTree_ };
        this.globalTreeVersion_ = this.localTreeVersion_;
        // Start propagating downwards
        this.pokeState_();
      }

      // Continue propagating upwards
      // We do this even if we are root because we can't be sure if our
      // parent node exists but just hasn't responded yet
      this.peekState_();
    }
  }

  /**
   * Handles the event type "poke" used to send the global state down the tree from the root node
   * @param  {object} data - The event payload
   * @param  {window} eventSource - The source window the event originated from
   */
  onPoke(data) {
    const {state, version, path} = data;

    // If we get a poke from our parent, we know we are no longer a root node
    if (this.isRoot) {
      this.notRootAnymore_();
    }

    if (version > this.globalTreeVersion_) {
      this.globalTree_ = state;
      this.globalTreeVersion_ = version;

      // Continue propagating downwards
      this.pokeState_();
    }
  }
}
