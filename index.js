'use strict';

var _       = require('lodash'),
    Promise = require('es6-promise').Promise,
    mkdirp  = require('mkdirp'),
    fs      = require('fs'),
    path    = require('path'),
    rmdir   = require('rimraf'),
    crypto  = require('crypto');

module.exports = function (options) {

    // check args
    if (typeof options !== 'object') { throw new Error('options of type object expected'); }
    if (typeof options.cachePath !== 'string') { throw new Error('option cachePath of type string expected'); }

    // check for existing cache folder, if not found, create folder, then resolve
    function initCache(cachePath) {
        return new Promise(function (resolve, reject) {
            mkdirp(cachePath, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    function getCacheFilePath(fn, args, opt) {

        function serialize() {
            /* jshint unused: vars */
            var circRefColl = [];
            return JSON.stringify(args, function (name, value) {
                if (typeof value === 'function') {
                    return; // ignore arguments and attributes of type function silently
                }
                if (typeof value === 'object' && value !== null) {
                    if (circRefColl.indexOf(value) !== -1) {
                        // circular reference found, discard key
                        return;
                    }
                    // store value in collection
                    circRefColl.push(value);
                }
                return value;
            });
        }

        var salt = opt.salt || '',
            fnStr = (opt.noBody ? '' : String(fn)),
            argsStr,
            hash;

        argsStr = serialize(args);

        hash = crypto.createHash('md5').update(fnStr + argsStr + salt).digest('hex');
        return path.join(options.cachePath, opt.cacheId, hash);
    }

    function memoizeFn(fn, opt) {

        function checkOptions(optExt) {
            if (optExt.salt && typeof optExt.salt !== 'string') { throw new Error('salt option of type string expected, got \'' + typeof optExt.salt + '\''); }
            if (optExt.cacheId && typeof optExt.cacheId !== 'string') { throw new Error('cacheId option of type string expected, got \'' + typeof optExt.cacheId + '\''); }
        }

        if (opt && typeof opt !== 'object') { throw new Error('opt of type object expected, got \'' + typeof opt + '\''); }

        var optExt = _.extend({}, opt);

        if (typeof fn !== 'function') { throw new Error('fn of type function expected'); }
        checkOptions(optExt);

        optExt.cacheId = optExt.cacheId || './';

        function resolveWithMemFn() {
            return new Promise(function (resolve) {
                var memFn = function () {
                    var args = arguments,
                        fnaCb = _.last(args);

                    if (typeof fnaCb === 'function' && fnaCb.length > 0) {
                        optExt.async = true;
                    }

                    return new Promise(function (resolve, reject) {
                        /* jshint unused: vars */
                        var filePath = getCacheFilePath(fn, args, optExt);

                        function cacheAndReturn() {
                            var result;

                            function writeResult(r, cb) {
                                var resultObj,
                                    resultString;
                                if ((r && typeof r === 'object') || typeof r === 'string') {
                                    resultObj = {data: r};
                                    resultString = JSON.stringify(resultObj);
                                } else {
                                    resultString = '{"data":' + r + '}';
                                }
                                fs.writeFile(filePath, resultString, cb);
                            }

                            function processFnAsync() {
                                var fnaArgs = _.initial(args),
                                    fnaCb = _.last(args);

                                fnaArgs.push(function (/* err, result... */) {
                                    var cbErr = _.first(arguments),
                                        cbArgs = _.rest(arguments);
                                    if (cbErr) {
                                        // if we have an exception we don't cache anything
                                        return reject(cbErr);
                                    }
                                    cbArgs.unshift(null);
                                    writeResult(cbArgs, function () {
                                        resolve(fnaCb.apply(null, cbArgs));
                                    });
                                });
                                fn.apply(null, fnaArgs);
                            }

                            function processFn() {
                                try {
                                    result = fn.apply(null, args);
                                } catch (e) {
                                    return reject(e);
                                }
                                if (result && result.then && typeof result.then === 'function') {
                                    // result is a promise instance
                                    return result.then(function (retObj) {
                                            writeResult(retObj, function () {
                                                resolve(retObj);
                                            });
                                        },
                                        function (err) {
                                            // if we have an exception we don't cache anything
                                            reject(err);
                                        });
                                } else {
                                    writeResult(result, function (err) {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve(result);
                                        }
                                    });
                                }
                            }

                            if (optExt.async) {
                                return processFnAsync();
                            }
                            return processFn();
                        }

                        fs.readFile(filePath, {encoding: 'utf8'}, function (err, data) {
                            if (err) {
                                return cacheAndReturn();
                            }

                            function parseResult(resultString) {
                                try {
                                    return JSON.parse(resultString).data; // will fail on NaN
                                } catch (e) {
                                    return undefined;
                                }
                            }

                            function retrieveAndReturn() {

                                function processFnAsync() {
                                    var fnaCb = _.last(args);
                                    resolve(fnaCb.apply(null, parseResult(data)));
                                }

                                function processFn() {
                                    resolve(parseResult(data));
                                }

                                if (optExt.async) {
                                    return processFnAsync();
                                }
                                return processFn();
                            }

                            if (optExt.force) {
                                delete optExt.force;
                                // result has not been cached yet or needs to be recached - cache and return it!
                                cacheAndReturn();
                            } else {
                                // result has already been cached - return it!
                                retrieveAndReturn();
                            }
                        });
                    });
                };
                resolve(memFn);
            });
        }

        return initCache(path.join(options.cachePath, optExt.cacheId)).then(resolveWithMemFn);
    }

    function invalidateCache(cacheId) {
        return new Promise(function (resolve, reject) {
            if (cacheId && typeof cacheId !== 'string') {
                reject(Error('cacheId option of type string expected, got \'' + typeof cacheId + '\''));
            } else {
                var cachPath = cacheId ? path.join(options.cachePath, cacheId) : options.cachePath;
                rmdir(cachPath, function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
        });
    }

    var cache = initCache(options.cachePath);

    return {
        'fn': function (fn, opt) {
            return cache.then(function () {
                    return memoizeFn(fn, opt);
                }, function (err) {
                    throw err;
                });
            },
        'invalidate': invalidateCache
    };
};
