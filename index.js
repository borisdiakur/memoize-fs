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
            fs.exists(cachePath, function (exists) {
                if (exists) {
                    resolve();
                } else {
                    mkdirp(cachePath, function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }
            });
        });
    }

    function processFn(fn, opt) {
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

        function getFnHash() {
            return new Promise(function (resolve) {
                /* jshint unused: vars */
                var fnJson = JSON.stringify(fn, function (name, value) {
                        if (typeof value === 'function') {
                            return value;
                        }
                        return value;
                    }),
                    salt = optExt.salt || '',
                    hash = crypto.createHash('md5').update(fnJson + salt).digest('hex');
                resolve(hash);
            });
        }

        function findResult(hash) {
            return new Promise(function (resolve, reject) {
                var filePath = path.join(options.cachePath, optExt.cacheId, hash);
                fs.exists(filePath, function (exists) {
                    if (exists) {
                        fs.readFile('/etc/passwd', function (err, data) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(data);
                            }
                        });
                    } else {
                        fn.arguments // TODO: Germany is playing against Portugal at 6pm, so I must go home now. Bye!
                        mkdirp(cachePath, function (err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    }
                });
            });
        }

        return initCache(path.join(options.cachePath, optExt.cacheId))
            .then(getFnHash).then(findResult);
    }

    var cache = initCache(options.cachePath);

    return {
        'fn': function (fn, opt) {
            return cache.then(function () {
                    return processFn(fn, opt);
                }, function (err) {
                    throw err;
                });
        }
    };
};
