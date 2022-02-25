import EventEmitter from 'eventemitter3';

export default class Router extends EventEmitter {
  constructor(name, network) {
    super();
    this.name = name;
    this.path = '';

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

    if (!destination || this.isDestinationSelf_(destination)) {
      this.emit(message.type, message);
    } else if (this.isDestinationChildOrSelf_(destination)) {
      // Forward message to child
      const childName = this.getChildDestination_(destination);
      const nodeId = this.nodeMap_.get(childName);

      if (nodeId) {
        this.network.toNode(nodeId, message);
      }
    } else {
      // Forward message to parent
      this.network.toParent(message);
    }
  }

  generatePath_(base, part) {
    return base.length ? `${base}.${part}` : part;
  }

  onMessage_(message) {
    // Listen for events that let us know topography
    // chiefly peel and poke
    const { type, from, path, nodeId } = message;

    if (typeof path === 'string') {
      const newPath = this.generatePath_(path, this.name);

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
