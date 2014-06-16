'use strict';
/* global describe, beforeEach, afterEach, it */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    shell = require('shelljs');

describe('memoize-fs |', function () {

    beforeEach(function (done) {
        shell.rm('-rf', path.join(__dirname, '../../build/cache'));
        done();
    });

    describe('unit tests |', function () {

        describe('check args |', function () {

            it('should throw an errer when options param is not provided', function (done) {
                assert.throws(function () {
                    require('../../index.js')();
                }, Error, 'expected to throw an error when options parameter is missing');
                done();
            });

            it('should throw an errer when options param is not of type object', function (done) {
                assert.throws(function () {
                    require('../../index.js')('foobar');
                }, Error, 'expected to throw an error when options parameter is not of type object');
                done();
            });

            it('should throw an errer when option param cachePath is not provided', function (done) {
                assert.throws(function () {
                    require('../../index.js')({});
                }, Error, 'expected to throw an error when option param cachePath is not provided');
                done();
            });

            it('should throw an errer when option param cachePath is not of type string', function (done) {
                assert.throws(function () {
                    require('../../index.js')({ cachePath: true });
                }, Error, 'expected to throw an error when option param cachePath is not of type string');
                done();
            });
        });

        describe('init cache |', function () {

            it('should create a cache folder before caching', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = require('../../index.js')({ cachePath: cachePath });
                memoize.fn(function () {}).then(function (memoized) {
                    assert.strictEqual(typeof memoized, 'function', 'expected a memoized function to be passed as the only argument of the resolved handler');
                    fs.exists(cachePath, function (exists) {
                        assert.ok(exists, 'expected a cache folder with given path to exist');
                        done();
                    });
                }, function (err) {
                    done(err);
                });
            });

            it('should create a cache folder before caching', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = require('../../index.js')({ cachePath: cachePath });
                memoize.fn(function () {}, { cacheId: 'foobar' }).then(function (memoized) {
                    assert.strictEqual(typeof memoized, 'function', 'expected a memoized function to be passed as the only argument of the resolved handler');
                    fs.exists(path.join(cachePath, 'foobar'), function (exists) {
                        assert.ok(exists, 'expected a cache folder with given path to exist');
                        done();
                    });
                }, function (err) {
                    done(err);
                });
            });
        });

        describe('memoize fn |', function () {

            it('should return a rejecting promise instance if fn param is not provided', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = require('../../index.js')({ cachePath: cachePath });
                memoize.fn().then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });

            it('should throw an errer when fn param is not of type function', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = require('../../index.js')({ cachePath: cachePath });
                memoize.fn('foobar').then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });

            it('should throw an errer when salt param is not of type string', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = require('../../index.js')({ cachePath: cachePath });
                memoize.fn(function () {}, { salt: true }).then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });

            it('should throw an errer when cacheId param is not of type string', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = require('../../index.js')({ cachePath: cachePath });
                memoize.fn(function () {}, { cacheId: true }).then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });
        });
    });

    afterEach(function (done) { done(); });
});
