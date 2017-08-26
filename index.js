'use strict'

var Promise = require('es6-promise').Promise
var mkdirp = require('mkdirp')
var fs = require('fs')
var path = require('path')
var rmdir = require('rimraf')
var crypto = require('crypto')
var parseScript = require('shift-parser').parseScript

module.exports = buildMemoizer

function buildMemoizer (options) {
  // check args
  if (typeof options !== 'object') {
    throw new Error('options of type object expected')
  }
  if (typeof options.cachePath !== 'string') {
    throw new Error('option cachePath of type string expected')
  }

  // check for existing cache folder, if not found, create folder, then resolve
  function initCache (cachePath) {
    return new Promise(function (resolve, reject) {
      mkdirp(cachePath, function (err) {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  function serialize (val) {
    var circRefColl = []
    return JSON.stringify(val, function (name, value) {
      if (typeof value === 'function') {
        return // ignore arguments and attributes of type function silently
      }
      if (typeof value === 'object' && value !== null) {
        if (circRefColl.indexOf(value) !== -1) {
          // circular reference found, discard key
          return
        }
        // store value in collection
        circRefColl.push(value)
      }
      return value
    })
  }

  function getCacheFilePath (fn, args, opt, cachePath) {
    var salt = opt.salt || ''
    var fnStr = (opt.noBody ? '' : opt.astBody ? JSON.stringify(parseScript(String(fn))) : String(fn))
    var argsStr = serialize(args)
    var hash = crypto.createHash('md5').update(fnStr + argsStr + salt).digest('hex')
    return path.join(cachePath, opt.cacheId, hash)
  }

  function memoizeFn (fn, opt) {
    function checkOptions (optExt) {
      if (optExt.salt && typeof optExt.salt !== 'string') {
        throw new Error('salt option of type string expected, got \'' + typeof optExt.salt + '\'')
      }
      if (optExt.cacheId && typeof optExt.cacheId !== 'string') {
        throw new Error('cacheId option of type string expected, got \'' + typeof optExt.cacheId + '\'')
      }
      if (optExt.maxAge && typeof optExt.maxAge !== 'number') {
        throw new Error('maxAge option of type number bigger zero expected')
      }
    }

    if (opt && typeof opt !== 'object') {
      throw new Error('opt of type object expected, got \'' + typeof opt + '\'')
    }

    var optExt = opt || {}

    if (typeof fn !== 'function') {
      throw new Error('fn of type function expected')
    }
    checkOptions(optExt)

    optExt.cacheId = optExt.cacheId || './'

    function resolveWithMemFn () {
      return new Promise(function (resolve) {
        var memFn = function () {
          var args = Array.prototype.slice.call(arguments)
          var fnaCb = args.length ? args[args.length - 1] : undefined

          if (typeof fnaCb === 'function' && fnaCb.length > 0) {
            optExt.async = true
          }

          return new Promise(function (resolve, reject) {
            var filePath = getCacheFilePath(fn, args, optExt, options.cachePath)

            function cacheAndReturn () {
              var result

              function writeResult (r, cb) {
                var resultObj,
                  resultString
                if ((r && typeof r === 'object') || typeof r === 'string') {
                  resultObj = {data: r}
                  resultString = serialize(resultObj)
                } else {
                  resultString = '{"data":' + r + '}'
                }
                if (optExt.maxAge) {
                  setTimeout(function () {
                    fs.unlink(filePath, function (err) {
                      if (err && err.code !== 'ENOENT') {
                        throw err
                      }
                    })
                  }, optExt.maxAge)
                }
                fs.writeFile(filePath, resultString, cb)
              }

              function processFnAsync () {
                args.pop()

                args.push(function (/* err, result... */) {
                  var cbErr = arguments[0]
                  var cbArgs = Array.prototype.slice.call(arguments)
                  cbArgs.shift()
                  if (cbErr) {
                    // if we have an exception we don't cache anything
                    return reject(cbErr)
                  }
                  cbArgs.unshift(null)
                  writeResult(cbArgs, function () {
                    resolve(fnaCb.apply(null, cbArgs))
                  })
                })
                fn.apply(null, args)
              }

              function processFn () {
                try {
                  result = fn.apply(null, args)
                } catch (e) {
                  return reject(e)
                }
                if (result && result.then && typeof result.then === 'function') {
                  // result is a promise instance
                  return result.then(function (retObj) {
                    writeResult(retObj, function () {
                      resolve(retObj)
                    })
                  },
                  function (err) {
                    // if we have an exception we don't cache anything
                    reject(err)
                  })
                } else {
                  writeResult(result, function (err) {
                    if (err) {
                      reject(err)
                    } else {
                      resolve(result)
                    }
                  })
                }
              }

              if (optExt.async) {
                return processFnAsync()
              }
              return processFn()
            }

            fs.readFile(filePath, {encoding: 'utf8'}, function (err, data) {
              if (err) {
                return cacheAndReturn()
              }

              function parseResult (resultString) {
                try {
                  return JSON.parse(resultString).data // will fail on NaN
                } catch (e) {
                  return undefined
                }
              }

              function retrieveAndReturn () {
                function processFnAsync () {
                  resolve(fnaCb.apply(null, parseResult(data)))
                }

                function processFn () {
                  resolve(parseResult(data))
                }

                if (optExt.async) {
                  return processFnAsync()
                }
                return processFn()
              }

              if (optExt.force) {
                delete optExt.force
                // result has not been cached yet or needs to be recached - cache and return it!
                cacheAndReturn()
              } else {
                // result has already been cached - return it!
                retrieveAndReturn()
              }
            })
          })
        }
        resolve(memFn)
      })
    }

    return initCache(path.join(options.cachePath, optExt.cacheId)).then(resolveWithMemFn)
  }

  function invalidateCache (cacheId) {
    return new Promise(function (resolve, reject) {
      if (cacheId && typeof cacheId !== 'string') {
        reject(Error('cacheId option of type string expected, got \'' + typeof cacheId + '\''))
      } else {
        var cachPath = cacheId ? path.join(options.cachePath, cacheId) : options.cachePath
        rmdir(cachPath, function (err) {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      }
    })
  }

  var cache = initCache(options.cachePath)

  return {
    'fn': function (fn, opt) {
      return cache.then(function () {
        return memoizeFn(fn, opt)
      }, function (err) {
        throw err
      })
    },
    'invalidate': invalidateCache
  }
}
