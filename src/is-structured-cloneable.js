import getAllProperties from './get-all-properties.js';

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
  let k;
  try {
    structuredClone(o);

    if (typeof o === 'object') {
      const keys = getAllProperties(o);
      keys.forEach(key => {
        structuredClone(o[key]);
      });
    }

    return true;
  } catch(error) {
    return false;
  }
};

export default isStructuredCloneable2;

