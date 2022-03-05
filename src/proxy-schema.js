import { nanoid } from 'nanoid';
import isStructuredCloneable from './is-structured-cloneable';
import ProxyHandler from './proxy-handler';
import generatePath from './generate-path';
import { IHOP_PROXY_TAG } from './constants';

const noop = function() {};

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
      const retainedId = this.retain_(obj);
      schema = {
        '@type': '@object',
        '@id': retainedId
      };

      if (!isStructuredCloneable(obj)) {
        schema['@children'] = {};
        this.deepToSchema_(obj, schema['@children'], obj);
      }
    } else if (typeof obj === 'function') {
      const retainedId = this.retain_(obj);

      schema = {
        '@type': '@function',
        '@id': retainedId
      };
    } else {
      schema = obj;
    }

    return schema;
  }

  deepToSchema_(srcNode, dstNode, parent = null, cycleTracker = []) {
    const srcKeys = Object.keys(srcNode);

    for (const key in srcNode) {
      const src = srcNode[key];

      if (cycleTracker.indexOf(src) > -1) {
        continue;
      }

      if (typeof src === 'object' && src !== null) {
        const retainedId = this.retain_(src);
        dstNode[key] = {
          '@type': '@object',
          '@id': retainedId
        };

        cycleTracker.push(src);

        if (!isStructuredCloneable(src)) {
          dstNode[key]['@children'] = {};
          this.deepToSchema_(srcNode[key], dstNode[key]['@children'], src, cycleTracker);
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

        dstNode[key] = {
          '@type': '@function',
          '@id': retainedId
        };
      } else {
        // dstNode[key] = src;
      }
    }
  }

  fromSchema(schema, path, needsFinalization = false) {
    let obj;

    if(typeof schema === 'object') {
      if (this.isSchema(schema)) {
        const type = schema['@type'];

        if (type === '@function') {
          obj = noop;
        } else if (type === '@object') {
          obj = {};
        }
        obj[IHOP_PROXY_TAG] = schema;

        if ('@children' in schema) {
          this.deepFromSchema_(schema['@children'], obj, path, needsFinalization);
        }
        // it is import to descend into children first to buid the proxy-tree
        // from the bottom up
        obj = new Proxy(obj, ProxyHandler(this.router, this.promiseStore, this, path, schema['@id']));

        if (needsFinalization) {
          this.finalizationRegistry.register(obj, {
            destination: path,
            retainedId: schema['@id']
          });
        }
      } else {
        obj = {};
        obj[IHOP_PROXY_TAG] = schema;

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
        if ('@id' in src && '@type' in src) {
          const type = src['@type'];

          if (type === '@function') {
            dstNode[key] = noop;
          } else if (type === '@object') {
            dstNode[key] = {};
          }

          if ('@children' in src) {
            this.deepFromSchema_(src['@children'], dstNode[key], path, needsFinalization);
          }

          // it is import to descend into children first to buid the proxy-tree
          // from the bottom up
          dstNode[key] = new Proxy(dstNode[key], ProxyHandler(this.router, this.promiseStore, this, path, src['@id']));

          if (needsFinalization) {
            this.finalizationRegistry.register(dstNode[key], {
              destination: path,
              retainedId: src['@id']
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
    return (obj !== null && typeof obj ==='object' && '@id' in obj && '@type' in obj);
  }
}
