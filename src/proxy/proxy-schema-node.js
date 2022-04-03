const schemaType = [
  'object',
  'function',
  'value'
];

export default class SchemaNode {
  constructor (type, id, value) {
    this.type = type;
    this.id = id;
    this.value = value;
  }

  static toPacked (node) {
    if (node.type === 'object') {
      let value;

      for (const key in node.value) {
        if (!value) {
          value = {};
        }
        const subObj = node.value[key];
        value[key] = SchemaNode.toPacked(subObj);
      }

      return [schemaType.indexOf(node.type), node.id, value];
    }

    return [schemaType.indexOf(node.type), node.id, node.value];
  }

  static fromPacked (arr) {
    const type = schemaType[arr[0]];

    if (type === 'object') {
      const orgValue = arr[2];
      let value;

      for (const key in orgValue) {
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
