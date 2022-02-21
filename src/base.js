import IHOPChild from './child';
import { IHOP_VERSION, IHOP_MAJOR_VERSION, IHOP_MINOR_VERSION } from './constants';

/**
 * Iframe Hopper Base - contains the functionality related to maintaining a
 * globally consistent state between iframes.
 */
export default class IHOPBase extends EventTarget {
  constructor(name, forceRoot = false) {
    super();
    this.name = name;
    this.path = '';
    this.children = new Map();

    this.localTreeVersion_ = 1;
    this.globalTreeVersion_ = 0;

    // For the root node, localTree and globalTree are identical
    this.localTree_ = {};
    this.globalTree_ = {};

    // We are assumed to be a root until we know otherwise (ie. receive a poke back
    // from our parent)
    this.isRoot = true;

    // Setup message pump
    window.addEventListener('message', (...args) => this.onMessage(...args));

    if (window.parent !== window && !forceRoot) {
      this.registerWithParent_();
    } else {
      this.toParent = () => {};
    }
  }

  registerWithParent_() {
    const {parent} = window;

    this.toParent = (event) => parent.postMessage(event, '*');

    // Periodically, peek parent until we get a poke back then stop
    this.parentPing_ = setInterval(()=> this.peekState_(), 1000);

    this.peekState_();
  }

  notRootAnymore_() {
    this.isRoot = false;
    clearInterval(this.parentPing_);
  }

  ihopMessage_(data) {
    return Object.assign({
      IHOP_VER: IHOP_VERSION,
      IHOP_ORG: this.name
    }, data);
  }

  // addChild registers a routable child with the current IHOP instance the
  // current instance then communicates the availablity of the new child to
  // the other existing children and the parent IHOP.
  addChild(name, iframe) {
    if (this.children.has(name)) {
      throw new Error('Existing child has the same name!')
    }

    this.children.set(name, new IHOPChild(name, iframe));

    // TODO: Get the current state of the child nodes
    // TODO: Do communication!
  }

  removeChild(path, iframe) {}

  toChildren(message) {
    for (let child of this.children.values()) {
      child.window.postMessage(message, '*');
    }
  }

  generatePath(base, part) {
    return base.length ? `${base}.${part}` : part;
  }

  generateProxies() {}

  peekState_() {
    this.toParent(this.ihopMessage_({
      type: 'peek',
      version: this.localTreeVersion_,
      from: this.name,
      state: this.localTree_
    }));
  }

  pokeState_() {
    this.toChildren(this.ihopMessage_({
      type: 'poke',
      path: this.path,
      version: this.globalTreeVersion_,
      state: this.globalTree_
    }));
  }

  sendMessage(destination, payload) {

  }

  /**
   * Handles all events and forwards them to a matching `on*` handler defined in this class
   * @param  {object} data - The event payload
   * @param  {window} eventSource - The source window the event originated from
   */
  onMessage(message) {
    const { source, data } = message;
    if (!data) {
      return;
    }

    const { IHOP_VER, IHOP_ORG, type } = data;
    if (IHOP_VER) {
      const [major, minor] = IHOP_VER.split('.');

      if (major !== IHOP_MAJOR_VERSION) {
        console.error('Received a message from an incompatibile IHOP version', data.IHOP, 'expecting', IHOP_VERSION);
        return ;
      } else if (minor !== IHOP_MINOR_VERSION) {
        console.warn('Received a message from a different IHOP version', data.IHOP, 'expecting', IHOP_VERSION);
      }
    }

    const fnName = `on${type.slice(0,1).toUpperCase()}${type.slice(1)}`;

    console.debug('what>>', type, 'at>>', this.path || '<root>', 'from>>', IHOP_ORG,'data>>', data);

    if (fnName in this) {
      this[fnName](data, source);
    }
  }

  /**
   * Handles the event type "peek" used by non-root elements to signal their parents that their local state has changed
   * @param  {object} data - The event payload
   * @param  {window} eventSource - The source window the event originated from
   */
  onPeek(data, eventSource) {
    const {from, state, version} = data;

    // If we didn't know this child exists...
    if (!this.children.has(from)) {
      this.addChild(from, eventSource);
    }

    const child = this.children.get(from);

    if (version > child.stateVersion) {
      child.stateVersion = version;
      this.localTree_[from] = state;
      this.localTreeVersion_ = Math.max(version, this.localTreeVersion_) + 1;

      if (this.isRoot) {
        // Start poking to send global state down the tree
        this.globalTree_ = this.localTree_;
        this.globalTreeVersion_ = this.localTreeVersion_;
        this.generateProxies();
        this.pokeState_();
      }
      // Continue propagating upwards
      this.peekState_();
    }
  }

  /**
   * Handles the event type "poke" used to send the global state down the tree from the root node
   * @param  {object} data - The event payload
   * @param  {window} eventSource - The source window the event originated from
   */
  onPoke(data, eventSource) {
    const {state, version, path} = data;

    // If we get a poke from our parent, we know we are no longer a root node
    if (this.isRoot) {
      this.notRootAnymore_();
    }

    if (version > this.globalTreeVersion_) {
      this.globalTree_ = state;
      this.path = this.generatePath(path, this.name);
      this.globalTreeVersion_ = version;
      this.generateProxies();

      // Continue propagating downwards
      this.pokeState_();
    }
  }
}
