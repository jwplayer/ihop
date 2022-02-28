import { nanoid } from 'nanoid';
import isStructuredCloneable from './is-structured-cloneable';
import ProxyHandler from './proxy-handler';
import generatePath from './generate-path';

const noop = () => {};
const noobj = {};

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
        this.deepToSchema_(obj, schema['@children']);
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

  deepToSchema_(srcNode, dstNode) {
    const srcKeys = Object.keys(srcNode);

    srcKeys.forEach((key) => {
      const src = srcNode[key];
      if (typeof src === 'object') {
        const retainedId = this.retain_(src);

        dstNode[key] = {
          '@type': '@object',
          '@id': retainedId
        };

        if (!isStructuredCloneable(src)) {
          dstNode[key]['@children'] = {};
          this.deepToSchema_(srcNode[key], dstNode[key]['@children']);
        }
      } else if (typeof src === 'function') {
        const retainedId = this.retain_(src);

        dstNode[key] = {
          '@type': '@function',
          '@id': retainedId
        };
      } else {
        dstNode[key] = src;
      }
    });
  }

  fromSchema(schema, path, needsFinalization = false) {
    let obj = {};

    if(typeof schema === 'object') {
      if (this.isSchema(schema)) {
        if (schema['@type'] === '@function') {
          obj = noop;
        } else {
          obj = noobj;
        }
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

      if(typeof src === 'object') {
        if ('@id' in src && '@type' in src){
          if (src['@type'] === '@function') {
            dstNode[key] = noop;
          } else {
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
              retainedId: schema['@id']
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
    return (typeof obj ==='object' && '@id' in obj && '@type' in obj);
  }
}
