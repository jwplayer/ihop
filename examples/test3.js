let promiseWeakRef;

const resolvePromise = (val) => {
  const promiseRef = promiseWeakRef.deref();

  if (!promiseRef) return console.error(`Promise has been GC'd!`);

  promiseRef.resolve(val);
};

const fn = () => {
  let resolve;
  const p = new Promise((...args) => {
    [resolve] = args;
  });
  p.resolve = resolve;

  promiseWeakRef = new WeakRef(p);

  console.log('Before await...');
  // const v = await p;
  p.then((v) => {
    console.log('...after await', v);
  });
  return p;
  // Never reached?
  // Apparently the Execution Context does NOT maintain a
  // strong reference to the promise `p`?
  // return v;
};

const f = fn();
setTimeout(() => console.log(f), 1500);

// Ok we will resolve the promise later
setTimeout(resolvePromise, 1000, 'woo?');

// Garbage collect...
setTimeout(gc, 500);
