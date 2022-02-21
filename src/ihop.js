import IHOPBase from './base';
import ProxyEmitter from './proxy-emitter';
import isStructuredCloneable from './is-structured-cloneable';

/**
 * Iframe Hopper - is a tool to create a globally consistent state
 * of shared objects between two or more `window contexts`. This allows a
 * developer to export and object from one window and access that object
 * from another window as though it was local.
*/
export default class IHOP extends IHOPBase {
  /**
   * constructor description
   * @param  {string} name - A locally unique name for the iframe in the global state.
   * @param  {boolean} forceRoot - Ensure this node remains a root node even if a parent becomes available. Do not attempt to contact a parent window from this iframe.
   */
  constructor(name, forceRoot) {
    super(name, forceRoot);

    this.promises_ = new Map();
    this.tree = {};
    this.localTargets_ = {};

    //Helper functions for reaching into hierarchies
    this._ = {
      get: async (path) => {
        const pathParts = path.split('.');
        let value = this.tree;

        for (let pathPart of pathParts) {
          value = await value[pathPart];
        }

        return value;
      },
      set: async (path, setTo) => {
        const pathParts = path.split('.');
        const lastProp = pathParts.pop();
        let value = this.tree;

        for (let pathPart of pathParts) {
          value = await value[pathPart];
        }

        return value[lastProp] = setTo;
      },
      exec: async (path, ...args) => {
        const pathParts = path.split('.');
        const lastProp = pathParts.pop();
        let value = this.tree;

        for (let pathPart of pathParts) {
          value = await value[pathPart];
        }

        return await value[lastProp](...args);
      }
    }
  }

  /**
   * Registers a callable object with the current IHOP instance then
   * communicates the availablity of the new child to it's children
   * and the parent IHOP.
   * @param  {string} name - A locally unique name for the exported object in the global state.
   * @param  {object} object - The object we are exporting
   * @param  {array<strings>} eventList - An optional array of event names to listen for on `object` and propagate to other contexts.
   */
  export(name, object, eventList = []) {
    // TODO: Make sure `name`` is  unique
    this.localTargets_[name] = object;
    this.localTree_[name] = `@export[${eventList.join(',')}]`;

    // Listen for all events...
    eventList.forEach((event) => {
      object.addEventListener(event, (payload) => {
        const newPayload = Object.assign({}, payload);
        this.doEvent(event, this.path, name, newPayload);
      });
    });
    this.localTreeVersion_ += 1;
    this.peekState_();
  }

  revoke(name) {
    delete this.localTargets_[name];
    delete this.localTree[name];
    this.peekState();
  }

  // Walk the current globalTree and generate proxies for any `@export` objects
  generateProxies(src = this.globalTree_, dest = this.tree, path = '') {
    const srcProps = Object.keys(src);
    const destProps = Object.keys(dest);

    srcProps.forEach(srcProp => {
      if (typeof src[srcProp] === 'object') {
        if (typeof dest[srcProp] !== 'object') {
          dest[srcProp] = {};
        }
        return this.generateProxies(src[srcProp], dest[srcProp], this.generatePath(path, srcProp));
      }

      if (path === this.path) {
        dest[srcProp] = this.localTargets_[srcProp];
      } else if (src[srcProp].indexOf('@export') === 0) {
        if (dest[srcProp] instanceof ProxyEmitter) {
          // Do not recreate existing proxies
          return;
        }

        // Make a proxy object
        dest[srcProp] = new ProxyEmitter(this, path, srcProp);
      }
    });

    // Delete properties that are no longer in the tree
    destProps.forEach(destProp => {
      if (srcProps.indexOf(destProp) === -1) {
        delete dest[destProp];
      }
    });

    this.dispatchEvent(new Event('changed'));
  }

  isDestinationChildOrSelf(dest) {
    return dest.indexOf(this.path) === 0;
  }

  isDestinationSelf(dest) {
    return dest === this.path;
  }

  getChildDestination(destination) {
    const pathLen = this.path.length;
    if (pathLen > 0) {
      const subPath = destination.slice(pathLen + 1);
      return subPath.split('.')[0];
    }

    // We are at the root node
    return destination.split('.')[0];
  }

  doReturn(eventSource, destination, promiseId, value, error) {
    let needsProxy = false;

    if (!isStructuredCloneable(value)) {
      // Oh no! The value isn't a primitive, so we need more proxy action
      needsProxy = true;

      if (typeof value === 'function') {
        value = '@function';
      } else {
        value = undefined;
      }
    }

    // Return messages are special because the first place we send it
    // is always the node we recieved it from
    eventSource.postMessage(this.ihopMessage_({
      type: 'return',
      destination,
      promiseId,
      value,
      error,
      needsProxy
    }), '*');
  }

  doGet(target, property, destination, source, promiseId) {
    this.routeOutgoingMessage(this.ihopMessage_({
      type: 'get',
      target,
      property,
      destination,
      source,
      promiseId
    }));
  }

  doSet(target, property, destination, source, promiseId, value) {
    this.routeOutgoingMessage(this.ihopMessage_({
      type: 'set',
      target,
      property,
      destination,
      source,
      value,
      promiseId
    }));
  }

  doCall(target, property, destination, source, promiseId, args) {
    this.routeOutgoingMessage(this.ihopMessage_({
      type: 'call',
      target,
      property,
      destination,
      source,
      args,
      promiseId
    }));
  }

  doEvent(name, source, target, payload) {
    this.toParent(this.ihopMessage_({
      type: 'bubble',
      source,
      target,
      name,
      payload
    }));
  }

