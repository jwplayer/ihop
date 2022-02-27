import Model from './model';
import Router from './router';
import Network from './network';
import View from './view';
import PromiseStore from './promise';
import Completer from './completer';
import Reflector from './reflector';
// export { StateModel, Router, NetworkAdapter, TreeView};

export default function (name) {
  const network = new Network();
  const promiseStore = new PromiseStore();
  const exportStore = new Map(/* <name, export obj> */);
  const router = new Router(name, network);
  const model = new Model(router, exportStore);
  const view = new View(model, router, promiseStore);
  const completer = new Completer(router, promiseStore);
  const reflector = new Reflector(router, exportStore);

  return {
   tree:  view.tree,
   export: (...args) => model.export(...args)
  };
};
