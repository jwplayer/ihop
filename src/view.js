export default class TreeView {
  constructor(model) {
    this.model = model;

    this.model.on('modelchanged', (model) => this.reifyModel(model));

  }

  reifyModel(model) {
    console.log(model);
  }

  makeRemoteProxy() {}
  makeLocalProxy() {}
}


// Local Proxy
//   Maintains a reference to the local object it presents
//   Listens for routeable events
//   Uses reflect to operate on the local variable
//   Creates "shared" object references for return values
class LocalProxy {
  constructor(router) {

  }

}

// Remote Proxy
//   Creates routeable events
//   Creates and tracks promises for return values
//   Creates "shared" object references for arguments
//
