// This will hold a weak reference to the promise
let promiseWeakRef;
// But the promise should be held strongly by the execution
// context of `fn`, right?
let strongRef;

const resolvePromise = (val) => {
  const promiseRef = promiseWeakRef.deref();

  if (!promiseRef) return console.error(`Promise has been GC'd!`);

  promiseRef.resolve(val);
};

const thenable = () => {
  let next;
  let handler;
  return {
    then: (resolved, rejected) => {
      handler = resolved;
      next = thenable();
      return next;
    },
    resolve: (val) => {
      if (next) {
        const retVal = handler(val);
        next.resolve(retVal);
      }
    }
  }
}

const obj = {
  get foo() {
    let resolve;
    /*const promise = new Promise((...args) => {
      [resolve] = args;
    });
    promise.resolve = resolve;*/
    const promise = thenable();
    promiseWeakRef = new WeakRef(promise);
    //strongRef = promise;
    // Ok we will resolve the promise later
    setTimeout(resolvePromise, 1000, 'woo?');

    // Garbage collect...
    setTimeout(gc, 500);

    return promise;
  }
};

const fn = async (arg) => {
  console.log('Before await...');

  // Maintain a strong reference to the promise?
  const p = arg.foo;

  // See! It's really here...
  console.log(`It's a promise:`, p);

  p.then((v) => {
    console.log('In then', p, v);
  });
//  const v = await p;
  // Never reached?
  // Apparently the Execution Context does NOT maintain a
  // strong reference to the promise `p`?
  console.log('After await:', p);

  //return v;
};

// Thought this might help...
const v = fn(obj);

// But no it's never reached either!
console.log('End of program!', v);
