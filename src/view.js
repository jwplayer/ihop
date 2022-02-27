import ProxyHandler from './proxy-handler';
import generatePath from './generate-path';

const noop = () => {};
const noobj = {};

export default class View {
  constructor(model, router, promiseStore) {
    this.model = model;
    this.router = router;
    this.promiseStore = promiseStore;
    this.tree = {};

    this.model.on('modelchanged', (model) => this.reifyModel_(model));
  }

  reifyModel_(globalState) {
    this.levelToView_(globalState, this.tree, '');
  }

  levelToView_(srcNode, dstNode, path) {
    const srcKeys = Object.keys(srcNode);
    const dstKeys = Object.keys(dstNode);

    srcKeys.forEach((key) => {
      if (dstNode[key] && !dstNode[key] instanceof Proxy) {
        this.levelToView_(srcNode[key], dstNode[key], generatePath(path, key));
      }
      const value = srcNode[key];
      if (value === '@object') {
        dstNode[key] = new Proxy(noobj, ProxyHandler(this.router, this.promiseStore, path, key));
      } else if (value === '@function') {
        dstNode[key] = new Proxy(noop, ProxyHandler(this.router, this.promiseStore, path, key));
      } else if (typeof value === 'object') {
        dstNode[key] = {};
        this.levelToView_(srcNode[key], dstNode[key], generatePath(path, key));
      } else {
        dstNode[key] = srcNode[key];
      }
    });
    // Delete removed properties
    dstKeys.forEach((key) => {
      if (!key in srcNode) {
        delete dstNode[key];
      }
    })
  }

}


// Local Proxy
//   Maintains a reference to the local object it presents
//   Listens for routeable events
//   Uses reflect to operate on the local variable
//   Creates "shared" object references for return values

// Remote Proxy
//   Creates routeable events
//   Creates and tracks promises for return values
//   Creates "shared" object references for arguments
//

// Special values in model:
// @object - an object that needs a proxy
// @function - a function that needs to be proxied
//
