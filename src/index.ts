import * as path from 'path'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import { parse } from 'meriyah'

const serializer = {
  serialize,
  deserialize
}

export interface MemoizerOptions {
  cacheId: string
  cachePath: string
  salt: string
  maxAge: number
  force: boolean
  astBody: boolean
  noBody: boolean
  throwError: boolean
  retryOnInvalidCache: boolean
  serialize: (val: unknown) => string
  deserialize: (val: string) => unknown
}

export interface Memoizer {
  fn: <FN extends (...args: never) => unknown>(
    fn: FN,
    opt?: Partial<MemoizerOptions>
  ) => Promise<(...args: Parameters<FN>) => Promise<Awaited<ReturnType<FN>>>>
  readonly cacheHit: boolean | undefined
  getCacheFilePath: (
    fn: (...args: never) => unknown,
    args: unknown[],
    opt: Partial<MemoizerOptions>
  ) => string
  invalidate: (cacheId?: string) => Promise<void>
}

function serialize(val: unknown) {
  function serializeRec(value: unknown, refs = new WeakSet()) {
    if (value && typeof value === 'object' && refs.has(value)) {
      return
    }

    if (typeof value === 'function') {
      return // ignore arguments and attributes of type function silently
    }

    if (typeof value === 'object' && value !== null) {
      if (refs.has(value)) return
      refs.add(value)
      if (Array.isArray(value)) {
        const arr: Array<unknown> = []
        for (let i = 0; i < value.length; i++) {
          arr[i] = serializeRec(value[i], refs)
        }
        refs.delete(value)
        return arr
      }

      const obj: Record<string, unknown> = {}
      for (const key in value) {
        obj[key] = serializeRec(value[key as keyof object], refs)
      }
      refs.delete(value)
      return obj
    }

    return value
  }

  return JSON.stringify(val, function (_name, value) {
    return serializeRec(value)
  })
}

function deserialize(str: string): unknown {
  return JSON.parse(str).data
}

export function getCacheFilePath(
  fn: unknown,
  args: unknown[],
  opt: Partial<MemoizerOptions>
) {
  const options = { ...serializer, ...opt }
  const salt = options.salt || ''
  let fnStr
  if (!options.noBody) {
    fnStr = String(fn)
    if (options.astBody) {
      fnStr = parse(fnStr, { jsx: true, next: true })
    }
    fnStr = options.astBody ? JSON.stringify(fnStr) : fnStr
  }

  const argsStr = options.serialize(args)
  const hash = crypto
    .createHash('md5')
    .update(fnStr + argsStr + salt)
    .digest('hex')

  return path.join(options.cachePath || '', options.cacheId || '', hash)
}

function checkOptions(allOptions: Partial<MemoizerOptions>) {
  if (allOptions.salt && typeof allOptions.salt !== 'string') {
    throw new TypeError(
      'salt option of type string expected, got: ' + typeof allOptions.salt
    )
  }
  if (allOptions.cacheId && typeof allOptions.cacheId !== 'string') {
    throw new TypeError(
      'cacheId option of type string expected, got: ' +
        typeof allOptions.cacheId
    )
  }
  if (allOptions.maxAge && typeof allOptions.maxAge !== 'number') {
    throw new TypeError('maxAge option of type number bigger zero expected')
  }
  if (allOptions.serialize && typeof allOptions.serialize !== 'function') {
    throw new TypeError('serialize option of type function expected')
  }
  if (allOptions.deserialize && typeof allOptions.deserialize !== 'function') {
    throw new TypeError('deserialize option of type function expected')
  }
  if (
    allOptions.retryOnInvalidCache &&
    typeof allOptions.retryOnInvalidCache !== 'boolean'
  ) {
    throw new TypeError('retryOnInvalidCache option of type boolean expected')
  }
}

// check for existing cache folder, if not found, create folder, then resolve
async function initCache(
  cachePath: string,
  cacheOptions?: Partial<MemoizerOptions>
) {
  try {
    await fs.mkdir(cachePath, { recursive: true })
  } catch (err) {
    if (
      err &&
      (err as unknown as NodeJS.ErrnoException).code === 'EEXIST' &&
      cacheOptions?.throwError === false
    ) {
      return
    }
    throw err
  }
}

