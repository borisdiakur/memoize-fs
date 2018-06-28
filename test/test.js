'use strict'
/* global describe, beforeEach, it */
/* eslint no-useless-escape: 0 */

var assert = require('assert')
var fs = require('fs')
var path = require('path')
var rmdir = require('rimraf')
var Promise = require('es6-promise').Promise
var memoizeFs = require('../index.js')

describe('memoize-fs', function () {
  beforeEach(function (done) {
    rmdir(path.join(__dirname, '../build/cache'), done)
  })

  describe('check args', function () {
    it('should throw an error when options param is not provided', function (done) {
      assert.throws(function () {
        memoizeFs()
      }, Error, 'expected to throw an error when options parameter is missing')
      done()
    })

    it('should throw an error when options param is not of type object', function (done) {
      assert.throws(function () {
        memoizeFs('foobar')
      }, Error, 'expected to throw an error when options parameter is not of type object')
      done()
    })

    it('should throw an error when option param cachePath is not provided', function (done) {
      assert.throws(function () {
        memoizeFs({})
      }, Error, 'expected to throw an error when option param cachePath is not provided')
      done()
    })

    it('should throw an error when option param cachePath is not of type string', function (done) {
      assert.throws(function () {
        memoizeFs({cachePath: true})
      }, Error, 'expected to throw an error when option param cachePath is not of type string')
      done()
    })

    it('should throw an error when option value is not of type object', function (done) {
      assert.throws(function () {
        memoizeFs('foobar')
      }, Error, 'expected to throw an error when option value is not of type object')
      done()
    })
  })

  describe('init cache', function () {
    it('should create a cache folder before caching', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function () {
      }).then(function (memoized) {
        assert.strictEqual(typeof memoized, 'function', 'expected a memoized function to be passed as the only argument of the resolved handler')
        fs.exists(cachePath, function (exists) {
          assert.ok(exists, 'expected a cache folder with given path to exist')
          done()
        })
      }, done)
    })

    it('should create a cache sub-folder before caching', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function () {
      }, {cacheId: 'foobar'}).then(function (memoized) {
        assert.strictEqual(typeof memoized, 'function', 'expected a memoized function to be passed as the only argument of the resolved handler')
        fs.exists(path.join(cachePath, 'foobar'), function (exists) {
          assert.ok(exists, 'expected a cache folder with given path to exist')
          done()
        })
      }, function (err) {
        done(err)
      })
    })

    it('should reject with invalid cache path', function (done) {
      var cachePath = '/öäüß'
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function () {
      }, {cacheId: 'foobar'}).then(function () {
        done(new Error('entered resolve handler instead of error handler'))
      }, function (err) {
        assert.ok(err)
        done()
      })
    })
  })

  describe('memoize fn', function () {
    it('should return a rejecting promise instance if fn param is not provided', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn().then(function () {
        done(Error('entered resolve handler instead of error handler'))
      }, function (err) {
        assert.ok(err)
        done()
      })
    })

    it('should return a rejecting promise instance if fn param is not of type function', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn('foobar').then(function () {
        done(Error('entered resolve handler instead of error handler'))
      }, function (err) {
        assert.ok(err)
        done()
      })
    })

    it('should return a rejecting promise instance if salt param is not of type string', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function () {
      }, {salt: true}).then(function () {
        done(Error('entered resolve handler instead of error handler'))
      }, function (err) {
        assert.ok(err)
        done()
      })
    })

    it('should return a rejecting promise instance if cacheId param is not of type string', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function () {
      }, {cacheId: true}).then(function () {
        done(Error('entered resolve handler instead of error handler'))
      }, function (err) {
        assert.ok(err)
        done()
      })
    })

    it('should return a rejecting promise instance if maxAge param is not of type number', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function () {
      }, {maxAge: true}).then(function () {
        done(Error('entered resolve handler instead of error handler'))
      }, function (err) {
        assert.ok(err)
        done()
      })
    })
  })

  describe('process fn', function () {
    it('should not cache the result of a memoized function if an exception is raised during execution', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function () {
        throw new Error('qux')
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn().then(function () {
          done(Error('entered resolve handler instead of error handler'))
        }, function (err) {
          assert.ok(err)
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 0, 'expected cache with id foobar to be empty')
              done()
            }
          })
        })
      })
    })

    it('should not cache the result of a memoized promisified function if an exception is raised during execution', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function () {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            reject(Error('qux'))
          }, 100)
        })
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn().then(function () {
          done(Error('entered resolve handler instead of error handler'))
        }, function (err) {
          assert.ok(err)
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 0, 'expected cache with id foobar to be empty')
              done()
            }
          })
        })
      })
    })

    it('should cache the result of a memoized function on first execution to its cache folder', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function (a, b) {
        return a + b + c
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(1, 2).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          c = 999
          return memFn(1, 2)
        }).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should cache the result of a memoized function on first execution to its cache folder with salt', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function (a, b) {
        return a + b + c
      }, {
        cacheId: 'foobar',
        salt: 'qux'
      }).then(function (memFn) {
        memFn(1, 2).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          c = 999
          return memFn(1, 2)
        }).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }, done).catch(done)
    })

    it('should cache the result of a memoized function on first execution to the root cache folder if no cache id is provided', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function (a, b) {
        return a + b + c
      }).then(function (memFn) {
        memFn(1, 2).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          fs.readdir(path.join(cachePath), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should return the cached result with the value undefined of a previously memoized function with return type void', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 0
      memoize.fn(function () {
        ++c
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn().then(function (result) {
          assert.strictEqual(c, 1, 'expected variable from outer scope to strictly equal 1')
          assert.strictEqual(result, undefined, 'expected result to strictly equal undefined')
          return memFn()
        }).then(function (result) {
          assert.strictEqual(c, 1, 'expected variable from outer scope to still strictly equal 1')
          assert.strictEqual(result, undefined, 'expected result to strictly equal undefined')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should return the cached result of type number of a previously memoized function', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function (a, b) {
        return a + b + c
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(1, 2).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          c = 999
          return memFn(1, 2)
        }).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should return the cached result of type number of a previously memoized function cached in the root cache folder if no cache id is provided', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function (a, b) {
        return a + b + c
      }).then(function (memFn) {
        memFn(1, 2).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          c = 999
          return memFn(1, 2)
        }).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          fs.readdir(path.join(cachePath), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should return the cached result of type string of a previously memoized function', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function (a, b) {
        return String(a) + String(b) + String(c)
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(1, 2).then(function (result) {
          assert.strictEqual(result, '123', 'expected result to strictly equal "123"')
          c = 999
          return memFn(1, 2)
        }).then(function (result) {
          assert.strictEqual(result, '123', 'expected result to strictly equal "123"')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should return the cached result of type string with lots of quotation marks in it of a previously memoized function', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function (a, b) {
        return '"{"foo": "bar", "qux": "\'sas\'\"quatch\""}"' + (a + b)
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(1, 2).then(function (result) {
          assert.strictEqual(result, '"{"foo": "bar", "qux": "\'sas\'\"quatch\""}"3', 'expected result to strictly equal "{"foo": "bar", "qux": "\'sas\'\"quatch\""}"3')
          return memFn(1, 2)
        }).then(function (result) {
          assert.strictEqual(result, '"{"foo": "bar", "qux": "\'sas\'\"quatch\""}"3', 'expected result to strictly equal "{"foo": "bar", "qux": "\'sas\'\"quatch\""}"3')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should return the cached result with the value undefined of a previously memoized function', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c
      memoize.fn(function (a, b) {
        return a || b || c
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(undefined, undefined).then(function (result) {
          assert.strictEqual(result, undefined, 'expected result to strictly equal undefined')
          c = true
          return memFn(undefined, undefined)
        }).then(function (result) {
          assert.strictEqual(result, undefined, 'expected result to strictly equal undefined')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should return the cached result with the value null of a previously memoized function', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = null
      memoize.fn(function (a, b) {
        return a || b || c
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(null, null).then(function (result) {
          assert.strictEqual(result, null, 'expected result to strictly equal null')
          c = true
          return memFn(null, null)
        }).then(function (result) {
          assert.strictEqual(result, null, 'expected result to strictly equal null')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should return the cached result with the value NaN of a previously memoized function converting NaN to undefined', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c
      memoize.fn(function (a, b) {
        return a + b + c
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(1, 2).then(function (result) {
          assert.ok(isNaN(result), 'expected result to be NaN')
          c = 3
          return memFn(1, 2)
        }).then(function (result) {
          assert.strictEqual(result, undefined, 'expected result to be undefined')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should return the cached result of type object of a previously memoized function', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      var Circ = function () {
        this.abc = 'Hello'
        this.circular = this
      }
      memoize.fn(function (a, b, circ) {
        return {
          a: a,
          b: b,
          c: c,
          d: {
            e: [
              3,
              2,
              1
            ],
            f: null,
            g: 'qux'
          },
          circ: new Circ()
        }
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(1, 2, new Circ()).then(function (result) {
          assert.ok(Circ.prototype.isPrototypeOf(result.circ))
          assert.strictEqual(result.circ.abc, 'Hello')
          assert.strictEqual(result.circ.circular.abc, 'Hello')
          assert.strictEqual(result.circ.circular.circular.abc, 'Hello')
          delete result.circ
          assert.deepEqual(result, {
            a: 1,
            b: 2,
            c: 3,
            d: {
              e: [
                3,
                2,
                1
              ],
              f: null,
              g: 'qux'
            }
          })
          c = 999
          return memFn(1, 2, new Circ())
        }).then(function (result) {
          assert.deepEqual(result, {
            a: 1,
            b: 2,
            c: 3,
            d: {
              e: [
                3,
                2,
                1
              ],
              f: null,
              g: 'qux'
            },
            circ: {abc: 'Hello'}
          })
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should return the cached result of a previously memoized promisified async function', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function (a, b) {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(a + b + c)
          }, 100)
        })
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(1, 2).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          c = 999
          return memFn(1, 2)
        }).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should ignore arguments of type function silently during serialization', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var d = 3
      memoize.fn(function (a, b, c) {
        return a + b + d
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(1, 2, function foo () {
          return true
        }).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          d = 999
          return memFn(1, 2, function bar () {
            return false
          })
        }).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should ignore argument attributes of type function silently during serialization', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var d = 3
      memoize.fn(function (a, b, c) {
        return a + b + d
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(1, 2, {
          foo: function () {
            return true
          }
        }).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          d = 999
          return memFn(1, 2, {
            bar: function () {
              return false
            }
          })
        }).then(function (result) {
          assert.strictEqual(result, 6, 'expected result to strictly equal 6')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })
  })

  describe('async', function () {
    it('should return a rejecting promise instance if option async is provided but function has no callback', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function (a, cb) {
        cb(a)
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(1, 2).then(function () {
          done(Error('entered resolve handler instead of error handler'))
        }, function (err) {
          assert.ok(err)
          done()
        })
      }).catch(done)
    })

    it('should not cache the result of a memoized async function if its callback receives an error', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function (cb) {
        setTimeout(function () {
          cb(new Error('qux'))
        }, 100)
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(function (err) { // eslint-disable-line handle-callback-err
        }).then(function () {
          done(Error('entered resolve handler instead of error handler'))
        }, function (err) {
          assert.ok(err)
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 0, 'expected cache with id foobar to be empty')
              done()
            }
          })
        })
      })
    })

    it('should return the cached result of a previously memoized async function', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      var d
      memoize.fn(function (a, b, cb) {
        setTimeout(function () {
          cb(null, a + b + c)
        }, 100)
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(1, 2, function (err, sum) {
          if (err) {
            throw err
          }
          d = sum
        }).then(function () {
          assert.strictEqual(d, 6, 'expected d to strictly equal 6')
          d = undefined
          c = 999
          return memFn(1, 2, function (err, sum) {
            if (err) {
              throw err
            }
            d = sum
          })
        }).then(function () {
          assert.strictEqual(d, 6, 'expected result to strictly equal 6')
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should return the cached result of a previously memoized async function with a callback which only excepts an error argument', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = true
      var d
      memoize.fn(function (a, b, cb) {
        setTimeout(function () {
          cb(a && b && c ? null : new Error('qux'))
        }, 100)
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(true, true, function (err) {
          if (err) {
            d = err
          }
        }).then(function () {
          assert.ifError(d)
          d = undefined
          c = false
          return memFn(true, true, function (err) {
            if (err) {
              d = err
            }
          })
        }).then(function () {
          assert.ifError(d)
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })

    it('should return the cached result of a previously memoized async function which only excepts a callback argument', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = true
      var d
      memoize.fn(function (cb) {
        setTimeout(function () {
          cb(c ? null : new Error('qux'))
        }, 100)
      }, {cacheId: 'foobar'}).then(function (memFn) {
        memFn(function (err) {
          if (err) {
            d = err
          }
        }).then(function () {
          assert.ifError(d)
          d = undefined
          c = false
          return memFn(function (err) {
            if (err) {
              d = err
            }
          })
        }).then(function () {
          assert.ifError(d)
          fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
            if (err) {
              done(err)
            } else {
              assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
              done()
            }
          })
        }).catch(done)
      }).catch(done)
    })
  })

  describe('force recaching', function () {
    it('should not recache the result of a memoized function on second execution if force option is not set', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({ cachePath: cachePath })
      var c = 3
      memoize.fn(function (a, b) { return a + b + c }, { cacheId: 'foobar' }).then(function (memFn) {
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 6, 'expected result to strictly equal 6')
        return memoize.fn(function (a, b) { return a + b + c }, { cacheId: 'foobar' })
      }).then(function (memFn) {
        c = 999
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 6, 'expected result to strictly equal 6')
        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
          if (err) {
            done(err)
          } else {
            assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
            done()
          }
        })
      }).catch(done)
    })

    it('should recache the result of a memoized function on second execution if force option is set', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function (a, b) { return a + b + c }, {cacheId: 'foobar'}).then(function (memFn) {
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 6, 'expected result to strictly equal 6')
        return memoize.fn(function (a, b) { return a + b + c }, {
          cacheId: 'foobar',
          force: true
        })
      }).then(function (memFn) {
        c = 4
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 7, 'expected result to strictly equal 7')
        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
          if (err) {
            done(err)
          } else {
            assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
            done()
          }
        })
      }).catch(done)
    })
  })

  describe('noBody', function () {
    it('should cache the result of a memoized function on second execution with option noBody set to true with different function names', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function foo (a, b) {
        return a + b + c
      }, {
        cacheId: 'foobar',
        serialize: 'qux',
        noBody: true
      }).then(function (memFn) {
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 6, 'expected result to strictly equal 6')
        return memoize.fn(function bar (a, b) {
          return a + b + c
        }, {
          cacheId: 'foobar',
          serialize: 'qux',
          noBody: true
        })
      }).then(function (memFn) {
        c = 999
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 6, 'expected result to strictly equal 6')
        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
          if (err) {
            done(err)
          } else {
            assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
            done()
          }
        })
      }).catch(done)
    })

    it('should not cache the result of a memoized function on second execution with option noBody not set with different function names', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function foo (a, b) {
        return a + b + c
      }, {
        cacheId: 'foobar',
        serialize: 'qux'
      }).then(function (memFn) {
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 6, 'expected result to strictly equal 6')
        return memoize.fn(function bar (a, b) {
          return a + b + c
        }, {
          cacheId: 'foobar',
          serialize: 'qux'
        })
      }).then(function (memFn) {
        c = 999
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 1002, 'expected result to strictly equal 1002')
        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
          if (err) {
            done(err)
          } else {
            assert.strictEqual(files.length, 2, 'expected exactly two files in cache with id foobar')
            done()
          }
        })
      }).catch(done)
    })
  })

  describe('astBody', function () {
    it('should cache the result of a memoized function on second execution with option astBody set to true with equivalent function ASTs', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function foo () {
        // double quoted
        return "string" // eslint-disable-line quotes
      }, {
        cacheId: 'foobar',
        serialize: 'qux',
        astBody: true
      }).then(function (memFn) {
        return memFn()
      }).then(function (result) {
        assert.strictEqual(result, 'string', 'expected result to strictly equal "string"')
        return memoize.fn(function foo () {
          // single quoted
          return 'string'
        }, {
          cacheId: 'foobar',
          serialize: 'qux',
          astBody: true
        })
      }).then(function (memFn) {
        return memFn()
      }).then(function (result) {
        assert.strictEqual(result, 'string', 'expected result to strictly equal "string"')
        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
          if (err) {
            done(err)
          } else {
            assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
            done()
          }
        })
      }).catch(done)
    })
  })

  describe('getCacheFilePath', function () {
    it('should return a path', function () {
      var actual = memoizeFs.getCacheFilePath(function () {}, [], {cacheId: './', cachePath: '/'})
      var expected = '/06f254f0b753e0d195804ed804846ba9'
      assert.strictEqual(actual, expected)
    })

    it('should be available on memoizer', function () {
      var cachePath = '/'
      var actual = memoizeFs({cachePath: cachePath}).getCacheFilePath(function () {}, [], {cacheId: './'})
      var expected = '/06f254f0b753e0d195804ed804846ba9'
      assert.strictEqual(actual, expected)
    })
  })

  describe('invalidate cache', function () {
    it('should recache the result of a memoized function after invalidating the cache before the second execution', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function (a, b) {
        return a + b + c
      }, {cacheId: 'foobar'}).then(function (memFn) {
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 6, 'expected result to strictly equal 6')
        return memoize.invalidate('foobar')
      }).then(function () {
        c = 4
        return memoize.fn(function (a, b) {
          return a + b + c
        }, {cacheId: 'foobar'})
      }).then(function (memFn) {
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 7, 'expected result to strictly equal 7')
        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
          if (err) {
            done(err)
          } else {
            assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
            done()
          }
        })
      }).catch(done)
    })

    it('should recache the result of a memoized function after invalidating the root cache by not providing a cache id before the second execution', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function (a, b) {
        return a + b + c
      }, {cacheId: 'foobar'}).then(function (memFn) {
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 6, 'expected result to strictly equal 6')
        return memoize.invalidate()
      }).then(function () {
        fs.exists(cachePath, function (exists) {
          if (exists) {
            done(Error('Cache folder should not exist after invalidating root cache'))
          } else {
            assert.notEqual(exists, true, 'expected to not find the cache folder after invalidating the root cache')
            c = 4
            memoize.fn(function (a, b) {
              return a + b + c
            }, {cacheId: 'foobar'}).then(function (memFn) {
              return memFn(1, 2)
            }).then(function (result) {
              assert.strictEqual(result, 7, 'expected result to strictly equal 7')
              fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
                if (err) {
                  done(err)
                } else {
                  assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
                  done()
                }
              })
            }).catch(done)
          }
        })
      }).catch(done)
    })

    it('should invalidate cache after timeout with maxAge option set', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function (a, b) {
        return a + b + c
      }, {cacheId: 'foobar', maxAge: 10}).then(function (memFn) {
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      }).then(function () {
        return new Promise(function (resolve) {
          setTimeout(resolve, 20)
        })
      }).then(function () {
        c = 4
        return memoize.fn(function (a, b) {
          return a + b + c
        }, {cacheId: 'foobar'})
      }).then(function (memFn) {
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 7, 'expected result to strictly equal 7')
        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
          if (err) {
            done(err)
          } else {
            assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
            done()
          }
        })
      }).catch(done)
    })

    it('should not throw if it fails to invalidate cache after timeout with maxAge option set, because already invalidated manually', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3
      memoize.fn(function (a, b) {
        return a + b + c
      }, {cacheId: 'foobar', maxAge: 10}).then(function (memFn) {
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 6, 'expected result to strictly equal 6')
        return memoize.invalidate('foobar')
      }).then(function () {
        return new Promise(function (resolve) {
          setTimeout(resolve, 20)
        })
      }).then(function () {
        c = 4
        return memoize.fn(function (a, b) {
          return a + b + c
        }, {cacheId: 'foobar'})
      }).then(function (memFn) {
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 7, 'expected result to strictly equal 7')
        fs.readdir(path.join(cachePath, 'foobar'), function (err, files) {
          if (err) {
            done(err)
          } else {
            assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')
            done()
          }
        })
      }).catch(done)
    })
  })

  describe('errors', function () {
    it('should throw an error when trying to memoize a function with an invalid cache path', function (done) {
      var cachePath = path.join(__dirname, '../README.md')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.invalidate(true).then(function () {
        done(Error('entered resolve handler instead of error handler'))
      }, function (err) {
        assert.ok(err)
        done()
      })
    })

    it('should throw an error when trying to memoize a function with an invalid combination of cache path and cache id', function (done) {
      var cachePath = path.join(__dirname, '..')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function () {
      }, {cacheId: 'README.md'}).then(function () {
        done(Error('entered resolve handler instead of error handler'))
      }, function (err) {
        assert.ok(err)
        done()
      })
    })

    it('should throw an error trying to invalidate cache without having the necessary permission', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function () {
        return 1
      }, {cacheId: 'foobar'}).then(function (memFn) {
        return memFn()
      }).then(function () {
        fs.chmod(path.join(cachePath, 'foobar'), 0, function (err) {
          if (err) {
            done(err)
          } else {
            memoize.invalidate('foobar').then(function () {
              done(Error('entered resolve handler instead of error handler'))
            }, function (err) {
              assert.ok(err)
              fs.chmod(path.join(cachePath, 'foobar'), '755', function (err) {
                if (err) {
                  done(err)
                } else {
                  done()
                }
              })
            })
          }
        })
      }).catch(done)
    })

    it('should throw an error when trying to memoize a function with options of invalid type', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      memoize.fn(function () {
      }, true).then(function () {
        done(Error('entered resolve handler instead of error handler'))
      }, function (err) {
        assert.ok(err)
        done()
      })
    })

    it('should throw if it fails to invalidate cache after timeout with maxAge option set, because of EPERM error', function (done) {
      var cachePath = path.join(__dirname, '../build/cache')
      var memoize = memoizeFs({cachePath: cachePath})
      var c = 3

      // remove mocha listener for uncaught exception, add own, then reattach the mocha listener
      var originalException = process.listeners('uncaughtException').pop()
      process.removeListener('uncaughtException', originalException)
      process.once('uncaughtException', function (err) {
        process.listeners('uncaughtException').push(originalException)
        if (err && (err.code === 'EPERM' || err.code === 'EISDIR')) {
          done()
        } else {
          done(err)
        }
      })

      memoize.fn(function (a, b) {
        return a + b + c
      }, {
        cacheId: 'foobar',
        maxAge: 10
      }).then(function (memFn) {
        return memFn(1, 2)
      }).then(function (result) {
        assert.strictEqual(result, 6, 'expected result to strictly equal 6')
        var files = fs.readdirSync(path.join(cachePath, 'foobar'))
        assert.strictEqual(files.length, 1, 'expected exactly one file in cache with id foobar')

        // replace cache file with a non-empty folder with the same name as the cache file
        var cacheFilePath = path.join(cachePath, 'foobar', files[0])
        fs.unlinkSync(cacheFilePath)
        fs.mkdirSync(cacheFilePath)
        fs.writeFileSync(path.join(cachePath, 'qux'), 'quz')
      })
    })
  })
})
