export default class Node {
  constructor(id, window, origin) {
    this.id = id;
    this.origin = origin;
    this.window = window;
  }

  send(message) {
    if (this.window) {
      this.window.postMessage(message, this.origin);
    }
  }
}
