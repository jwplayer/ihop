import { nanoid } from 'nanoid';

import isStructuredCloneable from './is-structured-cloneable.js';
import ProxyHandler from './proxy-handler.js';
import generatePath from './generate-path.js';
import { IHOP_PROXY_TAG } from './constants.js';
import getAllProperties from './get-all-properties.js';
import SchemaNode from './proxy-schema-node.js';

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

    this.finalizationRegistry = new FinalizationRegistry((heldValue) => this.onFinalization(heldValue));
  }

  onFinalization(heldValue) {
    const { destination, retainedId } = heldValue;

    this.router.route({
      type: 'final',
      destination,
      retainedId,
      from: this.router.name,
      source: this.router.path
    });
  }

  retain_(obj) {
    let retainedId;// = this.retainedStore.find(obj);

    if (!retainedId) {
      retainedId = nanoid();
      this.retainedStore.set(retainedId, obj);
    }

    return retainedId;
  }

  toSchema(obj) {
    let schema;

    if (typeof obj === 'object') {
      if (!isStructuredCloneable(obj)) {
        const retainedId = this.retain_(obj);
        const children = {};
        this.deepToSchema_(obj, children, obj);
        schema = new SchemaNode('object', retainedId, children);
      } else {
        schema = new SchemaNode('value', null, obj);
      }
    } else if (typeof obj === 'function') {
      const retainedId = this.retain_(obj);

      schema = new SchemaNode('function', retainedId);
    } else {
      schema = new SchemaNode('value', null, obj);
    }

    return schema;
  }

  deepToSchema_(srcNode, dstNode, parent = null, cycleTracker = []) {
    const srcKeys = Object.keys(srcNode);
    const keys = getAllProperties(srcNode);

    keys.forEach(key => {
      const src = srcNode[key];

      if (cycleTracker.includes(src)) {
        return;
      }

      if (typeof src === 'object' && src !== null) {
        cycleTracker.push(src);
        if (!doNotDescend.includes(key)) {
          if (!isStructuredCloneable(src)) {
            const retainedId = this.retain_(src);
            const children = {};

            this.deepToSchema_(srcNode[key], children, src, cycleTracker);
            dstNode[key] = new SchemaNode('object', retainedId, children);
          } else {
            dstNode[key] = new SchemaNode('value', null, src);
          }
        }
      } else if (typeof src === 'function') {
        let fn = src;
        if (parent) {
          try {
            // `bind`` can fail if the src is already a proxy
            // if it is, then it is probably already bound
            fn = src.bind(parent);
          } catch {
            fn = src;
          }
        }
        const retainedId = this.retain_(fn);

        dstNode[key] = new SchemaNode('function', retainedId);
      } else {
        // TODO: Necessary?
        dstNode[key] = new SchemaNode('value', null, src);
      }
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
          return schema.value
        }
        obj[IHOP_PROXY_TAG] = schema;

        if (schema.value) {
          this.deepFromSchema_(schema.value, obj, path, needsFinalization);
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
        // obj[IHOP_PROXY_TAG] = schema;

        this.deepFromSchema_(schema, obj, generatePath(path, key), needsFinalization);
      }
    } else {
      obj = src;
    }

    return obj;
  }

  deepFromSchema_(srcNode, dstNode = {}, path, needsFinalization) {
    const srcKeys = Object.keys(srcNode);
    const dstKeys = Object.keys(dstNode);

    srcKeys.forEach((key) => {
      const src = srcNode[key];

      if (typeof src === 'object') {
        if (this.isSchema(src)) {
          const type = src.type;

          if (type === 'function') {
            dstNode[key] = noop;
          } else if (type === 'object') {
            dstNode[key] = {};
          } else if (type === 'value') {
            return dstNode[key] = src.value;
          }

          if (src.value) {
            this.deepFromSchema_(src.value, dstNode[key], path, needsFinalization);
          }

          // it is import to descend into children first to buid the proxy-tree
          // from the bottom up
          dstNode[key] = new Proxy(dstNode[key], ProxyHandler(this.router, this.promiseStore, this, path, src.id));

          if (needsFinalization) {
            this.finalizationRegistry.register(dstNode[key], {
              destination: path,
              retainedId: src.id
            });
          }
        } else {
          dstNode[key] = {};
          this.deepFromSchema_(src, dstNode[key], generatePath(path, key), needsFinalization);
        }
      } else {
        dstNode[key] = src;
      }
    });
  }

  isSchema(obj) {
    return (obj instanceof SchemaNode);
  }
}
