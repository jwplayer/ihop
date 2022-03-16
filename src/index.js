import global from 'global';
import EventEmitter from 'eventemitter3';

import Model from './model.js';
import Router from './router.js';
import Network from './network.js';
import View from './view.js';
import PromiseStore from './promise-store.js';
import Completer from './completer.js';
import Finalizer from './finalizer.js';
import Reflector from './reflector.js';
import RetainedStore from './retained-store.js';
import ProxySchema from './proxy-schema.js';
import RemoteFinalizationRegistry from './remote-finalization-registry.js';
import networkDefaults from './network-defaults.js';

export default class IHop extends EventEmitter {
  constructor(name, options) {
    super();
    this.name = name;

    // General Support
    this.network = new Network(global, Object.assign({}, networkDefaults, options?.network ?? {}));

    // Promise store holds promises that are waiting to be "completed"
    this.promiseStore = new PromiseStore();

    // Retain store retains references to objects that have remote proxies
    // This includes exports and return values
    this.retainedStore = new RetainedStore();

    // More routing of messages based on name and node path
    this.router = new Router(this.name, this.network);

    // Finalization Registry with caching
    this.finalizationRegistry = new RemoteFinalizationRegistry(this.router);

    // Heavy lifting for proxy creation and obj-to-proxy
    this.proxySchema = new ProxySchema(this.router, this.promiseStore, this.retainedStore, this.finalizationRegistry);

    // The model that housed both local and global state
    this.model = new Model(this.router, this.proxySchema, options?.model);

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
    this.view.on('changed', () => this.emit('changed'));

    this.export = (...args) => this.model.export(...args);

    this.registerWorker = (worker)  => {
      return this.network.registerWorker(worker);
    };

    this.waitForPromises_ = new Map();

    this.waitFor = (path) => {
      // Does a tracking promise already exist?
      if (this.waitForPromises_.has(path)) {
        return this.waitForPromises_.get(path);
      }

      const pathParts = path.split('.');
      // Does property already exist?
      const exists = pathParts.reduce((obj, pathPart) => (obj && obj[pathPart]), this.view.tree);

      if (!!exists) {
        const promise = Promise.resolve(exists);
        this.waitForPromises_.set(path, promise);
        return promise;
      } else {
        const promise = new Promise((accept, reject) => {
          this.view.on('changed', () => {
            const exists = pathParts.reduce((obj, pathPart) => (obj && obj[pathPart]), this.view.tree);
            if (!!exists) {
              accept(exists);
            }
          });
        });
        this.waitForPromises_.set(path, promise);
        return promise;
      }
    };
  }
}
