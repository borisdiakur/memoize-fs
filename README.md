memoize-fs
==========

## memoize/cache in file system solution for Node.js

### Motivation
This project is inspired by the [memoize project](https://github.com/medikoo/memoize) by [Mariusz Nowak aka medikoo](https://github.com/medikoo).
The motivation behind this module is that sometimes you have to persist cached function calls but you do not want to deal with an extra process (ie. managing a Redis store).
Memoization is best technique to save on memory or CPU cycles when we deal with repeated operations. For detailed insight see: http://en.wikipedia.org/wiki/Memoization

### Features

* Works with any type and length of function arguments – __no serialization is needed__
* Support for [__promisified functions__](#memoizing-promisified-functions)
* Cache [__can be invalidated manually__](#manual-cache-invalidation)

### Installation

In your project path:

	$ npm install memoize-fs

### Usage

```javascript
var memoize = require('memoize-fs')({ cachePath: require('path').join(__dirname, '../../build/cache' }),
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

### Configuration

####TODO: continue with docs here