# memoize-fs

memoize/cache in file system solution for Node.js

[![NPM](https://nodei.co/npm/memoize-fs.png)](https://nodei.co/npm/memoize-fs/)

[![Build Status](https://api.travis-ci.org/borisdiakur/memoize-fs.png?branch=master)](https://travis-ci.org/borisdiakur/memoize-fs)

## Motivation
This project is inspired by the [memoize project](https://github.com/medikoo/memoize) by [Mariusz Nowak aka medikoo](https://github.com/medikoo).
The motivation behind this module is that sometimes you have to persist cached function calls but you do not want to deal with an extra process (ie. managing a Redis store).
Memoization is best technique to save on memory or CPU cycles when we deal with repeated operations. For detailed insight see: http://en.wikipedia.org/wiki/Memoization

## Features

* Works with almost all kind and any length of function arguments – [__custom serialization is posible__](#serialize)
* Support for [__promisified functions__](#memoizing-promisified-functions)
* Cache [__can be invalidated manually__](#manual-cache-invalidation)

## Installation

In your project path:

	$ npm install memoize-fs

## Usage

```javascript
var memoize = require('memoize-fs')({ cachePath: require('path').join(__dirname, '../../cache' }),
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

__Note that a result of a momoised function is always a [Promise](http://www.html5rocks.com/en/tutorials/es6/promises/) instance!__

### Memoizing promisified functions

In order to memoize an async function it must be first promisified in the following manner:

Before:
```javascript
var funAsync = function (a, b, cb) { setTimeout(function () { cb(null, a + b); }, 100); };

// later
funAsync(1, 2, function (err, result) {
    if (err) throw err;
    console.log(result);
});
```

After:
```javascript
var funPromisified = function (a, b) {
    return new require('es6-promise').Promise(function (resolve, reject) {
        setTimeout(function () { resolve(a + b); }, 100);
    });
};

// later
funPromisified(1, 2).then(function (result) {
    console.log(result);
}, function (err) {
    throw err;
});

// now we can memoize it
memoize.fn(funPromisified).then(...
```

### Options

When memoizing a function all below options can be applied in any combination.

#### cacheId

By default all cache files are saved into the __root cache__ which is the folder specified by the cachePath option:

```javascript
var memoize = require('memoize-fs')({ cachePath: require('path').join(__dirname, '../../cache' });
```

The cacheId option which you can specify during momoization of a function resolves to the name of a subfolder created inside the root cache folder. Cached function calls will be cached inside that folder:

```javascript
memoize.fn(fun, { cacheId: foobar}).then(...
```

#### salt

Functions may have references to variables outside their own scope. As a consequence two functions which look exactly the same (they have the same function signature and function body) can return different results even when executed with identical arguments. In order to avoid the same cache being used for two different functions you can use the salt option which mutates the hash key created for the memoized function which in turn defines the location of the cache file:

```javascript
memoize.fn(fun, { salt: 'foobar'}).then(...
```

#### force

The force option forces the re-execution of an already memoized function and the re-caching of its outcome:

```javascript
memoize.fn(fun, { force: true}).then(...
```

#### serialize

memoize-fs tries to serialize the arguments of the memoized function in order to create a hash which is used as the name of the cache file to be stored or retrieved.
If you want memoize-fs to use a custom key instead of letting it serialize the arguments, you can pass the key in the serialize option to memoize:

```javascript
memoize.fn(fun, { serialize: 'foobar'}).then(...
```

Alternatively you can pass another object to be serialized in place of the arguments of the memoized function:

```javascript
memoize.fn(fun, { serialize: { foo: 'bar'}}).then(...
```

### Manual cache invalidation

You can delete the root cache (all cache files inside the folder specified by the cachePath option):

```javascript
memoized.invalidate().then(...
```

You can also pass the cacheId argument to the invalidate method. This way you only delete the cache inside the subfolder with given id.

```javascript
memoized.invalidate('foobar').then(...
```

## Contributing

Issues and Pull-requests welcome. If you want to submit a patch, please make sure that you follow this simple rule:

> All code in any code-base should look like a single person typed it, no matter how
many people contributed. —[idiomatic.js](https://github.com/rwldrn/idiomatic.js/)

## Change Log

v0.0.2 - [serialize option](#serialize)

v0.0.1 - Alpha
