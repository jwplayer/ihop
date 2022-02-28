import ProxyHandler from './proxy-handler';
import generatePath from './generate-path';

import EventEmitter from 'eventemitter3';

export default class View extends EventEmitter {
  constructor(model, proxySchema) {
    super();
    this.model = model;
    this.proxySchema = proxySchema;
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

      if (typeof src === 'object') {
        if (this.proxySchema.isSchema(src)) {
          dstNode[key] = this.proxySchema.fromSchema(src, path);
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

