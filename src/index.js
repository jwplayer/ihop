import StateModel from './statemodel';
import Router from './router';
import NetworkAdapter from './network';
import TreeView from './view';

// export { StateModel, Router, NetworkAdapter, TreeView};

export default function (name) {
  const network = new NetworkAdapter();
  const router = new Router(name, network);
  const model = new StateModel(router);
  const view = new TreeView(model);
};
