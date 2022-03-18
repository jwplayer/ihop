import global from 'global';
import EventEmitter from 'eventemitter3';

import Network from './network.js';
import PromiseStore from './promise-store.js';
import RetainedStore from './retained-store.js';
import Router from './router.js';
import RemoteFinalizationRegistry from './remote-finalization-registry.js';
import ProxySchema from './proxy-schema.js';
import Model from './model.js';
import View from './view.js';
import Completer from './completer.js';
import Finalizer from './finalizer.js';
import Reflector from './reflector.js';

export default class IHop extends EventEmitter {
  constructor(name, options) {
    super();
    this.name = name;

    // General Support
    if (options?.network instanceof Network) {
      this.network = options.network;
    } else {
      this.network = new Network(options?.network);
    }

    // Promise store holds promises that are waiting to be "completed"
    if (options?.promiseStore instanceof PromiseStore) {
      this.promiseStore = options.promiseStore;
    } else {
      this.promiseStore = new PromiseStore();
    }

    // Retain store retains references to objects that have remote proxies
    // This includes exports and return values
    if (options?.retainedStore instanceof RetainedStore) {
      this.retainedStore = options.retainedStore;
    } else {
      this.retainedStore = new RetainedStore();
    }

    // More routing of messages based on name and node path
    if (options?.router instanceof Router) {
      this.router = options.router;
    } else {
      this.router = new Router(this.name, this.network);
    }

    // Finalization Registry with remote messaging and caching
    if (options?.finalizationRegistry instanceof RemoteFinalizationRegistry) {
      this.finalizationRegistry = options.finalizationRegistry;
    } else {
      this.finalizationRegistry = new RemoteFinalizationRegistry(this.router);
    }

    // Heavy lifting for proxy creation and obj-to-proxy
    if (options?.proxySchema instanceof ProxySchema) {
      this.proxySchema = options.proxySchema;
    } else {
      this.proxySchema = new ProxySchema(this.router, this.promiseStore, this.retainedStore, this.finalizationRegistry);
    }

    // The model that housed both local and global state
    if (options?.model instanceof Model) {
      this.model = options.model;
    } else {
      this.model = new Model(this.router, this.proxySchema, options?.model);
    }

    // The view of the global state as proxies
    if (options?.view instanceof View) {
      this.view = options.view;
    } else {
      this.view = new View(this.model, this.proxySchema);
    }

    // Completer accepts return messages and "completes" outstanding promises
    if (options?.completer instanceof Completer) {
      this.completer = options.completer;
    } else {
      this.completer = new Completer(this.router, this.promiseStore, this.proxySchema);
    }

    // Finalizer takes message signifying that a proxy has been GC'd and removes
    // any references to the proxee locally
    if (options?.finalizer instanceof Finalizer) {
      this.finalizer = options.finalizer;
    } else {
      this.finalizer = new Finalizer(this.router, this.retainedStore);
    }


    // Reflector gets message for local exports (from other nodes) and returns the
    // requested or invokes the function
    if (options?.reflector instanceof Reflector) {
      this.reflector = options.reflector;
    } else {
      this.reflector = new Reflector(this.router, this.proxySchema, this.retainedStore);
    }

    this.tree = this.view.tree;
    this.view.on('changed', () => this.emit('changed'));

    this.waitForPromises_ = new Map();
  }

  export(...args) {
    return this.model.export(...args);
  }

  registerWorker(worker) {
    return this.network.registerWorker(worker);
  }

  getPath_(path) {
    const pathParts = path.split('.');

    return pathParts.reduce((obj, pathPart) => (obj && obj[pathPart]), this.view.tree);
  }

  waitFor(path) {
    // Does a tracking promise already exist?
    if (this.waitForPromises_.has(path)) {
      return this.waitForPromises_.get(path);
    }

    // Does property already exist?
    const obj = this.getPath_(path);

    if (!!obj) {
      const promise = Promise.resolve(obj);
      this.waitForPromises_.set(path, promise);
      return promise;
    } else {
      const promise = new Promise((accept, reject) => {
        const looker = () => {
          const obj = this.getPath_(path);
          if (!!obj) {
            this.view.off('changed', looker);
            return accept(obj);
          }
        };
        this.view.on('changed', looker);
      });
      this.waitForPromises_.set(path, promise);
      return promise;
    }
  }
}
