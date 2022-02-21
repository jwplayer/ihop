const primitiveTypes = ['string', 'number', 'boolean', 'bigint', 'undefined'];
const objectTypes = [
  '[object String]',
  '[object Number]',
  '[object Boolean]',
  // '[object Date]',
  // '[object RegExp]',
  // '[object Blob]',
  // '[object File]',
  // '[object FileList]',
  // '[object ArrayBuffer]',
  // '[object ArrayBufferView]',
  // '[object ImageBitmap]',
  // '[object ImageData]',
  // '[object Array]',
  // '[object Map]',
  // '[object Set]',
];

const isStructuredCloneable = (o) => {
  if (primitiveTypes.indexOf(typeof o) !== -1) {
    return true;
  }
  if (objectTypes.indexOf(Object.prototype.toString.call(o)) !== -1) {
    return true;
  }
  return false;
};

const isStructuredCloneable2 = (o) => {
  try {
    structuredClone(o);
    return true;
  } catch(error) {
    return false;
  }
};

export default isStructuredCloneable2;

