import global from 'global';
import SchemaNode from './proxy-schema-node.js';

// Use a simple packing scheme by default to de/ser SchemaNodes
let codec = {
  decode: function (obj) {
    // We need to make SchemaNodes out of schema-node-likes
    if (Array.isArray(obj)) {
      return obj.map(elem => {
        return this.decode(elem);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      if (obj['@type'] === 'SchemaNode') {
        return SchemaNode.fromPacked(obj.packed);
      } else {
        const props = Object.keys(obj);
        const out = {};
        props.forEach(prop => {
          out[prop] = this.decode(obj[prop]);
        });
        return out;
      }
    }
    return obj;
  },
  encode: function (obj) {
    if (obj instanceof SchemaNode) {
      return { '@type': 'SchemaNode', packed: SchemaNode.toPacked(obj) };
    } else if (Array.isArray(obj)) {
      return obj.map(elem => {
        return this.encode(elem);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      const props = Object.keys(obj);
      const out = {};
      props.forEach(prop => {
        out[prop] = this.encode(obj[prop]);
      });
      return out;
    }
    return obj;
  }
};

// But if the MessagePackR library is available then use that instead
if (global.msgpackr) {
  const { Packr, addExtension } = global.msgpackr;
  const packr = new Packr();

  // Type-extension for msgpackr to (de/en)code SchemaNodes
  addExtension({
    Class: SchemaNode,
    type: 80,
    write(instance) {
      return SchemaNode.toPacked(instance); // return some data to be encoded
    },
    read(data) {
      return SchemaNode.fromPacked(data); // return decoded value
    }
  });

  codec = {
    decode: (obj) => packr.decode(obj),
    encode: (obj) => packr.encode(obj),
  };
}

export default {
  global,
  codec,
};
