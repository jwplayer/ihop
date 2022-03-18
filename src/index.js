import IHop from './ihop.js';

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