  routeOutgoingMessage(message) {
    const {destination} = message;
    if (this.isDestinationSelf(destination)) {
      // This should not happen!!
      throw new Error('We somehow hit the proxy for a local target!');
    } else if (this.isDestinationChildOrSelf(destination)) {
      // Forward message to child
      const childName = this.getChildDestination(destination);
      const child = this.children.get(childName);

      child.window.postMessage(message, '*');
    } else {
      // Forward message to parent
      this.toParent(message);
    }
  }

  emitEvent(message) {
    const sourceArr = message.source.split('.');
    let node = this.tree;

    sourceArr.push(message.target);
    sourceArr.forEach((prop) => {
      if (node) {
        node = node[prop]
      }
    });

    if (node) {
      const event = new Event(message.name);

      // TODO: Need to figure out how to send a payload...
      node.dispatchEvent(event);
    }
  }

  castEvent(message) {
    const { source, name, payload, target } = message;

    if (source !== this.path) {
      this.emitEvent(message);
    }

    this.toChildren(this.ihopMessage_({
      type: 'cast',
      source,
      target,
      name,
      payload
    }));
  }

  continueRouting_(data) {
    const { destination } = data;

    if (this.isDestinationChildOrSelf(destination)) {
      // Forward message to child
      const childName = this.getChildDestination(destination);
      const child = this.children.get(childName);

      child.window.postMessage(data, '*');
    } else {
      // Forward message to parent
      this.toParent(data);
    }
  }

  /**
   * Handles the event type "cast" used broadcast an event to all listeners once it has "bubbled" to the root
   * @param  {object} data - The event payload
   * @param  {window} eventSource - The source window the event originated from
   */
  onCast (data, eventSource) {
    if (data.source !== this.path) {
      this.emitEvent(data);
    }
    this.toChildren(data);
  }

  /**
   * Handles the event type "bubble" used send an event received on a exported object to the root element
   * @param  {object} data - The event payload
   * @param  {window} eventSource - The source window the event originated from
   */
  onBubble(data, eventSource) {
    if (this.isRoot) {
      // change to a `cast`` event and send it to all my children
      return this.castEvent(data);
    }
    this.toParent(data);
  }

  /**
   * Handles the event type "get" used to retrieve a value from a property
   * @param  {object} data - The event payload
   * @param  {window} eventSource - The source window the event originated from
   */
  async onGet(data, eventSource) {
    const {target, property, destination, source, promiseId} = data;

    if (this.isDestinationSelf(destination)) {
      // Do lookup and craft return message
      try {
        const propertyPath = property.split('.');
        let value = this.localTargets_[target];

        for (let prop of propertyPath) {
          value = await Reflect.get(value, prop);
        }

        this.doReturn(eventSource, source, promiseId, value);
      } catch (error) {
        this.doReturn(eventSource, source, promiseId, undefined, error);
      }
    } else  {
      this.continueRouting_(data);
    }
  }

  /**
   * Handles the event type "set" used to asign a value to a property
   * @param  {object} data - The event payload
   * @param  {window} eventSource - The source window the event originated from
   */
  onSet(data, eventSource) {
    const {target, property, destination, source, promiseId, value} = data;

    if (this.isDestinationSelf(destination)) {
      // Do lookup and craft return message
      try {
        const propertyPath = property.split('.');
        let targetObj = this.localTargets_[target];
        const lastProp = propertyPath.pop();

        for (let prop of propertyPath) {
          targetObj = Reflect.get(targetObj, prop);
        }

        Reflect.set(targetObj, lastProp, value);


        this.doReturn(eventSource, source, promiseId, true);
      } catch (error) {
        this.doReturn(eventSource, source, promiseId, undefined, error);
      }
    } else  {
      this.continueRouting_(data);
    }
  }

  /**
   * Handles the event type "return" used to return reults from a "get" or "call" back to the original caller
   * @param  {object} data - The event payload
   * @param  {window} eventSource - The source window the event originated from
   */
  onReturn(data, eventSource) {
    const {destination, promiseId, value, error, needsProxy} = data;

    if (this.isDestinationSelf(destination)) {
      // Do resolve the promise
      const promise = this.promises_.get(promiseId);
      // Always try to delete the promise
      this.promises_.delete(promiseId);

      // IF we can't find the promise, just return
      if (!promise) {
        return;
      }

      // Non-primitive objects need to be proxied anew
      if (needsProxy) {
        // TODO: Mailbox the return object and return a proxy with a new name
        if (value === '@function') {
          return promise.makeFunctionProxy();
        }
        return promise.makeProxy();
      }

      if (value) {
        return promise.accept(value);
      } else if (error) {
        return promise.reject(error);
      }
    } else  {
      this.continueRouting_(data);
    }
  }

  /**
   * Handles the event type "call" used to invoke a function and return the results
   * @param  {object} data - The event payload
   * @param  {window} eventSource - The source window the event originated from
   */
  async onCall(data, eventSource) {
    const {target, property, destination, source, promiseId, args} = data;

    if (this.isDestinationSelf(destination)) {
      // Do lookup and craft return message
      try {
        const propertyPath = property.split('.');
        let targetObj = this.localTargets_[target];
        const lastProp = propertyPath.pop();

        for (let prop of propertyPath) {
          targetObj = await Reflect.get(targetObj, prop);
        }

        const value = await Reflect.apply(targetObj[lastProp], targetObj, args);

        this.doReturn(eventSource, source, promiseId, value);
      } catch (error) {
        this.doReturn(eventSource, source, promiseId, undefined, error);
      }
    } else  {
      this.continueRouting_(data);
    }
  }
}
