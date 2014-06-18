'use strict';
/* global describe, beforeEach, afterEach, it */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    rmdir = require('rimraf'),
    Promise = require('es6-promise').Promise,
    memoizeFs = require('../../index.js');

describe('memoize-fs', function () {

    beforeEach(function (done) {
        rmdir(path.join(__dirname, '../../build/cache'), done);
    });

    describe('unit tests', function () {

        describe('check args', function () {

            it('should throw an errer when options param is not provided', function (done) {
                assert.throws(function () {
                    memoizeFs();
                }, Error, 'expected to throw an error when options parameter is missing');
                done();
            });

            it('should throw an errer when options param is not of type object', function (done) {
                assert.throws(function () {
                    memoizeFs('foobar');
                }, Error, 'expected to throw an error when options parameter is not of type object');
                done();
            });

            it('should throw an errer when option param cachePath is not provided', function (done) {
                assert.throws(function () {
                    memoizeFs({});
                }, Error, 'expected to throw an error when option param cachePath is not provided');
                done();
            });

            it('should throw an errer when option param cachePath is not of type string', function (done) {
                assert.throws(function () {
                    memoizeFs({ cachePath: true });
                }, Error, 'expected to throw an error when option param cachePath is not of type string');
                done();
            });
        });

        describe('init cache', function () {

            it('should create a cache folder before caching', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function () {}).then(function (memoized) {
                    assert.strictEqual(typeof memoized, 'function', 'expected a memoized function to be passed as the only argument of the resolved handler');
                    fs.exists(cachePath, function (exists) {
                        assert.ok(exists, 'expected a cache folder with given path to exist');
                        done();
                    });
                }, done);
            });

            it('should create a cache folder before caching', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
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

        describe('memoize fn', function () {

            it('should return a rejecting promise instance if fn param is not provided', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn().then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });

            it('should return a rejecting promise instance if fn param is not of type function', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn('foobar').then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });

            it('should return a rejecting promise instance if salt param is not of type string', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function () {}, { salt: true }).then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });

            it('return a rejecting promise instance if cacheId param is not of type string', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function () {}, { cacheId: true }).then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });
        });

        describe('process fn', function () {

            it('should save the result of a memoized function on first execution to its cache folder', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                            if (err) {
                                done(err);
                            } else {
                                assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                done();
                            }
                        });
                    }, done);
                }, done);
            });

            it('should save the result of a memoized function on first execution to its cache folder with salt', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar', salt: 'qux' }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                            if (err) {
                                done(err);
                            } else {
                                assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                done();
                            }
                        });
                    }, done);
                }, done);
            });

            it('should save the result of a memoized function on first execution to the root cache folder if no cache id is provided', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        fs.readdir(path.join(cachePath), function (err, files) {
                            if (err) {
                                done(err);
                            } else {
                                assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                done();
                            }
                        });
                    }, done);
                }, done);
            });

            it('should return the cached result of type number of a previously memoized function', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        c = 999;
                        memFn(1, 2).then(function (result) {
                            assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                            fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                if (err) {
                                    done(err);
                                } else {
                                    assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                    done();
                                }
                            });
                        }, done);
                    }, done);
                }, done);
            });

            it('should return the cached result of type number of a previously memoized function cached in the root cache folder if no cache id is provided', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        c = 999;
                        memFn(1, 2).then(function (result) {
                            assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                            fs.readdir(path.join(cachePath), function (err, files) {
                                if (err) {
                                    done(err);
                                } else {
                                    assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                    done();
                                }
                            });
                        }, done);
                    }, done);
                }, done);
            });

            it('should return the cached result of type string of a previously memoized function', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return String(a) + String(b) + String(c); }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, '123', 'expected result to strictly equal "123"');
                        c = 999;
                        memFn(1, 2).then(function (result) {
                            assert.strictEqual(result, '123', 'expected result to strictly equal "123"');
                            fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                if (err) {
                                    done(err);
                                } else {
                                    assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                    done();
                                }
                            });
                        }, done);
                    }, done);
                }, done);
            });

            it('should return the cached result with the value undefined of a previously memoized function', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c;
                memoize.fn(function (a, b) { return a || b || c; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(undefined, undefined).then(function (result) {
                        assert.strictEqual(result, undefined, 'expected result to strictly equal undefined');
                        c = true;
                        memFn(undefined, undefined).then(function (result) {
                            assert.strictEqual(result, undefined, 'expected result to strictly equal undefined');
                            fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                if (err) {
                                    done(err);
                                } else {
                                    assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                    done();
                                }
                            });
                        }, done);
                    }, done);
                }, done);
            });

            it('should return the cached result with the value null of a previously memoized function', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c;
                memoize.fn(function (a, b) { return a || b || c; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(null, null).then(function (result) {
                        assert.strictEqual(result, undefined, 'expected result to strictly equal null');
                        c = true;
                        memFn(null, null).then(function (result) {
                            assert.strictEqual(result, undefined, 'expected result to strictly equal null');
                            fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                if (err) {
                                    done(err);
                                } else {
                                    assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                    done();
                                }
                            });
                        }, done);
                    }, done);
                }, done);
            });

            it('should return the cached result with the value NaN of a previously memoized function', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c;
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.ok(isNaN(result), 'expected result to be NaN');
                        c = 3;
                        memFn(1, 2).then(function (result) {
                            assert.ok(isNaN(result), 'expected result to be NaN');
                            fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                if (err) {
                                    done(err);
                                } else {
                                    assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                    done();
                                }
                            });
                        }, done);
                    }, done);
                }, done);
            });

            it('should return the cached result of type object of a previously memoized function', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return { a: a, b: b, c: c, d : { e: [3, 2, 1], f: null, g: 'qux' } }; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.deepEqual(result, { a: 1, b: 2, c: 3, d : { e: [3, 2, 1], f: null, g: 'qux' } }, 'expected result to deeply equal the one provided');
                        c = 999;
                        memFn(1, 2).then(function (result) {
                            assert.deepEqual(result, { a: 1, b: 2, c: 3, d : { e: [3, 2, 1], f: null, g: 'qux' } }, 'expected result to deeply equal the one provided');
                            fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                if (err) {
                                    done(err);
                                } else {
                                    assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                    done();
                                }
                            });
                        }, done);
                    }, done);
                }, done);
            });

            it('should return the cached result of type object of a previously memoized function with a circular reference object as function argument', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3,
                    circRefObj = { h: circRefObj };
                memoize.fn(function (a, b, cro) { return { a: a, b: b, c: c, d : { e: [3, 2, 1], f: null, g: 'qux' } }; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(1, 2, circRefObj).then(function (result) {
                        assert.deepEqual(result, { a: 1, b: 2, c: 3, d : { e: [3, 2, 1], f: null, g: 'qux' } }, 'expected result to deeply equal the one provided');
                        c = 999;
                        memFn(1, 2, circRefObj).then(function (result) {
                            assert.deepEqual(result, { a: 1, b: 2, c: 3, d : { e: [3, 2, 1], f: null, g: 'qux' } }, 'expected result to deeply equal the one provided');
                            fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                if (err) {
                                    done(err);
                                } else {
                                    assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                    done();
                                }
                            });
                        }, done);
                    }, done);
                }, done);
            });

            it('should return the cached result of a previously memoized promisified async function', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) {
                    return new Promise(function (resolve) {
                        setTimeout(function () {
                            resolve(a + b + c);
                        }, 100);
                    });
                }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        c = 999;
                        memFn(1, 2).then(function (result) {
                            assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                            fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                if (err) {
                                    done(err);
                                } else {
                                    assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                    done();
                                }
                            });
                        }, done);
                    }, done);
                }, done);
            });
        });

        describe('force recaching', function () {

            it('should not recache the result of a memoized function on second execution if force option is not set', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar' }).then(function (memFn) {
                            c = 999;
                            memFn(1, 2).then(function (result) {
                                assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                                fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                        done();
                                    }
                                });
                            }, done);
                        }, done);
                    }, done);
                }, done);
            });

            it('should recache the result of a memoized function on second execution if force option is set', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar', force: true }).then(function (memFn) {
                            c = 4;
                            memFn(1, 2).then(function (result) {
                                assert.strictEqual(result, 7, 'expected result to strictly equal 7');
                                fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                        done();
                                    }
                                });
                            }, done);
                        }, done);
                    }, done);
                }, done);
            });
        });

        describe('custom serialization', function () {

            it('should cache the result of a memoized function on second execution with option serialize of type string', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar', serialize: 'qux' }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar', serialize: 'qux' }).then(function (memFn) {
                            c = 999;
                            memFn(1, 2).then(function (result) {
                                assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                                fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                        done();
                                    }
                                });
                            }, done);
                        }, done);
                    }, done);
                }, done);
            });

            it('should cache the result of a memoized function on second execution with option serialize of type object', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar', serialize: {qux: 321} }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar', serialize: {qux: 321} }).then(function (memFn) {
                            c = 999;
                            memFn(1, 2).then(function (result) {
                                assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                                fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                        done();
                                    }
                                });
                            }, done);
                        }, done);
                    }, done);
                }, done);
            });

            it('should cache the results of two equal memoized functions with different options serialize set', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar', serialize: {qux: 321} }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar', serialize: {qux: 123} }).then(function (memFn) {
                            c = 4;
                            memFn(1, 2).then(function (result) {
                                assert.strictEqual(result, 7, 'expected result to strictly equal 6');
                                fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        assert.strictEqual(files.length, 2, 'expected exactly two files in cache with id foobar');
                                        done();
                                    }
                                });
                            }, done);
                        }, done);
                    }, done);
                }, done);
            });
        })

        describe('invalidate cache', function () {

            it('should recache the result of a memoized function after invalidating the cache before the second execution', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        memoize.invalidate('foobar').then(function () {
                            c = 4;
                            memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar' }).then(function (memFn) {
                                memFn(1, 2).then(function (result) {
                                    assert.strictEqual(result, 7, 'expected result to strictly equal 7');
                                    fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                        if (err) {
                                            done(err);
                                        } else {
                                            assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                            done();
                                        }
                                    });
                                }, done);
                            }, done);
                        }, done);
                    }, done);
                }, done);
            });

            it('should recache the result of a memoized function after invalidating the root cache by not providing a cache id before the second execution', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        memoize.invalidate().then(function () {
                            fs.exists(cachePath, function (exists) {
                                if (exists) {
                                    done(Error('Cache folder should not exist after invalidating root cache'));
                                } else {
                                    assert.notEqual(exists, true, 'expected to not find the cache folder after invalidating the root cache');
                                    c = 4;
                                    memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar' }).then(function (memFn) {
                                        memFn(1, 2).then(function (result) {
                                            assert.strictEqual(result, 7, 'expected result to strictly equal 7');
                                            fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                                                if (err) {
                                                    done(err);
                                                } else {
                                                    assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                                    done();
                                                }
                                            });
                                        }, done);
                                    }, done);
                                }
                            });
                        }, done);
                    }, done);
                }, done);
            });

            it('return a rejecting promise instance if cacheId param is not of type string', function (done) {
                var cachePath = path.join(__dirname, '../../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.invalidate(true).then(function () {
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
