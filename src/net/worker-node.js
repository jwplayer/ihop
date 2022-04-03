import Node from './node.js';

export default class WorkerNode extends Node {
  send (message) {
    if (this.window) {
      this.window.postMessage(message);
    }
  }
}
