# memoize-fs

Node.js solution for memoizing/caching function results on the file system

[![Coverage Status](https://coveralls.io/repos/borisdiakur/memoize-fs/badge.svg?branch=main)](https://coveralls.io/r/borisdiakur/memoize-fs?branch=main)
[![npm version](https://badge.fury.io/js/memoize-fs.svg)](http://badge.fury.io/js/memoize-fs)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

## Motivation
Sometimes you have to persist cached function calls, but you do not want to deal with an extra process (i.e. managing a Redis store).

Memoization is the best technique to save on memory or CPU cycles when we deal with repeated operations. For detailed insight see:
http://en.wikipedia.org/wiki/Memoization

## Features

* Works with [almost](#common-pitfalls) all kind and any length of function arguments ([__serialization__](#serialization) is handled under the hood)
* Supports memoization of [__asynchronous functions__](#memoizing-asynchronous-functions)
* Supports memoization of [__promisified functions__](#memoizing-promisified-functions)
* Cache [__can be invalidated manually__](#manual-cache-invalidation)

## Installation

In your project path:

```shell
npm install memoize-fs --save
```

## Usage

```js
const assert = require('assert')
const memoizeFs = require('memoize-fs')

const memoizer = memoizeFs({ cachePath: './some-cache' })

console.log(memoizer)
// => {
//  fn: [AsyncFunction: fn],
//  getCacheFilePath: [Function: t],
//  invalidate: [AsyncFunction: e]
// }

async function main () {
  let idx = 0
  const func = function foo (a, b) {
    idx += a + b
    return idx
  }

  const memoizedFn = await memoizer.fn(func)
  const resultOne = await memoizedFn(1, 2)

  assert.strictEqual(resultOne, 3)
  assert.strictEqual(idx, 3)

  const resultTwo = await memoizedFn(1, 2) // cache hit
  assert.strictEqual(resultTwo, 3)
  assert.strictEqual(idx, 3)
}

main().catch(console.error)
```

_**NOTE:** that memoized function is always an async function and
the result of it is a Promise (if not `await`-ed as seen in above example)!_

- [Learn more about Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [Learn more about async/await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)

### Signature

See [Types](#types) and [Options](#options) sections for more info.

```ts
const memoizer = memoizeFs(options)

console.log(memoizer)
// => {
//  fn: [AsyncFunction: fn],
//  getCacheFilePath: [Function: t],
//  invalidate: [AsyncFunction: e]
// }

const memoizedFn = memoizer.fn(functionToMemoize, options)
```

## Memoizing asynchronous functions

memoize-fs assumes a function asynchronous if the last argument it accepts is of type `function` and that function itself accepts at least one argument.
So basically you don't have to do anything differently than when memoizing synchronous functions. Just make sure the above condition is fulfilled.
Here is an example of memoizing a function with a callback:

```js
const funAsync = function (a, b, cb) {
  setTimeout(function () {
    cb(null, a + b);
  }, 100);
};

const memFn = await memoize.fn(funAsync)

await memFn(1, 2, function (err, sum) { if (err) { throw err; } console.log(sum); })
await memFn(1, 2, function (err, sum) { if (err) { throw err; } console.log(sum); }) // cache hit
```

## Memoizing promisified functions

You can also memoize a promisified function. memoize-fs assumes a function promisified if its result is _thenable_
which means that the result is an object with a property `then` of type `function`
(read more about JavaScript promises [here](http://www.html5rocks.com/en/tutorials/es6/promises/?redirect_from_locale=de)).
So again it's the same as with memoizing synchronous functions.
Here is an example of memoizing a promisified function:

```js
const memoizer = memoizeFs({ cachePath: './some-cache' })

const funAsync = function (a, b, cb) {
  setTimeout(function () {
    cb(null, a + b)
  }, 100)
}

;(async () => {
  const memFn = await memoizer.fn(funAsync)

  await memFn(1, 2, function (err, sum) {
    if (err) throw err
    console.log(sum)
  })
  await memFn(1, 2, function (err, sum) {
    if (err) throw err
    console.log(sum)
  }) // cache hit
})()
```

## Types

```ts
export interface MemoizerOptions {
  cacheId: string
  cachePath: string
  salt: string
  maxAge: number
  force: boolean
  astBody: boolean
  noBody: boolean
  throwError: boolean
  retryOnInvalidCache: boolean
  serialize: (val: unknown) => string
  deserialize: (val: string) => unknown
}

export declare function getCacheFilePath(
  fn: unknown,
  args: unknown[],
  opt: Partial<MemoizerOptions>
): string

export default function buildMemoizer(
  memoizerOptions: Partial<MemoizerOptions>
): {
  fn: <FN extends (...args: never) => unknown>(
    fn: FN,
    opt?: Partial<MemoizerOptions>
  ) => Promise<(...args: Parameters<FN>) => Promise<ReturnType<FN>>>
  getCacheFilePath: (
    fn: (...args: never) => unknown,
    args: unknown[],
    opt: Partial<MemoizerOptions>
  ) => string
  invalidate: (cacheId?: string) => Promise<void>
}
```

## Options

When memoizing a function all below options can be applied in any combination.
The only required option is `cachePath`.

### cachePath

Path to the location of the cache on the disk. This option is always **required**.

### cacheId

By default all cache files are saved into the __root cache__ which is the folder specified by the cachePath option:

```js
const path = require('path')
const memoizer = require('memoize-fs')({ cachePath: path.join(__dirname, '../../cache') })
```

The `cacheId` option which you can specify during memoization of a function resolves to the name of a subfolder created inside the root cache folder.
Cached function calls will be cached inside that folder:

```js
memoizer.fn(fnToMemoize, { cacheId: 'foobar' })
```

### salt

Functions may have references to variables outside their own scope. As a consequence two functions which look exactly the same
(they have the same function signature and function body) can return different results even when executed with identical arguments.
In order to avoid the same cache being used for two different functions you can use the `salt` option
which mutates the hash key created for the memoized function which in turn defines the name of the cache file:

```js
memoizer.fn(fnToMemoize, { salt: 'foobar' })
```

### maxAge

With `maxAge` option you can ensure that cache for given call is cleared after a predefined period of time (in milliseconds).

```js
memoizer.fn(fnToMemoize, { maxAge: 10000 })
```

### force

The `force` option forces the re-execution of an already memoized function and the re-caching of its outcome:

```js
memoizer.fn(fnToMemoize, { force: true })
```

**NOTE** that using the force option you are invalidating one single function outcome with specific arguments passed to that function
(the first after memoization). All other previously cached results for that function are kept in the cache. If you need to invalidate
all cache for a function, you can use [cache invalidation](#manual-cache-invalidation).

### astBody

If you want to use the function AST instead the function body when generating the hash ([see serialization](#serialization)), set the option `astBody` to `true`. This allows the function source code to be reformatted without busting the cache. See https://github.com/borisdiakur/memoize-fs/issues/6 for details.

```js
memoizer.fn(fnToMemoize, { astBody: true })
```

### noBody

If for some reason you want to omit the function body when generating the hash ([see serialization](#serialization)), set the option `noBody` to `true`.

```js
memoizer.fn(fnToMemoize, { noBody: true })
```

### retryOnInvalidCache

By default, `undefined` is returned when trying to read an invalid cache file. For example, when trying to parse an empty file with `JSON.parse`. By enabling `retryOnInvalidCache`, the memoized function will be called again, and a new cache file will be written.

```js
memoizer.fn(fnToMemoize, { retryOnInvalidCache: true })
```

### serialize and deserialize

These two options allows you to control how the serialization and deserialization process works.
By default we use basic `JSON.stringify` and `JSON.parse`, but you may need more advanced stuff.

In the following example we are using [Yahoo's `serialize-javascript`](https://ghub.now.sh/serialize-javascript)
to be able to cache properly the return result of memoized function containing a `function`.

```js
import memoizeFs from 'memoize-fs'
import serialize from 'serialize-javascript'

// Note: For the sake of the example we use eval in the next line of code. eval is dangegrous
// in most cases. Don't do this at home, or anywhere else, unless you know what you are doing.
const deserialize = (serializedJsString) => eval(`(() => (${serializedJavascript}))()`).data

const memoizer = memoizeFs({ cachePath: './cache', serialize, deserialize })

function someFn (a) {
  const bar = 123

  setTimeout(() => {}, a * 10)

  return {
    bar,
    getBar() { return a + bar }
  }
}

memoizer.fn(someFn)
```

## Manual cache invalidation

You can delete the root cache (all cache files inside the folder specified by the cachePath option):

```js
memoizer.invalidate().then(() => { console.log('cache cleared') })
```

You can also pass the cacheId argument to the invalidate method. This way you only delete the cache inside the subfolder with given id.

```js
memoizer.invalidate('foobar').then(() => { console.log('cache for "foobar" cleared') })
```

## Serialization

See also the [`options.serialize` and `options.deserialize`](#serialize-and-deserialize).

memoize-fs uses JSON to serialize the results of a memoized function.
It also uses JSON, when it tries to serialize the arguments of the memoized function in order to create a hash
which is used as the name of the cache file to be stored or retrieved.
The hash is created from the serialized arguments, the function body and the [salt](#salt) (if provided as an option).

You can generate this hash using `memoize.getCacheFilePath`:

```js
const memoizer = require('memoize-fs')({ cachePath: './' })
memoizer.getCacheFilePath(function () {}, ['arg', 'arg'], { cacheId: 'foobar' })
// -> './foobar/06f254...'
```

Since memoize-fs is using JSON for serialization, __you should know__ how it works around some of its "limitations":

- It ignores circular references silently
- It ignores arguments and attributes of type function silently
- It converts `NaN` to `undefined` silently
- It converts all objects, no matter what class they were an instance of, to objects with prototype `Object` (see [#16](https://github.com/borisdiakur/memoize-fs/issues/16))

Some "limitations" can not (yet?) be worked around:

- Serializing huge objects will fail with one of the following two error messages
```
RangeError: Invalid string length
  at Object.stringify (native)
  at stringifyResult (node_modules/memoize-fs/index.js:x:y) -> line where memoize-fs uses JSON.stringify
```
```
FATAL ERROR: JS Allocation failed - process out of memory
```

## Common pitfalls

- Be carefull when memoizing a function which uses __variables from the outer scope__.
The value of these variables may change during runtime but the cached result will remain the same
when calling the memoized function with the same arguments as the first time when the result was cached.

- __You should know__ about how memoize-fs handles [__serialization__](#serialization) under the hood.

## Contributing

Issues and Pull-requests are absolutely welcome. If you want to submit a patch, please make sure that you follow this simple rule:

> All code in any code-base should look like a single person typed it, no matter how
many people contributed. — [idiomatic.js](https://github.com/rwldrn/idiomatic.js/)

Then please commit with a **detailed** commit message.
