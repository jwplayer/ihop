import sinon from 'sinon';
import EventEmitter from 'eventemitter3';

import Router from '../../src/router.js';
import globalMock from './mocks/global.js';

const setup = () => {
  const network = new EventEmitter();
  return {
    network,
    router: new Router('test', network)
  };
};

QUnit.module('Router');

QUnit.test(`#toParent appends 'from' property to messages`, async (assert) => {
  const { router, network } = setup();
  const fake =  sinon.fake.returns(undefined);

  network.toParent = fake;

  router.toParent({ foo: 'bar' });

  assert.equal(fake.callCount, 1, 'Network#toParent called once');
  assert.deepEqual(fake.firstArg, { foo: 'bar', from: 'test' }, 'Added the from property to the message');
});

QUnit.test(`#toAllChildren appends 'from' property to messages`, async (assert) => {
  const { router, network } = setup();
  const fake = sinon.fake.returns(undefined);

  network.toAllChildren = fake;

  router.toAllChildren({ foo: 'bar' });

  assert.equal(fake.callCount, 1, 'Network#toAllChildren called once');
  assert.deepEqual(fake.firstArg, { foo: 'bar', from: 'test' }, 'Added the from property to the message');
});

QUnit.test(`#onMessage_ called for every event emitted by Network`, async (assert) => {
  const { router, network } = setup();
  const fake = sinon.replace(router, 'onMessage_', sinon.fake.returns(undefined));

  network.emit('message', {
    path: 'foo'
  });

  assert.equal(fake.callCount, 1, 'called once');

  network.emit('message', {
    type: 'other',
    path: 'bar'
  });

  network.emit('message', {});

  assert.equal(fake.callCount, 3, 'called thrice');
});

QUnit.test(`#path is updated as messages containing 'path' are recieved`, async (assert) => {
  const { router, network } = setup();

  network.emit('message', {
    path: 'foo.bar'
  });

  assert.equal(router.path, 'foo.bar.test', 'router.path updated');
});

QUnit.test(`#nodeMap_ is updated as messages containing 'from' are recieved`, async (assert) => {
  const { router, network } = setup();

  network.emit('message', {
    from: 'foo',
    nodeId: 'abc123'
  });

  assert.equal(router.nodeMap_.get('foo'), 'abc123', 'nodeMap_ has new association');
});

QUnit.test(`#isDestinationChildOrSelf_ correctly detects child and self destinations`, async (assert) => {
  const { router, network } = setup();

  router.path = 'foo.bar';

  assert.true(router.isDestinationChildOrSelf_('foo.bar.baz'), 'properly detects child path');
  assert.true(router.isDestinationChildOrSelf_('foo.bar'), 'properly detects self path');
  assert.false(router.isDestinationChildOrSelf_('foo'), 'properly detects parent path');
});

QUnit.test(`#isDestinationSelf_ correctly detects only self destinations`, async (assert) => {
  const { router, network } = setup();

  router.path = 'foo.bar';

  assert.false(router.isDestinationSelf_('foo.bar.baz'), 'properly detects child path');
  assert.true(router.isDestinationSelf_('foo.bar'), 'properly detects self path');
  assert.false(router.isDestinationSelf_('foo'), 'properly detects parent path');
});

//ffff

QUnit.test(`#route correctly routes to parent`, async (assert) => {
  const { router, network } = setup();
  const fake =  sinon.fake.returns(undefined);

  network.toParent = fake;

  router.name = 'bar';
  router.path = 'foo.bar';

  network.emit('message', {
    type: 'aType',
    destination: 'foo',
    from: 'baz'
  });

  assert.equal(fake.callCount, 1, 'called toParent');
  assert.deepEqual(fake.firstArg, {
    type: 'aType',
    destination: 'foo',
    from: 'bar'
  }, 'toParent called with correct object');
});

QUnit.test(`#route correctly routes to children`, async (assert) => {
  const { router, network } = setup();
  const fake =  sinon.fake.returns(undefined);

  network.toNode = fake;

  router.name = 'bar';
  router.path = 'foo.bar';
  router.nodeMap_.set('baz', 'anotherNode');

  network.emit('message', {
    type: 'aType',
    destination: 'foo.bar.baz',
    from: 'foo'
  });

  assert.equal(fake.callCount, 1, 'called toNode');
  assert.equal(fake.firstArg, 'anotherNode', 'toNode called on correct node');
  assert.deepEqual(fake.lastArg, {
    type: 'aType',
    destination: 'foo.bar.baz',
    from: 'bar'
  }, 'toNode called with correct object');
});

QUnit.test(`#route correctly routes to self`, async (assert) => {
  const { router, network } = setup();
  const fake = sinon.replace(router, "emit", sinon.fake.returns(undefined));

  router.name = 'bar';
  router.path = 'foo.bar';

  network.emit('message', {
    type: 'aType',
    destination: 'foo.bar',
    from: 'foo'
  });

  assert.equal(fake.callCount, 1, 'called emit');
  assert.equal(fake.firstArg, 'aType', 'event has correct name');
  assert.deepEqual(fake.lastArg, {
    type: 'aType',
    destination: 'foo.bar',
    from: 'foo'
  }, 'emit called with correct object');
});
