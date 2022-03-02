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

export default class extends EventEmitter {
  constructor(name, options) {
    super();
    this.name = name;

    // General Support
    this.network = new Network();

    // Promise store holds promises that are waiting to be "completed"
    this.promiseStore = new PromiseStore();

    // Retain store retains references to objects that have remote proxies
    // This includes exports and return values
    this.retainedStore = new RetainedStore();

    // More routing of messages based on name and node path
    this.router = new Router(this.name, this.network);

    // Heavy lifting for proxy creation and obj-to-proxy
    this.proxySchema = new ProxySchema(this.router, this.promiseStore, this.retainedStore);

    // The model that housed both local and global state
    this.model = new Model(this.router, this.proxySchema);

    // The view of the global state as proxies
    this.view = new View(this.model, this.proxySchema);

    // Completer accepts return messages and "completes" outstanding promises
    this.completer = new Completer(this.router, this.promiseStore, this.proxySchema);

    // Finalizer takes message signifying that a proxy has been GC'd and removes
    // any references to the proxee locally
    this.finalizer = new Finalizer(this.router, this.retainedStore);

    // Reflector gets message for local exports (from other nodes) and returns the
    // requested or invokes the function
    this.reflector = new Reflector(this.router, this.proxySchema, this.retainedStore);

    this.tree = this.view.tree;
    this.export = (...args) => this.model.export(...args);
    this.view.on('changed', () => this.emit('changed'));



    this.waitForPromises = new Map();

    this.waitFor = (path) => {
      // Does a tracking promise already exist?
      if (this.waitForPromises.has(path)) {
        return this.waitForPromises.get(path);
      }

      const pathParts = path.split('.');
      // Does property already exist?
      const exists = !!pathParts.reduce((obj, pathPart) => (obj && obj[pathPart]), this.view.tree);

      if (exists) {
        const promise = Promise.resolve(true);
        this.waitForPromises.set(path, promise);
        return promise;
      } else {
        const promise = new Promise((accept, reject) => {
          this.view.on('changed', () => {
            const exists = !!pathParts.reduce((obj, pathPart) => (obj && obj[pathPart]), this.view.tree);
            if (exists) {
              accept(true);
            }
          });
        });
        this.waitForPromises.set(path, promise);
        return promise;
      }
    };
  }
}
