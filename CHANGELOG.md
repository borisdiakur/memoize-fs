### 3.0.4 (2024-03-06)
* style: improve typing by using Awaited instead of our custom EnsurePromise type

### 3.0.3 (2024-03-03)
* fix: void 0 build issue
* fix: do not minify (mangle) identifiers in bundle
* fix: do not bundle meriyah dependency

### 3.0.2 (2024-03-01)
* fix: importing fails with moduleResolution set to node16

### 3.0.1 (2024-03-01)
* fix: instead of `Promise<Promise<T>>`, return `Promise<T>`

### 3.0.0 (2023-02-20)
* __BREAKING CHANGE__: drop support for node < 18
* __BREAKING CHANGE__: memoize-fs is now an esm module
* __BREAKING CHANGE__: stricter types (see dist/index.d.ts)

### 2.2.0 (2020-08-31)
* feat: add retryOnInvalidCache option (#27)

### 2.1.0 (2020-02-28)
* feat: support custom serialize & deserialize through options

### 2.0.0 (2020-02-03)

* __BREAKING CHANGE__: drop support for node < 10
* fix: shift-parser throws when we try to use astBody: true (#17)
* update all dependencies

### 1.4.1 (2018-07-29)

* fix: run the memoized function once even when called with the same arguments on the same tick
* updated dependencies

### 1.4.0 (2017-08-27)

* adding getCacheFilePath to constructed memoizer

### 1.3.0 (2017-08-26)

* exporting getCacheFilePath method

### 1.2.0 (2017-08-26)

* added astBody option

### 1.1.0 (2017-02-05)

* added timed cache invalidation with option maxAge

### 1.0.5 (2016-11-22)

* updated es6-promise@^4.0.5

### 1.0.4 (2015-08-11)

* updated es6-promise@^3.0.0

### 1.0.3 (2015-06-14)

* updated rimraf@^2.4.0
* using mkdirp@^0.5.0
* added CHANGELOG.md
