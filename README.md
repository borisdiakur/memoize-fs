# memoize-fs

memoize/cache in file system solution for Node.js

[![Build Status](https://travis-ci.org/borisdiakur/memoize-fs.svg?branch=master)](https://travis-ci.org/borisdiakur/memoize-fs)
[![Coverage Status](https://coveralls.io/repos/borisdiakur/memoize-fs/badge.svg?branch=master)](https://coveralls.io/r/borisdiakur/memoize-fs?branch=master)
[![Dependency Status](https://gemnasium.com/borisdiakur/memoize-fs.svg)](https://gemnasium.com/borisdiakur/memoize-fs)

[![NPM](https://nodei.co/npm/memoize-fs.png?downloads=true)](https://nodei.co/npm/memoize-fs/)

## Motivation
This project is inspired by the [memoize project](https://github.com/medikoo/memoize) by [Mariusz Nowak aka medikoo](https://github.com/medikoo).
The motivation behind this module is that sometimes you have to persist cached function calls but you do not want to deal with an extra process (ie. managing a Redis store).

Memoization is best technique to save on memory or CPU cycles when we deal with repeated operations. For detailed insight see: http://en.wikipedia.org/wiki/Memoization

## Features

* Works with almost all kind and any length of function arguments – [__custom serialization is posible__](#serialize)
* Supports memoization of [__asynchronous functions__](#memoizing-asynchronous-functions)
* Supports memoization of [__promisified functions__](#memoizing-promisified-functions)
* Cache [__can be invalidated manually__](#manual-cache-invalidation)

## Installation

In your project path:

```shell
npm install memoize-fs --save
```

## Usage

```javascript
var cachePath = require('path').join(__dirname, '..', 'cache'),
    memoize = require('memoize-fs')({ cachePath: cachePath }),
    fun = function (a, b) { return a + b; };

memoize.fn(fun).then(function (memFn) {
    memFn(1, 2).then(function (result) {
        assert.strictEqual(result, 3);
        memFn(1, 2).then(function (result) { // cache hit
            assert.strictEqual(result, 3);
        }, function (err) { /* handle error */ });
    }, function (err) { /* handle error */ });
}, function (err) { /* handle error */ });
```

__Note that a result of a momoized function is always a [Promise](http://www.html5rocks.com/en/tutorials/es6/promises/) instance!__

Here is a similar and slightly more readable example in a promise variable notation:

```javascript
var cachePath = require('path').join(__dirname, '..', 'cache'),
    memoize = require('memoize-fs')({ cachePath: cachePath }),
    fun = function (a, b) { return a + b; };

var memFnPromise = memoize.fn(fun);

var resultPromise = memFnPromise.then(function (memFn) {
    return memFn(1, 2);
});

resultPromise.then(function (result) {
    assert.strictEqual(result, 3);
});

resultPromise.then(null, function (err) { /* handle error */ });
```

### Memoizing asynchronous functions

memoise-fs assumes a function asynchronous if the last argument it accepts is of type `function` and that function itself accepts at least one argument.
So basically you don't have to do anything differently than when memoizing synchronous functions. Just make sure the above condition is fulfilled.
Here is an example of memoizing a function with a callback:

```javascript
var funAsync = function (a, b, cb) {
    setTimeout(function () {
        cb(null, a + b);
    }, 100);
};

memoize.fn(funAsync).then(function (memFn) {
    memFn(1, 2, function (err, sum) { if (err) { throw err; } console.log(sum); }).then(function () {
        memFn(1, 2, function (err, sum) { if (err) { throw err; } console.log(sum); }).then(function () { // cache hit
            // callback is called with previously cached arguments
        }, function (err) { /* handle error */ });
    }, function (err) { /* handle error */ });
}, function (err) { /* handle error */ });
```

### Memoizing promisified functions

You can also memoize a promisified function. memoize-fs assumes a function promisified if its result is _thenable_
which means that the result is an object with a property `then` of type `function` (read more about JavaScript promises [here](http://www.html5rocks.com/en/tutorials/es6/promises/?redirect_from_locale=de)).
So again it's the same as with memoizing synchronous functions.
Here is an example of memoizing a promisified function:

```javascript
var funPromisified = function (a, b) {
    return new require('es6-promise').Promise(function (resolve, reject) {
        setTimeout(function () { resolve(a + b); }, 100);
    });
};

memoize.fn(funPromisified).then(function (memFn) {
    memFn(1, 2).then(function (result) {
        assert.strictEqual(result, 3);
        memFn(1, 2).then(function (result) { // cache hit
            assert.strictEqual(result, 3);
        }, function (err) { /* handle error */ });
    }, function (err) { /* handle error */ });
}, function (err) { /* handle error */ });
```

### Options

When memoizing a function all below options can be applied in any combination.

#### cacheId

By default all cache files are saved into the __root cache__ which is the folder specified by the cachePath option:

```javascript
var memoize = require('memoize-fs')({ cachePath: require('path').join(__dirname, '../../cache' });
```

The `cacheId` option which you can specify during momoization of a function resolves to the name of a subfolder created inside the root cache folder. Cached function calls will be cached inside that folder:

```javascript
memoize.fn(fun, { cacheId: 'foobar' }).then(...
```

#### salt

Functions may have references to variables outside their own scope. As a consequence two functions which look exactly the same (they have the same function signature and function body) can return different results even when executed with identical arguments. In order to avoid the same cache being used for two different functions you can use the `salt` option which mutates the hash key created for the memoized function which in turn defines the name of the cache file:

```javascript
memoize.fn(fun, { salt: 'foobar' }).then(...
```

#### force

The `force` option forces the re-execution of an already memoized function and the re-caching of its outcome:

```javascript
memoize.fn(fun, { force: true }).then(...
```

#### serialize

memoize-fs tries to serialize the arguments of the memoized function in order to create a hash which is used as the name of the cache file to be stored or retrieved.
The hash is created from the serialized arguments, the function body and the [salt](https://github.com/borisdiakur/memoize-fs#salt) (if provided as an option).
If you want memoize-fs to use a custom key instead of letting it serialize the arguments, you can pass the key in the `serialize` option to memoize-fs:

```javascript
memoize.fn(fun, { serialize: 'foobar' }).then(...
```

Alternatively you can pass another object to be serialized in place of the arguments of the memoized function:

```javascript
memoize.fn(fun, { serialize: { foo: 'bar' }}).then(...
```

#### noBody

The hash is created from the serialized arguments, the function body and the [salt](https://github.com/borisdiakur/memoize-fs#salt) (if provided as an option).
If for some reason you want to omit the function body when generating the hash, set the option `noBody` to `true`.

```javascript
memoize.fn(fun, { serialize: 'foobar', noBody: true }).then(...
```

### Manual cache invalidation

You can delete the root cache (all cache files inside the folder specified by the cachePath option):

```javascript
memoize.invalidate().then(...
```

You can also pass the cacheId argument to the invalidate method. This way you only delete the cache inside the subfolder with given id.

```javascript
memoize.invalidate('foobar').then(...
```

## Common pitfalls

- Be carefull when memoizing a function which uses __variables from the outer scope__.
The value of these variables may change during runtime but the cached result will remain the same
when calling the memoized function with the same arguments as the first time when the result was cached.

- Be careful when memoizing a function which excepts arguments which are of type `function` or have attributes of type `function`.
__These arguments will be ignored silently during serialization__.
To avoid flawy caching please use [__custom serialization__](#serialize).

## Contributing

Issues and Pull-requests are absolutely welcome. If you want to submit a patch, please make sure that you follow this simple rule:

> All code in any code-base should look like a single person typed it, no matter how
many people contributed. — [idiomatic.js](https://github.com/rwldrn/idiomatic.js/)

Lint with:
```shell
npm run jshint
```

Test with:
```shell
npm run mocha
```

Check code coverage with:

```shell
npm run istanbul
```

Then please commit with a __detailed__ commit message.
