importScripts('../../dist/ihop.js');

const ihop = new IHop('work', {
  network: {
    parentWindow: self,
  }
});

ihop.import('root.div').then(async (div) => {
  div.innerHTML = 'Hello from worker!';
  const h1 = await div.previousElementSibling;
  h1.innerHTML = 'Worker Here';
});
