import ProxyHandler from './proxy-handler';
import generatePath from './generate-path';

import EventEmitter from 'eventemitter3';

const noop = () => {};
const noobj = {};

export default class View extends EventEmitter {
  constructor(model, router, promiseStore, retainedStore) {
    super();
    this.model = model;
    this.router = router;
    this.promiseStore = promiseStore;
    this.retainedStore = retainedStore;
    this.tree = {};

    this.model.on('changed', (model) => this.reifyModel_(model));
  }

  reifyModel_(globalState) {
    this.levelToView_(globalState, this.tree, '');
    this.emit('changed');
  }

  levelToView_(srcNode, dstNode, path) {
    const srcKeys = Object.keys(srcNode);
    const dstKeys = Object.keys(dstNode);

    srcKeys.forEach((key) => {
      const src = srcNode[key];

      if(typeof src === 'object') {
        if ('@id' in src && '@type' in src){
          if (src['@type'] === '@function') {
            dstNode[key] = noop;
          } else {
            dstNode[key] = {};
          }
          if ('@children' in src) {
            this.levelToView_(src['@children'], dstNode[key], path);
          }
          dstNode[key] = new Proxy(dstNode[key], ProxyHandler(this.router, this.promiseStore, this.retainedStore, path, src['@id']));
        } else {
          dstNode[key] = {};
          this.levelToView_(src, dstNode[key], generatePath(path, key));
        }
      } else {
        dstNode[key] = src;
      }
    });
  }

}

