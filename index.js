'use strict';

var _       = require('lodash'),
    Promise = require('es6-promise').Promise,
    mkdirp  = require('mkdirp'),
    fs      = require('fs'),
    path    = require('path'),
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

    function memoizeFn(fn, opt) {
        if (opt && typeof opt !== 'object') { throw new Error('opt of type object expected, got \'' + typeof opt + '\''); }

        var optExt = _.extend({}, opt);

        // check args
        function checkOptions() {
            if (optExt.salt && typeof optExt.salt !== 'string') { throw new Error('salt option of type string expected, got \'' + typeof optExt.salt + '\''); }
            if (optExt.cacheId && typeof optExt.cacheId !== 'string') { throw new Error('cacheId option of type string expected, got \'' + typeof optExt.salt + '\''); }
        }
        if (typeof fn !== 'function') { throw new Error('fn of type function expected'); }
        checkOptions();

        optExt.cacheId = optExt.cacheId || './';

        function resolveWithMemFn() {
            return new Promise(function (resolve) {
                var memFn = function () {
                    var args = arguments;
                    return new Promise(function (resolve, reject) {
                        /* jshint unused: vars */
                        var fnJson = JSON.stringify(args, function (name, value) {
                                if (typeof value === 'function') {
                                    return value;
                                }
                                return value;
                            }),
                            salt = optExt.salt || '',
                            hash = crypto.createHash('md5').update(String(fn), fnJson + salt).digest('hex'),
                            filePath = path.join(options.cachePath, optExt.cacheId, hash);

                        fs.readFile(filePath, { encoding: 'utf8' }, function (err, data) {
                            var result,
                                resultArr,
                                resultType,
                                resultStr;

                            function stringifyResult(r) {
                                if (r && typeof r === 'object') {
                                    return JSON.stringify(r);
                                } else {
                                    return String(r);
                                }
                            }

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

                            if (err || optExt.force) {
                                delete optExt.force;
                                // result has not been cached yet or needs to be recached - cache and return it!
                                result = fn.apply(null, args);
                                if (result && result.then) {
                                    // result is a promise instance
                                    return result.then(function (retObj) {
                                            fs.writeFile(filePath, typeof retObj + '\n' + stringifyResult(retObj)); // async without callback!
                                            resolve(retObj);
                                        },
                                        function (err) {
                                            // if we have an exception we don't cache anything
                                            reject(err);
                                        });
                                } else {
                                    resultStr = stringifyResult(result);
                                    fs.writeFile(filePath, typeof result + '\n' + resultStr, function (err) {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve(result);
                                        }
                                    });
                                }
                            } else {
                                // result has already been cached - return it!
                                resultArr = data.split('\n');
                                resultType = _.first(resultArr);
                                resolve(parseResult(_.rest(resultArr).join('\n'), resultType));
                            }
                        });
                    });
                };
                resolve(memFn);
            });
        }

        return initCache(path.join(options.cachePath, optExt.cacheId)).then(resolveWithMemFn);
    }

    var cache = initCache(options.cachePath);

    return {
        'fn': function (fn, opt) {
            return cache.then(function () {
                    return memoizeFn(fn, opt);
                }, function (err) {
                    throw err;
                });
        }
    };
};
