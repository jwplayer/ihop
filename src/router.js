import EventEmitter from 'eventemitter3';
import generatePath from './generate-path';

export default class Router extends EventEmitter {
  constructor(name, network) {
    super();
    this.name = name;
    this.path = name;

    this.network = network;
    this.nodeMap_ = new Map(/* <path, nodeId> */);

    this.network.on('message', this.onMessage_.bind(this));
  }

  isDestinationChildOrSelf_(dest) {
    return dest.indexOf(this.path) === 0;
  }

  isDestinationSelf_(dest) {
    return dest === this.path;
  }

  getChildDestination_(destination) {
    const pathLen = this.path.length;
    if (pathLen > 0) {
      const subPath = destination.slice(pathLen + 1);
      return subPath.split('.')[0];
    }

    // We are at the root node
    return destination.split('.')[0];
  }

  route(message) {
    const { destination } = message;

    if (process.env.NODE_ENV === 'dev') {
      const at = this.name;
      const from = message.from;
      if (at !== from) {
        const destination = message.destination;
        console.debug('what>>', message.type, 'at>>', at, 'from>>', from, 'destination>>', destination, 'data>>', message);
      }
    }

    if (typeof destination === 'undefined' || this.isDestinationSelf_(destination)) {
      this.emit(message.type, message);
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

  onMessage_(message) {
    // Listen for events that let us know topography
    // chiefly peek and poke
    const { type, from, path, nodeId } = message;

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
