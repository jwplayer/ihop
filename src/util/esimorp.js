// Backwards promise - resolvable from outside
const esimorp = () => {
  let localResolve, localReject;
  const promise = new Promise((resolve, reject) => {
    localResolve = resolve;
    localReject = reject;
  });
  promise.resolve = localResolve;
  promise.reject = localReject;
  return promise;
};

export default esimorp;
