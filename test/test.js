'use strict';
/* global describe, beforeEach, afterEach, it */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    rmdir = require('rimraf'),
    Promise = require('es6-promise').Promise,
    memoizeFs = require('../index.js');

describe('memoize-fs', function () {

    beforeEach(function (done) {
        rmdir(path.join(__dirname, '../build/cache'), done);
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

            it('should throw an errer when option value is not of type object', function (done) {
                assert.throws(function () {
                    memoizeFs('foobar');
                }, Error, 'expected to throw an error when option value is not of type object');
                done();
            });
        });

        describe('init cache', function () {

            it('should create a cache folder before caching', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
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
                var cachePath = path.join(__dirname, '../build/cache'),
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
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn().then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });

            it('should return a rejecting promise instance if fn param is not of type function', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn('foobar').then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });

            it('should return a rejecting promise instance if salt param is not of type string', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function () {}, { salt: true }).then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });

            it('should return a rejecting promise instance if cacheId param is not of type string', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
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

            it('should not cache the result of a memoized function if an exception is raised during execution', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function () { throw new Error('qux'); }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn().then(function () {
                        done(Error('entered resolve handler instead of error handler'));
                    }, function (err) {
                        assert.ok(err);
                        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                            if (err) {
                                done(err);
                            } else {
                                assert.strictEqual(files.length, 0, 'expected cache with id foobar to be empty');
                                done();
                            }
                        });
                    });
                });
            });

            it('should not cache the result of a memoized promisified function if an exception is raised during execution', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function () {
                    /* jshint unused:vars */
                    return new Promise(function (resolve, reject) { setTimeout(function () { reject(Error('qux')); }, 100); });
                }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn().then(function () {
                        done(Error('entered resolve handler instead of error handler'));
                    }, function (err) {
                        assert.ok(err);
                        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                            if (err) {
                                done(err);
                            } else {
                                assert.strictEqual(files.length, 0, 'expected cache with id foobar to be empty');
                                done();
                            }
                        });
                    });
                });
            });

            it('should cache the result of a memoized function on first execution to its cache folder', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
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

            it('should cache the result of a memoized function on first execution to its cache folder with salt', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
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

            it('should cache the result of a memoized function on first execution to the root cache folder if no cache id is provided', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
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

            it('should return the cached result with the value undefined of a previously memoized function with return type void', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 0;
                memoize.fn(function () { ++c; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn().then(function (result) {
                        assert.strictEqual(c, 1, 'expected variable from outer scope to strictly equal 1');
                        assert.strictEqual(result, undefined, 'expected result to strictly equal undefined');
                        memFn().then(function (result) {
                            assert.strictEqual(c, 1, 'expected variable from outer scope to still strictly equal 1');
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

            it('should return the cached result of type number of a previously memoized function', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
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
                var cachePath = path.join(__dirname, '../build/cache'),
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
                var cachePath = path.join(__dirname, '../build/cache'),
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
                var cachePath = path.join(__dirname, '../build/cache'),
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

            it('should return the cached result with the value undefined of a previously memoized function', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
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
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = null;
                memoize.fn(function (a, b) { return a || b || c; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn(null, null).then(function (result) {
                        assert.strictEqual(result, null, 'expected result to strictly equal null');
                        c = true;
                        memFn(null, null).then(function (result) {
                            assert.strictEqual(result, null, 'expected result to strictly equal null');
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
                var cachePath = path.join(__dirname, '../build/cache'),
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
                var cachePath = path.join(__dirname, '../build/cache'),
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

            it('should return the cached result of a previously memoized promisified async function', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
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

        describe('async', function () {

            it('should return a rejecting promise instance if option async is provided but function has no callback', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function (a, cb) { cb(a); }, { cacheId: 'foobar', async: true }).then(function (memFn) {
                    memFn(1, 2).then(function () {
                        done(Error('entered resolve handler instead of error handler'));
                    }, function (err) {
                        assert.ok(err);
                        done();
                    });
                }, done);
            });

            it('should return a rejecting promise instance if option async is provided but function callback does not expects arguments', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function (a, cb) { cb(a); }, { cacheId: 'foobar', async: true }).then(function (memFn) {
                    memFn(1, function() {}).then(function () {
                        done(Error('entered resolve handler instead of error handler'));
                    }, function (err) {
                        assert.ok(err);
                        done();
                    });
                }, done);
            });

            it('should not cache the result of a memoized async function if an exception is raised during execution', function (done) {
                /* jshint unused:vars */
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function (cb) {
                    setTimeout(function () { throw new Error('qux'); }, 100);
                }, { cacheId: 'foobar', async: true }).then(function (memFn) {
                    memFn(function () {}).then(function () {
                        done(Error('entered resolve handler instead of error handler'));
                    }, function (err) {
                        assert.ok(err);
                        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                            if (err) {
                                done(err);
                            } else {
                                assert.strictEqual(files.length, 0, 'expected cache with id foobar to be empty');
                                done();
                            }
                        });
                    });
                });
            });

            it('should not cache the result of a memoized async function if its callback receives an error', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function (cb) {
                    setTimeout(function () { cb(new Error('qux')); }, 100);
                }, { cacheId: 'foobar', async: true }).then(function (memFn) {
                    /* jshint unused:vars */
                    memFn(function (err) {}).then(function () {
                        done(Error('entered resolve handler instead of error handler'));
                    }, function (err) {
                        assert.ok(err);
                        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                            if (err) {
                                done(err);
                            } else {
                                assert.strictEqual(files.length, 0, 'expected cache with id foobar to be empty');
                                done();
                            }
                        });
                    });
                });
            });

            it('should return the cached result of a previously memoized async function', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3,
                    d;
                memoize.fn(function (a, b, cb) { setTimeout(function () { cb(null, a + b + c); }, 100); }, { cacheId: 'foobar', async: true }).then(function (memFn) {
                    memFn(1, 2, function (err, sum) { if (err) { throw err; } d = sum; }).then(function () {
                        assert.strictEqual(d, 6, 'expected d to strictly equal 6');
                        d = undefined;
                        c = 999;
                        memFn(1, 2, function (err, sum) { if (err) { throw err; } d = sum; }).then(function () {
                            assert.strictEqual(d, 6, 'expected result to strictly equal 6');
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
                var cachePath = path.join(__dirname, '../build/cache'),
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
                var cachePath = path.join(__dirname, '../build/cache'),
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
                var cachePath = path.join(__dirname, '../build/cache'),
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

            it('should cache the result of a memoized function on second execution with option serialize with the value null', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3;
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar', serialize: null }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar', serialize: null }).then(function (memFn) {
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
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath }),
                    c = 3,
                    Circ = function () {
                      this.abc = 'Hello';
                      this.circular = this;
                    },
                    serializeObj = {qux: 321, circular: new Circ(), fun: function () {}};
                memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar', serialize: serializeObj }).then(function (memFn) {
                    memFn(1, 2).then(function (result) {
                        assert.strictEqual(result, 6, 'expected result to strictly equal 6');
                        memoize.fn(function (a, b) { return a + b + c; }, { cacheId: 'foobar', serialize: serializeObj }).then(function (memFn) {
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
                var cachePath = path.join(__dirname, '../build/cache'),
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
        });

        describe('invalidate cache', function () {

            it('should recache the result of a memoized function after invalidating the cache before the second execution', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
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
                var cachePath = path.join(__dirname, '../build/cache'),
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

            it('should return a rejecting promise instance if cacheId param is not of type string', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.invalidate(true).then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });
        });

        describe('errors', function () {

            it('should throw an error when trying to memoize a function with an invalid cache path', function (done) {
                var cachePath = path.join(__dirname, '../README.md'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.invalidate(true).then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });

            it('should throw an error when trying to memoize a function with an invalid combination of cache path and cache id', function (done) {
                var cachePath = path.join(__dirname, '..'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function () {}, { cacheId: 'README.md' }).then(function () {
                    done(Error('entered resolve handler instead of error handler'));
                }, function (err) {
                    assert.ok(err);
                    done();
                });
            });

            it('should throw an error when trying to write cache on a file without having the necessary permission', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function () { return 1; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn().then(function () {
                        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                            if (err) {
                                done(err);
                            } else {
                                assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar');
                                fs.chmod(path.join(cachePath, 'foobar', files[0]), 0, function(err) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        memoize.fn(function () { return 1; }, { cacheId: 'foobar', force: true }).then(function (memFn) {
                                            memFn().then(function () {
                                                done(Error('entered resolve handler instead of error handler'));
                                            }, function (err) {
                                                assert.ok(err);
                                                done();
                                            });
                                        }, done);
                                    }
                                });
                            }
                        });
                    }, done);
                }, done);
            });

            it('should throw an error trying to invalidate cache without having the necessary permission', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function () { return 1; }, { cacheId: 'foobar' }).then(function (memFn) {
                    memFn().then(function () {
                        fs.chmod(path.join(cachePath, 'foobar'), 0, function(err) {
                            if (err) {
                                done(err);
                            } else {
                                memoize.invalidate('foobar').then(function () {
                                    done(Error('entered resolve handler instead of error handler'));
                                }, function (err) {
                                    assert.ok(err);
                                    fs.chmod(path.join(cachePath, 'foobar'), '755', function(err) {
                                        if (err) {
                                            done(err);
                                        } else {
                                            done();
                                        }
                                    });
                                });
                            }
                        });
                    }, done);
                }, done);
            });

            it('should throw an error when trying to memoize a function with options of invalid type', function (done) {
                var cachePath = path.join(__dirname, '../build/cache'),
                    memoize = memoizeFs({ cachePath: cachePath });
                memoize.fn(function() {}, true).then(function () {
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
