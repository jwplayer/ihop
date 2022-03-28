const generatePath = (base, part) => {
  return base.length ? `${base}.${part}` : part;
};

export default generatePath;
