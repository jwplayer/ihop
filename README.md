# IHOP: *The <iframe> Hopping Library*

IHOP is a utility to allow for objects from one iframe context to be usable from many connected contexts.

The term i-frame hopping refers that each participant in the "network" (tree, really) of window objects only communicates with it's immediate parent and children. Sending messages to window contexts beyond the immediate family must be repeated by intermediate nodes (hopping).

At its core, IHOP is three things:
1. A featureful proxy engine that can generate proxies for complex objects (even DOM elements)
2. A network-agnostic routing fabric designed for hierarchical topologies
3. a globally-coherent state built on top of the routing fabric

## Usage

Step1 - Include ihop on your page
````html
<script type="text/javascript" src="ihop.min.js"></script>
````

Step 2 - Initialize ihop
````html
<script type="text/javascript">
  const ihop = new IHOP('pick_a_namespace');
  ...
````

Step 3 - Either export an object
````html
  ...
  ihop.export('test', { foo: 'bar' });
</script>
````

Step 4 - Use an object from the IHOP runtime
````html
<script type="text/javascript">
  // This is assuming that we are in another iframe:
  ihop.waitFor('pick_a_namespace.test').then((test) => {
    console.log(test.foo);
  });
</script>
````

Congratulations! You’ve just successfully used IHOP to export an object across iframe barriers!

## API

<a name="IHOP"></a>
* [new IHOP(nameSpace, options)](#IHOP.constructor)
    * _methods_
        * [.export(name, object)](#IHOP.export) ⇒ <code>void</code>
        * [.waitFor(path)](#IHOP.waitFor) ⇒ <code>Promise</code>
        * [.registerWorker(worker)](#IHOP.registerWorker) ⇒ <code>void</code>
    * _properties_
        * [.tree](#IHOP.tree)

<a name="IHOP.constructor"></a>
### IHOP(nameSpace, options) ⇒ <code>instance</code>
Construct the local IHOP instance.

**Kind**: constructor of <code>[IHOP](#IHOP)</code>

| Param | Type | Description |
| --- | --- | --- |
| nameSpace | <code>string</code> | A globally available name-space to hold all of this context's exported objects. |
| options | <code>object</code> | Options to alter default behavior. |
| [options.model] | <code>object</code> | Container for Model-related options. |
| [options.model.forceRoot] | <code>boolean</code> | Set to true to stop this node from attempting to contact it's parent. |
| [options.network] | <code>object</code> | Container for Network-related options. |
| [options.network.allowedOrigins] | <code>array&lt;string&gt;</code> | A list of allowed origins for child nodes. Any messages received from origins not listed are immediately dropped. Leave empty to allow all origins. |
| [options.network.parentOrigin] | <code>string</code> | The allowed origin to use when communicating with the context's parent. |
| [options.network.parentWindow] | <code>window</code> | Override the default parent context. Mainly useful when initializing IHOP in an Worker context. |

**Example**
```js
> const ihop = new IHOP('myNameSpace');
```

<a name="IHOP.export"></a>
### ihop.export(name, object) ⇒ <code>void</code>
Makes `object` available to every connected iframe via `name` within this iframe's namespace.

**Kind**: instance method of <code>[IHOP](#IHOP)</code>

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name to export the object under in the current namespace. |
| object | <code>object|function</code> | The object or function to expose. |

**Example**
```js
> const ihop = new IHOP('foo');
> const bar = {baz: 'hello!'};

// Make the 'bar' object available in other contexts under 'foo.bar'
> ihop.export('bar', baz);
```

<a name="IHOP.waitFor"></a>
### ihop.waitFor(path) ⇒ <code>Promise</code>
Waits for a specific path to becomes available and then resolves the promise with the object or namespace at that path.

**Kind**: instance method of <code>[IHOP](#IHOP)</code>

| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | A path is one or more namespaces separated by a period (.) and optionally a final exported name. NOTE: The root namespace is omitted when forming a path. |

**Example**
```js
// An iframe with the namespace `A` contains another iframe with the namespace `B`
// The iframe `B` exports an object named `foo`
> ihop.waitFor('A.B.foo').then((foo) => {
    // Do something with 'foo'
  });

// The root-context - ie. the main page - exports an object named `bar`
> ihop.waitFor('bar').then((bar) => {
    // Do something with 'bar'
  });

// Wait for more than one export
> Promise.all([
      ihop.waitFor('A.B.foo'),
      ihop.waitFor('bar')
    ]).then(([foo, bar]) => {
    // Do something with 'foo' and 'bar'
  });

```

<a name="IHOP.registerWorker"></a>
### ihop.registerWorker(worker) ⇒ <code>void</code>
Register a web worker context. Workers are not able to automatically register themselves like iframes and must be explicitly linked in their parent context.

**Kind**: instance method of <code>[IHOP](#IHOP)</code>

| Param | Type | Description |
| --- | --- | --- |
| worker | <code>Worker</code> | An instance of a Web Worker. |

**Example**
```js
> const worker = new Worker('worker.js');
> ihop.registerWorker(worker);
```

<a name="IHOP.tree"></a>
### ihop.tree ⇒ <code>object</code>
The root namespace under which all other namepspaces and their exports reside.

**Kind**: instance property of <code>[IHOP](#IHOP)</code>

**Example**
```js
// An iframe with the namespace `A` contains another iframe with the namespace `B`
// The iframe `B` exports an object named `foo`
> ihop.waitFor('A.B.foo').then(() => {
    // We can also access foo via:
    const foo = ihop.tree.A.B.foo;
  });
```

## Advanced

IHOP has support for some pretty advanced proxying. Not only can you export DOM nodes and manipulate them as though they were local, but you can also treat functions as local too.

This means that you can pass functions across the proxy and even return functions from other functions. The proxy engine handles all the fun stuff behind the scenes for you.

For example let's say that you export a function that returns a function from I-frame A:

````html
<script type="text/javascript">
  const ihop = new IHOP('A');

  const compose = (fnA, fnB) => async (...args) => await fnA(await fnB(...args));

  ihop.export('compose', compose);
</script>
````

NOTE: When we execute the fnA and fnB functions, we need to `await` - any function passed between contexts has it’s return value encapsulated in a promise.

Now in B, you want to use that function:

````html
<script type="text/javascript">
  const ihop = new IHOP('B');

  ihop.waitFor('A.compose').then(async (compose) => {
    const add = (a, b) => a + b;
    const double = (n) => n * 2;

   const sumAndDouble = await compose(double, add);

   console.log(await sumAndDouble(3, 4));
  });
</script>
````

And it just works!

## Architecture
<img src="https://docs.google.com/drawings/d/e/2PACX-1vR0bvjQoC98Li7Qj7g5TR4qwF3PdBLQ8jnt2-MsfVc4n1sbPMKC08_pfqQ4-Z3mvOOawE8q-neWdWyc/pub?w=1440&amp;h=1080">

Blue labels represent event types.

## Caveats

There are a few things to be aware of when using this library.

### Performance

Don't expect performing magic to be fast. This library should not be used for performance intensive operations. Even events that trigger more than a few times a second are not a good fit for cross-frame access.

### Synchronization

Exported objects are running in different threads and the library doesn't provide any synchronization primitives. Operations can happen out of order and nothing is atomic. It's best to avoid making changes to an object from more than one context.

### Proxying

There are obviously going to be places where the proxying breaks down but every attempt has been made to make it as transparent as possible.

Currently unsupported operations on objects:
1. constructors
2. get/setPrototypeOf
3. delete statement on properties
