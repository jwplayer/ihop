import Node from './node.js';

export default class WorkerNode extends Node {
  constructor(id, window, origin) {
    super(id, window, origin);
  }

  send(message) {
    if (this.window) {
      this.window.postMessage(message);
    }
  }
}
