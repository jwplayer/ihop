import Model from './model';
import Router from './router';
import Network from './network';
import View from './view';
import PromiseStore from './promise-store';
import Completer from './completer';
import Finalizer from './finalizer';
import Reflector from './reflector';
import RetainedStore from './retained-store';
import ProxySchema from './proxy-schema';

import EventEmitter from 'eventemitter3';
// export { StateModel, Router, NetworkAdapter, TreeView};

export default class extends EventEmitter {
  constructor(name, options) {
    super();
    this.name = name;
    this.network = new Network();
    this.promiseStore = new PromiseStore();
    this.retainedStore = new RetainedStore();
    this.router = new Router(this.name, this.network);
    this.proxySchema = new ProxySchema(this.router, this.promiseStore, this.retainedStore);
    this.model = new Model(this.router, this.proxySchema);
    this.view = new View(this.model, this.proxySchema);
    this.completer = new Completer(this.router, this.promiseStore, this.proxySchema);
    this.finalizer = new Finalizer(this.router, this.retainedStore);
    this.reflector = new Reflector(this.router, this.proxySchema, this.retainedStore);

    this.tree = this.view.tree;
    this.export = (...args) => this.model.export(...args);
    this.view.on('changed', () => this.emit('changed'));
  }
}
