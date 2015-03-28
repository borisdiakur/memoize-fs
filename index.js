'use strict';

var _          = require('lodash'),
    Promise    = require('es6-promise').Promise,
    mkdirp     = require('mkdirp'),
    fs         = require('fs'),
    path       = require('path'),
    rmdir      = require('rimraf'),
    crypto     = require('crypto'),
    //JSONStream = require('JSONStream'),
    es         = require('event-stream');

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

        function serialize(val) {
            if (!val) { return String(val); }
            if (typeof val === 'object') {
                /* jshint unused: vars */
                var circRefColl = [];
                return JSON.stringify(val, function (name, value) {
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
            return String(val);
        }

        var salt = opt.salt || '',
            fnStr = String(fn),
            argsStr,
            hash;

        if (opt.serialize !== undefined) {
            argsStr = serialize(opt.serialize);
        } else {
            argsStr = serialize(args);
        }

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
                        var filePath = getCacheFilePath(fn, args, optExt),
                            stream = fs.createReadStream(filePath, {encoding: 'utf8'});

                        function cacheAndReturn() {
                            var result;

                            function writeResult(prefix, r, cb) {
                                var resultString,
                                    writeStream = fs.createWriteStream(filePath);
                                if (r && typeof r === 'object') {
                                    resultString = JSON.stringify(r);
                                } else {
                                    resultString = String(r);
                                }
                                writeStream.once('error', cb);
                                writeStream.end(prefix + '\n' + resultString, cb);
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
                                    writeResult('object', cbArgs, function () {
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
                                            writeResult(typeof retObj, retObj, function () {
                                                resolve(retObj);
                                            });
                                        },
                                        function (err) {
                                            // if we have an exception we don't cache anything
                                            reject(err);
                                        });
                                } else {
                                    writeResult(typeof result, result, function (err) {
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

                        stream.once('error', function (error) {
                            cacheAndReturn();
                        });
                        stream.once('readable', function () {
                            stream.
                            //pipe(JSONStream.parse()).
                            pipe(es.mapSync(function (data) {

                                function parseResult(r, t) {
                                    /* jshint maxcomplexity:6 */
                                    if (r === 'null') {
                                        return null;
                                    }
                                    if (r === 'undefined') {
                                        return undefined;
                                    }
                                    if (t === 'object') {
                                        return JSON.parse(r);
                                    }
                                    if (t === 'number') {
                                        return Number(r);
                                    }
                                    return r;
                                }

                                function retrieveAndReturn() {
                                    var resultArr = data.split('\n');

                                    function processFnAsync() {
                                        var fnaCb = _.last(args);
                                        resolve(fnaCb.apply(null, parseResult(_.rest(resultArr).join('\n'), _.first(resultArr))));
                                    }

                                    function processFn() {
                                        resolve(parseResult(_.rest(resultArr).join('\n'), _.first(resultArr)));
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
                            }));
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
