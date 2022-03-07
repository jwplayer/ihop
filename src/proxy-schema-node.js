import { addExtension } from 'msgpackr';

const schemaType = [
  'object',
  'function',
  'value'
];

export default class SchemaNode {
  constructor(type, id, value) {
    this.type = type;
    this.id = id;
    this.value = value;
  }

  static toPacked(node) {
    if (node.type === 'object') {
      let value;

      for (const key in node.value ) {
        if (!value) {
          value = {};
        }
        const subObj = node.value[key];
        value[key] = SchemaNode.toPacked(subObj);
      }

      return [ schemaType.indexOf(node.type), node.id, value ];
    }

    return [ schemaType.indexOf(node.type), node.id, node.value ];
  }

  static fromPacked(arr) {
    const type = schemaType[arr[0]];

    if (type === 'object') {
      const orgValue = arr[2];
      let value;

      for (const key in orgValue ) {
        if (!value) {
          value = {};
        }
        const subObj = orgValue[key];
        value[key] = SchemaNode.fromPacked(subObj);
      }

      return new SchemaNode(type, arr[1], value);
    }

    return new SchemaNode(type, arr[1], arr[2]);
  }
}

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