async function writeResult(
  r: unknown,
  cb: (...cbArgs: unknown[]) => void,
  optExt: MemoizerOptions,
  filePath: string
) {
  let resultObj
  let resultString
  if ((r && typeof r === 'object') || typeof r === 'string') {
    resultObj = { data: r }
    resultString = optExt.serialize(resultObj)
  } else {
    resultString = '{"data":' + r + '}'
  }
  try {
    await fs.writeFile(filePath, resultString)
    cb()
  } catch (err) {
    cb(err)
  }
}

function parseResult(
  resultString: string,
  deserialize: (s: string) => unknown
) {
  try {
    return deserialize(resultString)
  } catch (e) {
    return undefined
  }
}

function isPromise(something: unknown): something is PromiseLike<unknown> {
  return Boolean(
    something && typeof (something as PromiseLike<unknown>).then === 'function'
  )
}

async function processFn<FN extends (...args: unknown[]) => unknown>(
  fn: FN,
  args: unknown[],
  allOptions: MemoizerOptions,
  filePath: string,
  resolve: (result: unknown) => void,
  reject: (err: unknown) => void,
  cacheHitObj: {
    cacheHit: boolean | undefined
  }
) {
  let writtenResult: unknown
  let result: unknown
  try {
    result = await (fn as (...args: unknown[]) => unknown).apply(null, args)
  } catch (err) {
    cacheHitObj.cacheHit = undefined
    reject(err)
    return
  }
  if (isPromise(result)) {
    // result is a promise instance
    const resolved = await result
    await writeResult(
      resolved,
      function () {
        writtenResult = resolved
      },
      allOptions,
      filePath
    )
    cacheHitObj.cacheHit = false
    resolve(writtenResult)
  }

  await writeResult(
    result,
    function (err) {
      if (err) {
        throw err
      }
      writtenResult = result
    },
    allOptions,
    filePath
  )
  cacheHitObj.cacheHit = false
  resolve(writtenResult)
}

async function processFnAsync<FN>(
  fn: FN,
  fnaCb: (...args: unknown[]) => unknown,
  args: unknown[],
  allOptions: MemoizerOptions,
  filePath: string,
  resolve: (result: unknown) => void,
  reject: (err: unknown) => void,
  cacheHitObj: {
    cacheHit: boolean | undefined
  }
) {
  args.pop()

  args.push(async function (/* err, result... */) {
    const cbErr = arguments[0]
    const cbArgs = Array.prototype.slice.call(arguments)
    cbArgs.shift()
    if (cbErr) {
      // if we have an exception we don't cache anything
      cacheHitObj.cacheHit = undefined
      return resolve(cbErr)
    }
    cbArgs.unshift(null)
    try {
      await writeResult(
        cbArgs,
        function () {
          cacheHitObj.cacheHit = false
          resolve(fnaCb.apply(null, cbArgs))
        },
        allOptions,
        filePath
      )
    } catch (err) {
      cacheHitObj.cacheHit = undefined
      reject(err)
    }
  })
  ;(fn as (...args: unknown[]) => unknown).apply(null, args)
}

async function checkFileAgeAndRead(
  filePath: string,
  maxAge?: number
): Promise<string | null> {
  let fileHandle
  try {
    fileHandle = await fs.open(filePath, 'r')

    if (maxAge !== undefined) {
      const stats = await fileHandle.stat()

      const now = new Date().getTime()
      const fileAge = now - stats.mtimeMs

      if (fileAge > maxAge) {
        return null
      }
    }

    const content = await fs.readFile(filePath, { encoding: 'utf8' })
    return content
  } catch (err) {
    return null
  } finally {
    if (fileHandle) {
      await fileHandle.close()
    }
  }
}

