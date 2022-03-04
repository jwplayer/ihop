# IHOP

IHOP is a utility to allow for objects from one iframe context to be usable from many connected contexts. At its core, IHOP is two things: a featureful proxy engine and a globally-coherent state built and maintained via inter-frame messaging.

## Usage

Step1 - Include ihop on your page
````html
<script type="text/javascript" src="ihop.min.js"></script>
````

Step 2 - Initialize ihop
````html
<script type="text/javascript">
  const ihop = new IHOP('pick_a_namespace');
</script>
````

Step 3 - Either export an object
````html
<script type="text/javascript">
  ihop.export(‘test’, { foo: ‘bar’ });
</script>
````

Step 4 - Use an object from the IHOP runtime
````html
<script type="text/javascript">
  // This is assuming that we are in another iframe:
  ihop.waitFor(‘pick_a_namespace.test’).then((test) => {
    console.log(test.foo);
  });
</script>
````

Congratulations! You’ve just successfully used IHOP to export an object across iframe barriers!

## Advanced

IHOP has support for some pretty advanced proxying. Not only can you export DOM nodes and manipulate them as though they were local, but you can also treat functions as local too.

This means that you can pass functions across the proxy and even return functions from other functions. The proxy engine handles all the fun stuff behind the scenes for you.

For example let's say that you export a function that returns a function from I-frame A:

````html
<script type="text/javascript">
  const ihop = new IHOP(‘A’);

  const compose = (fnA, fnB) => async (...args) => await fnA(await fnB(...args));

  ihop.export(‘compose’, compose);
</script>
````

NOTE: When we execute the fnA and fnB functions, we need to `await` - any function passed between contexts has it’s return value encapsulated in a promise.

Now in B, you want to use that function:

````html
<script type="text/javascript">
  const ihop = new IHOP(‘B’);

  ihop.waitFor(‘A.compose’).then(async (compose) => {
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

## Caveats

There are a few things to be aware of wehn using this library.

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
