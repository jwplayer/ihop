import IHop from './ihop.js';

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

class IHopExport extends IHop {
  static Network = Network;
  static PromiseStore = PromiseStore;
  static RetainedStore = RetainedStore;
  static Router = Router;
  static RemoteFinalizationRegistry = RemoteFinalizationRegistry;
  static ProxySchema = ProxySchema;
  static Model = Model;
  static View = View;
  static Completer = Completer;
  static Finalizer = Finalizer;
  static Reflector = Reflector;
  static proxyHandlerFactory = proxyHandlerFactory;
}

export default IHopExport;