export default function buildMemoizer(
  memoizerOptions: Partial<MemoizerOptions>
): Memoizer {
  const cacheHitObj: {
    cacheHit: boolean | undefined
  } = {
    cacheHit: undefined
  }
  const promiseCache: { [key: string]: Promise<unknown> } = {}

  // check args
  if (
    !memoizerOptions ||
    (memoizerOptions && typeof memoizerOptions !== 'object')
  ) {
    throw new Error('options of type object expected')
  }
  if (typeof (memoizerOptions as MemoizerOptions).cachePath !== 'string') {
    throw new Error('option cachePath of type string expected')
  }
  memoizerOptions = { ...serializer, ...memoizerOptions }
  checkOptions(memoizerOptions)

  async function memoizeFn<FN extends (...args: unknown[]) => unknown>(
    fn: FN,
    memoizeOptions?: Partial<MemoizerOptions>
  ) {
    if (memoizeOptions && typeof memoizeOptions !== 'object') {
      throw new Error(
        "opt of type object expected, got '" + typeof memoizeOptions + "'"
      )
    }

    if (typeof fn !== 'function') {
      throw new Error('fn of type function expected')
    }

    const allOptions = {
      cacheId: './',
      ...memoizerOptions,
      ...memoizeOptions
    } as MemoizerOptions
    checkOptions(allOptions)

    await initCache(
      path.join(allOptions.cachePath, allOptions.cacheId),
      allOptions
    )

    return function () {
      const args = Array.prototype.slice.call(arguments)
      const fnaCb = args.length ? args[args.length - 1] : undefined

      let isAsync = false
      if (typeof fnaCb === 'function' && fnaCb.length > 0) {
        isAsync = true
      }

      const filePath = getCacheFilePathBound(fn, args, allOptions)

      if (filePath in promiseCache) {
        return promiseCache[filePath]
      }

      promiseCache[filePath] = new Promise(function (resolve, reject) {
        async function cacheAndReturn() {
          if (isAsync) {
            await processFnAsync(
              fn,
              fnaCb,
              args,
              allOptions,
              filePath,
              resolve,
              reject,
              cacheHitObj
            )
            return
          }
          await processFn(
            fn,
            args,
            allOptions,
            filePath,
            resolve,
            reject,
            cacheHitObj
          )
        }

        checkFileAgeAndRead(filePath, allOptions.maxAge)
          .then(function (data) {
            if (data === null) {
              return cacheAndReturn()
            }

            const parsedData = parseResult(data, allOptions.deserialize)
            if (allOptions.retryOnInvalidCache && parsedData === undefined) {
              return cacheAndReturn()
            }

            function retrieveAndReturn() {
              cacheHitObj.cacheHit = true
              if (isAsync) {
                resolve(fnaCb.apply(null, parsedData))
              } else {
                resolve(parsedData)
              }
            }

            if (allOptions.force) {
              allOptions.force = false
              // result has not been cached yet or needs to be recached - cache and return it!
              cacheAndReturn()
            } else {
              // result has already been cached - return it!
              retrieveAndReturn()
            }
          })
          .catch((err) => {
            if (err.code === 'ENOENT') {
              // Promise hasn't been cached yet.
              return cacheAndReturn()
            } else {
              cacheHitObj.cacheHit = undefined
              reject(err)
            }
          })
      })
      promiseCache[filePath]
        .finally(function () {
          delete promiseCache[filePath]
        })
        .catch(() => {
          /* do nothing */
        })
      return promiseCache[filePath]
    }
  }

  async function invalidateCache(cacheId?: string) {
    if (cacheId && typeof cacheId !== 'string') {
      throw new Error(
        "cacheId option of type string expected, got '" + typeof cacheId + "'"
      )
    } else {
      const cachPath = cacheId
        ? path.join(memoizerOptions.cachePath || '', cacheId)
        : memoizerOptions.cachePath || ''
      await fs.rm(cachPath, { recursive: true })
    }
  }

  function getCacheFilePathBound(
    fn: (...args: never) => unknown,
    args: unknown[],
    opt: Partial<MemoizerOptions>
  ) {
    return getCacheFilePath(fn, args, {
      ...memoizerOptions,
      ...opt,
      cachePath: memoizerOptions.cachePath
    })
  }

  return {
    fn: async function <FN extends (...args: never) => unknown>(
      fn: FN,
      opt?: Partial<MemoizerOptions>
    ) {
      await initCache(memoizerOptions.cachePath || '')
      return memoizeFn(fn as never, opt) as unknown as (
        ...args: Parameters<FN>
      ) => Promise<Awaited<ReturnType<FN>>>
    },
    get cacheHit() {
      return cacheHitObj.cacheHit
    },
    getCacheFilePath: getCacheFilePathBound,
    invalidate: invalidateCache
  }
}
