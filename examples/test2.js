// This will hold a weak reference to the promise
let promiseRef;
// But the promise should be held strongly by the execution
// context of `fn`, right?
const delay = (time, v) => new Promise(accept => setTimeout(accept, time, v));

const resolvePromise = (val) => {
  promiseRef.resolve(val);
  // Dereference the promise
  promiseRef = null;
};

const obj = {
  get foo() {
    let resolve;
    const promise = new Promise((...args) => {
      [resolve] = args;
    });
    promise.resolve = resolve;
    promiseRef = promise;

    // Ok we will resolve the promise later
    setTimeout(resolvePromise, 500, 'woo?');

    // Garbage collect...
    setTimeout(gc, 1000);

    return promise;
  }
};

const fn = async (arg) => {
  console.log('Before await...');

  // Maintain a strong reference to the promise?
  const p = arg.foo;

  // See! It's really here...
  console.log(`It's a promise:`, p);

  p.then(async (v) => {
    console.log('In then', v);
    return delay(1000, v);
  }).then((v)=> {
    console.log('In then2',v);
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
