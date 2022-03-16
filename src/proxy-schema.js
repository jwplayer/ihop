import { nanoid } from 'nanoid';

import isStructuredCloneable from './is-structured-cloneable.js';
import ProxyHandler from './proxy-handler.js';
import generatePath from './generate-path.js';
import { IHOP_PROXY_TAG } from './constants.js';
import getAllProperties from './get-all-properties.js';
import SchemaNode from './proxy-schema-node.js';

const finalizationCacheFlushInterval = 10000;

// This can not be an arrow function because we use it
// for constructor proxies
const noop = function() {};

// List of properties that we do not create deep-proxies for
const doNotDescend = [
  // From Events
  'currentTarget',
  'path',
  'srcElement',
  'target',
  'view',
  // From DOM Element
  'attributes',
  'firstChild',
  'firstElementChild',
  'children',
  'childNodes',
  'nextElementSibling',
  'nextSibling',
  'lastChild',
  'lastElementChild',
  'offsetParent',
  'parentElement',
  'parentNode',
  'previousElementSibling',
  'previousSibling',
  'ownerDocument',
];

export default class ProxySchema {
  constructor(router, promiseStore, retainedStore) {
    this.router = router;
    this.promiseStore = promiseStore;
    this.retainedStore = retainedStore;

    this.finalizationRegistry = new FinalizationRegistry((heldValue) => this.onFinalization_(heldValue));
    this.finalizationCache_ = {};
    this.finalizationTimer_ = setInterval(() => this.flushAllFinalizationCaches_(), finalizationCacheFlushInterval);
  }

  onFinalization_(heldValue) {
    const { destination, retainedId } = heldValue;

    if (!this.finalizationCache_[destination]) {
      this.finalizationCache_[destination] = [];
    }

    this.finalizationCache_[destination].push(retainedId);
    if (this.finalizationCache_[destination].length > 100) {
      this.flushFinalizationCache_(destination);
    }
  }

  flushAllFinalizationCaches_() {
    const destinations = Object.keys(this.finalizationCache_);
    destinations.forEach((destination) => this.flushFinalizationCache_(destination));
  }

  flushFinalizationCache_(destination) {
    if (!this.finalizationCache_[destination].length) {
      return;
    }

    this.router.route({
      type: 'final',
      destination,
      retainedIds: this.finalizationCache_[destination],
      from: this.router.name,
      source: this.router.path
    });
    this.finalizationCache_[destination] = [];
  }

  retain_(obj) {
    let retainedId;

    if (!retainedId) {
      retainedId = nanoid();
      this.retainedStore.set(retainedId, obj);
    }

    return retainedId;
  }

  toSchema(obj, parent = null, cycleTracker = [], doNotDescend = false) {
    let schema;

    if (typeof obj === 'object') {
      if (!isStructuredCloneable(obj)) {
        const retainedId = this.retain_(obj);
        const children = {};

        if (!doNotDescend) {
          this.deepToSchema_(obj, children, obj, cycleTracker);
        }
        schema = new SchemaNode('object', retainedId, children);
      } else {
        schema = new SchemaNode('value', null, obj);
      }
    } else if (typeof obj === 'function') {
      let fn = obj;

      if (parent) {
        try {
          fn = obj.bind(parent);
        } catch {
          // `bind`` can fail if the src is already a proxy
          // if it is, then it is probably already bound
          fn = obj;
        }
      }
      const retainedId = this.retain_(fn);

      schema = new SchemaNode('function', retainedId);
    } else {
      schema = new SchemaNode('value', null, obj);
    }

    return schema;
  }

  deepToSchema_(srcNode, dstNode, parent = null, cycleTracker) {
    const srcKeys = getAllProperties(srcNode);

    srcKeys.forEach(key => {
      const src = srcNode[key];

      if (cycleTracker.includes(src)) {
        return;
      }

      // Functions can repeat but their context will make them different
      if (typeof src === 'object') {
        cycleTracker.push(src);
      }

      dstNode[key] = this.toSchema(src, parent, cycleTracker, doNotDescend.includes(key));
    });
  }

  fromSchema(schema, path, needsFinalization = false) {
    let obj;

    if(typeof schema === 'object') {
      if (this.isSchema(schema)) {
        const type = schema.type;

        if (type === 'function') {
          obj = noop;
        } else if (type === 'object') {
          obj = {};
        } else if (type === 'value') {
          return schema.value;
        }
        if (schema.value) {
          this.deepFromSchema_(schema.value, obj, path, needsFinalization);
        } else if (type !== 'value') {
          obj[IHOP_PROXY_TAG] = true;
        }
        // it is import to descend into children first to buid the proxy-tree
        // from the bottom up
        obj = new Proxy(obj, ProxyHandler(this.router, this.promiseStore, this, path, schema.id));

        if (needsFinalization) {
          this.finalizationRegistry.register(obj, {
            destination: path,
            retainedId: schema.id
          });
        }
      } else {
        obj = {};
        this.deepFromSchema_(schema, obj, generatePath(path, key), needsFinalization);
      }
    } else {
      obj = src;
    }

    return obj;
  }

  deepFromSchema_(srcNode, dstNode = {}, path, needsFinalization) {
    const srcKeys = Object.keys(srcNode);

    srcKeys.forEach((key) => {
      dstNode[key] = this.fromSchema(srcNode[key], path, needsFinalization);
    });
  }

  isSchema(obj) {
    return (obj instanceof SchemaNode);
  }
}
