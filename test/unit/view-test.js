import sinon from 'sinon';
import EventEmitter from 'eventemitter3';

import View from '../../src/view.js';

const setup = () => {
  const model = new EventEmitter();
  const proxySchema = {};

  return {
    model,
    proxySchema,
    view: new View(model, proxySchema)
  };
};

QUnit.module('View');

QUnit.test(`#reifyModel_ is called on model 'changed' events`, async (assert) => {
  const { view, model, proxySchema } = setup();
  const fake =  sinon.fake.returns(undefined);

  view.reifyModel_ = fake;

  model.emit('changed', {foo: 'bar'});

  assert.equal(fake.callCount, 1, 'called once');

  model.emit('other', {foo: 'bar'});
  model.emit('changed', {foo: 'baz'});

  assert.equal(fake.callCount, 2, 'called twice');
});

QUnit.test(`#reifyModel_ emits a changed event`, async (assert) => {
  const { view, model, proxySchema } = setup();
  const fakeLevelToView_ =  sinon.fake.returns(undefined);
  const fakeEmit =  sinon.fake.returns(undefined);

  view.levelToView_ = fakeLevelToView_;
  view.emit = fakeEmit;

  view.reifyModel_({});

  assert.equal(fakeLevelToView_.callCount, 1, 'levelToView_ called once');
  assert.equal(fakeEmit.callCount, 1, 'emit called once');
  assert.equal(fakeEmit.firstArg, 'changed', 'emit called with event \'changed\'');
});

QUnit.test(`#levelToView_ detects schema and call fromSchema`, async (assert) => {
  const { view, model, proxySchema } = setup();
  const fake = sinon.fake.returns(undefined);

  proxySchema.fromSchema = fake;
  proxySchema.isSchema = sinon.fake.returns(true);

  view.reifyModel_({
    foo: {
      '@type': '@object',
      '@id': 'abc123',
    }
  });

  assert.equal(fake.callCount, 1, 'fromSchema called once');
  assert.deepEqual(fake.firstArg, {
      '@type': '@object',
      '@id': 'abc123',
    }, 'fromSchema called with the correct object');
});

QUnit.test(`#levelToView_ detects POJO and descends`, async (assert) => {
  const { view, model, proxySchema } = setup();
  const fake = sinon.replace(view, 'levelToView_', sinon.fake(view.levelToView_));

  proxySchema.isSchema = sinon.fake.returns(false);

  view.reifyModel_({
    bar: {}
  });

  assert.equal(fake.callCount, 2, 'levelToView_ called twice');
  assert.deepEqual(fake.secondCall.args, [{},{}, 'bar'], 'levelToView_ called with the correct arguments');
});

