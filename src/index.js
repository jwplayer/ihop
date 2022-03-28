import IHop from './ihop.js';

import Network from './net/network.js';
import Router from './net/router.js';

import PromiseStore from './store/promise-store.js';
import RetainedStore from './store/retained-store.js';

import Model from './state/model.js';
import View from './state/view.js';

import RemoteFinalizationRegistry from './proxy/remote-finalization-registry.js';
import ProxySchema from './proxy/proxy-schema.js';

import Completer from './handler/completer.js';
import Finalizer from './handler/finalizer.js';
import Reflector from './handler/reflector.js';

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
}

export default IHopExport;
