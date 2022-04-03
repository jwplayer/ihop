const generatePath = (base, part) => (base.length ? `${base}.${part}` : part);

export default generatePath;
