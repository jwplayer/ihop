import EventEmitter from 'eventemitter3';

import generatePath from './generate-path.js';

export default class Router extends EventEmitter {
  constructor(name, network) {
    super();
    this.name = name;
    this.path = name;

    this.network = network;
    this.nodeMap_ = new Map(/* <path, nodeId> */);

    this.network.on('message', (...args) => this.onMessage_(...args));
  }

  isDestinationChildOrSelf_(dest) {
    return dest.indexOf(this.path) === 0;
  }

  isDestinationSelf_(dest) {
    return dest === this.path;
  }

  getChildDestination_(destination) {
    const pathLen = this.path.length;
    const subPath = destination.slice(pathLen + 1);

    return subPath.split('.')[0];
  }

  toParent (message) {
    Object.assign(message, { from: this.name });

    this.network.toParent(message);
  }

  toAllChildren(message) {
    Object.assign(message, { from: this.name });

    this.network.toAllChildren(message);
  }

  route(message) {
    const { destination, type } = message;

    /* c8 ignore next 3 */
    if (process.env.NODE_ENV === 'dev') {
      this.logMessage_(message);
    }

    if (typeof destination === 'undefined' || this.isDestinationSelf_(destination)) {
      this.emit(type, message);
    } else if (this.isDestinationChildOrSelf_(destination)) {
      // Forward message to child
      const childName = this.getChildDestination_(destination);
      const nodeId = this.nodeMap_.get(childName);

      if (nodeId) {
        message.from = this.name;
        this.network.toNode(nodeId, message);
      }
    } else {
      message.from = this.name;
      // Forward message to parent
      this.network.toParent(message);
    }
  }

  /* c8 ignore start */
  logMessage_ (message) {
    const { destination, source, type, from } = message;
    const at = this.name;

    if (at !== from) {
      let srcDest = '';

      if (source && destination) {
        srcDest = `\t[${source} ⟹ ${destination}]`;
      }
      console.debug(`${type}:\t${from} ⟶ ${at}${srcDest}`, message);
    }
  }
  /* c8 ignore stop */

  onMessage_(message) {
    // Listen for events that let us know topography
    // chiefly peek and poke
    const { from, path, nodeId } = message;

    if (typeof path === 'string') {
      const newPath = generatePath(path, this.name);

      if (newPath !== this.path) {
        this.path = newPath;
      }
    }

    if (from) {
      if (!this.nodeMap_.has(from)) {
        this.nodeMap_.set(from, nodeId);
      }
    }

    // Route it!
    this.route(message);
  }
}
