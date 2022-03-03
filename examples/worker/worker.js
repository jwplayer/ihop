importScripts('../../dist/ihop.js');

const ihop = new IHOP('work', {
  network: {
    parentWindow: self,
  }
});

ihop.waitFor('div').then(async (div) => {
  div.innerHTML = 'Hello from worker!';
  const h1 = await div.previousElementSibling;
  h1.innerHTML = 'Worker Here';
});
