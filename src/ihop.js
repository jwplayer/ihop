import global from 'global';
import EventEmitter from 'eventemitter3';

import Network from './net/network.js';
import Router from './net/router.js';

import PromiseStore from './stores/promise-store.js';
import RetainedStore from './stores/retained-store.js';

import Model from './state/model.js';
import View from './state/view.js';

import ProxySchema from './proxy/proxy-schema.js';

import Completer from './sinks/completer.js';
import Finalizer from './sinks/finalizer.js';
import Reflector from './sinks/reflector.js';

import RemoteFinalizationRegistry from './sources/remote-finalization-registry.js';
import proxyHandlerFactory from './sources/proxy-handler-factory.js';

export default class IHop extends EventEmitter {
  constructor(name, options) {
    super();
    this.name = name;

    // General Support
    this.maybeConstructWithOptions_(Network, 'network', options);

    // Promise store holds promises that are waiting to be "completed"
    this.maybeConstructWithOptions_(PromiseStore, 'promiseStore', options);

    // Retain store retains references to objects that have remote proxies
    // This includes exports and return values
    this.maybeConstructWithOptions_(RetainedStore, 'retainedStore', options);

    // More routing of messages based on name and node path
    this.maybeConstructWithOptions_(Router, 'router', options, this.name, this.network);

    // Finalization Registry with remote messaging and caching
    this.maybeConstructWithOptions_(RemoteFinalizationRegistry, 'finalizationRegistry', options, this.router);

    // proxyHandlerFactory creates message passing proxy handlers
    this.proxyHandlerFactory = options?.proxyHandlerFactory ?? proxyHandlerFactory;

    // Heavy lifting for proxy creation and obj-to-proxy
    this.maybeConstructWithOptions_(ProxySchema, 'proxySchema', options, this.router, this.promiseStore, this.retainedStore, this.finalizationRegistry, this.proxyHandlerFactory);

    // The model that housed both local and global state
    this.maybeConstructWithOptions_(Model, 'model', options, this.router, this.proxySchema, options?.model);

    // The view of the global state as proxies
    this.maybeConstructWithOptions_(View, 'view', options, this.model, this.proxySchema);

    // Completer accepts return messages and "completes" outstanding promises
    this.maybeConstructWithOptions_(Completer, 'completer', options, this.router, this.promiseStore, this.proxySchema);

    // Finalizer takes message signifying that a proxy has been GC'd and removes
    // any references to the proxee locally
    this.maybeConstructWithOptions_(Finalizer, 'finalizer', options, this.router, this.retainedStore);

    // Reflector gets message for local exports (from other nodes) and returns the
    // requested or invokes the function
    this.maybeConstructWithOptions_(Reflector, 'reflector', options, this.router, this.proxySchema, this.retainedStore);

    this.tree = this.view.tree;
    this.view.on('changed', () => this.emit('changed'));

    this.importPromises_ = new Map();
  }

  maybeConstructWithOptions_(Class, property, options, ...args) {
    const optionBlock = options?.[property];

    if (optionBlock instanceof Class) {
      this[property] = optionBlock;
    } else if (args.length) {
      this[property] = new Class(...args);
    } else {
      this[property] = new Class(optionBlock);
    }
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

  import(path) {
    // Does a tracking promise already exist?
    if (this.importPromises_.has(path)) {
      return this.importPromises_.get(path);
    }

    // Does property already exist?
    const obj = this.getPath_(path);

    if (!!obj) {
      const promise = Promise.resolve(obj);
      this.importPromises_.set(path, promise);
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
      this.importPromises_.set(path, promise);
      return promise;
    }
  }
}
