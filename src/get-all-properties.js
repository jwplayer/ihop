const exclude = [
  '__proto__',
  'prototype',
  'constructor',
];

const getAllProperties = (obj) => {
  let res = [];
  let node = obj;

  while (node && node.constructor !== Object) {
    for(const key of Object.getOwnPropertyNames(node)){
      if (exclude.includes(key)) {
        continue;
      }
      if (!res.includes(key)) {
        res.push(key);
      }
    }

    node = Object.getPrototypeOf(node);
  }

  return res;
};

export default getAllProperties;
