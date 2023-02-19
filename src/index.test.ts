/* eslint-disable @typescript-eslint/no-empty-function */
import { it, assert, describe, beforeEach } from 'vitest'
import {
  readdir,
  chmod,
  rm,
  writeFile,
  readFile,
  access,
  constants,
} from 'fs/promises'
import memoizeFs, { getCacheFilePath, type MemoizerOptions } from './index'
import * as path from 'path'
import serialize from 'serialize-javascript'

const FIXTURE_CACHE = path.join(__dirname, '..', 'fixture-cache')

describe('memoize-fs', () => {
  beforeEach(async () => {
    await rm(FIXTURE_CACHE, { recursive: true, force: true })
  })
  describe('check args', () => {
    it('throws error when opts.serialize is not a function when passed', async () => {
      let err
      try {
        memoizeFs({
          cachePath: FIXTURE_CACHE,
          serialize: 123,
        } as unknown as MemoizerOptions)
      } catch (exc) {
        err = exc
      }
      assert.ok((err as unknown) instanceof Error)
      assert.ok(
        (err as unknown as Error).message.includes(
          'serialize option of type function expected'
        )
      )
    })
    it('throws error when opts.deserialize is not a function when passed', async () => {
      let err
      try {
        memoizeFs({
          cachePath: FIXTURE_CACHE,
          deserialize: 123,
        } as unknown as MemoizerOptions)
      } catch (exc) {
        err = exc
      }
      assert.ok((err as unknown) instanceof Error)
      assert.ok(
        (err as unknown as Error).message.includes(
          'deserialize option of type function expected'
        )
      )
    })
    it('throws error when options param is not provided', async () => {
      let err
      try {
        memoizeFs(undefined as unknown as MemoizerOptions)
      } catch (exc) {
        err = exc
      }
      assert.ok((err as unknown) instanceof Error)
      assert.ok(
        (err as unknown as Error).message.includes(
          'options of type object expected'
        )
      )
    })
    it('throws error when options param is not of type object', async () => {
      let err
      try {
        memoizeFs('foobar' as unknown as MemoizerOptions)
      } catch (exc) {
        err = exc
      }
      assert.ok((err as unknown) instanceof Error)
    })
    it('throws error when options param cachePath is not provided', async () => {
      let err
      try {
        memoizeFs({} as MemoizerOptions)
      } catch (exc) {
        err = exc
      }
      assert.ok((err as unknown) instanceof Error)
    })
    it('throws error when options param cachePath is not of type string', async () => {
      let err
      try {
        memoizeFs({ cachePath: true } as unknown as MemoizerOptions)
      } catch (exc) {
        err = exc
      }
      assert.ok((err as unknown) instanceof Error)
    })
    it('throws error when options param retryOnInvalidCache is not of type boolean', async () => {
      let err
      try {
        memoizeFs({
          cachePath: 'yolo',
          retryOnInvalidCache: 'yes',
        } as unknown as MemoizerOptions)
      } catch (exc) {
        err = exc
      }
      assert.ok((err as unknown) instanceof Error)
    })
  })

  describe('init cache', () => {
    it('creates a cache folder before caching', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      const memFn = await memoize.fn(function () {
        /**/
      })
      assert.strictEqual(
        typeof memFn,
        'function',
        'expected a memoized function to be passed as the only argument of the resolved handler'
      )
      await access(cachePath, constants.F_OK)
    })
    it('creates a cache sub-folder before caching', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      const memFn = await memoize.fn(
        function () {
          /**/
        },
        { cacheId: 'foobar' }
      )
      assert.strictEqual(
        typeof memFn,
        'function',
        'expected a memoized function to be passed as the only argument of the resolved handler'
      )
      await access(path.join(cachePath, 'foobar'), constants.F_OK)
    })
    it('passes custom serialize and deserialize through memoizeFS options', async () => {
      const cachePath = FIXTURE_CACHE
      function deserialize(serializedJavascript: string) {
        // eslint-disable-next-line no-eval
        return eval(`(() => (${serializedJavascript}))()`).data
      }

      const options = { cachePath, cacheId: 'tmp', serialize, deserialize }
      const memoize = memoizeFs(options)

      function toBeMemoized(abc: number) {
        return {
          abc,
          foo() {
            return 100 + abc
          },
        }
      }

      const memFn = await memoize.fn(toBeMemoized)
      let res
      res = await memFn(200)
      assert.strictEqual(res.abc, 200)
      assert.strictEqual(typeof res.foo, 'function')
      res = await memFn(200)
      assert.strictEqual(res.abc, 200)
      assert.strictEqual(typeof res.foo, 'function')
      res = await memFn(400)
      assert.strictEqual(res.abc, 400)
      assert.strictEqual(typeof res.foo, 'function')

      const fileWith200 = getCacheFilePath(toBeMemoized, [200], options)
      const fileString200 = await readFile(fileWith200, { encoding: 'utf8' })
      assert.ok(fileString200.includes('"abc":200,"foo":function() {'))

      const fileWith400 = getCacheFilePath(toBeMemoized, [400], options)
      const fileString400 = await readFile(fileWith400, { encoding: 'utf8' })
      assert.ok(fileString400.includes('"abc":400,"foo":function() {'))

      await rm(cachePath, {
        recursive: true,
        force: true,
      })
    })
    it('throws with invalid cache path', async () => {
      let throws = false
      try {
        const cachePath = '/öäüß'
        const memoize = memoizeFs({ cachePath })
        await memoize.fn(() => {}, { cacheId: 'foobar' })
      } catch (err) {
        throws = true
      }
      assert.ok(throws)
    })
  })

  describe('memoize fn', () => {
    it('throws if fn param is not provided', async () => {
      let throws = false
      try {
        const cachePath = FIXTURE_CACHE
        const memoize = memoizeFs({ cachePath })
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await memoize.fn()
      } catch (err) {
        throws = true
      }
      assert.ok(throws)
    })
    it('throws if fn param is not of type function', async () => {
      let throws = false
      try {
        const cachePath = FIXTURE_CACHE
        const memoize = memoizeFs({ cachePath })
        await memoize.fn('foobar' as unknown as () => void)
      } catch (err) {
        throws = true
      }
      assert.ok(throws)
    })
    it('throws if salt param is not of type string', async () => {
      let throws = false
      try {
        const cachePath = FIXTURE_CACHE
        const memoize = memoizeFs({ cachePath })
        await memoize.fn(() => {}, { salt: true as unknown as string })
      } catch (err) {
        throws = true
      }
      assert.ok(throws)
    })
    it('throws if cacheId param is not of type string', async () => {
      let throws = false
      try {
        const cachePath = FIXTURE_CACHE
        const memoize = memoizeFs({ cachePath })
        await memoize.fn(() => {}, { cacheId: true as unknown as string })
      } catch (err) {
        throws = true
      }
      assert.ok(throws)
    })
    it('throws if maxAge param is not of type number', async () => {
      let throws = false
      try {
        const cachePath = FIXTURE_CACHE
        const memoize = memoizeFs({ cachePath })
        await memoize.fn(() => {}, { maxAge: true as unknown as number })
      } catch (err) {
        throws = true
      }
      assert.ok(throws)
    })
  })

  describe('process fn', () => {
    it('does not cache the result of a memoized function if an exception is raised during execution', async () => {
      const cachePath = FIXTURE_CACHE
      let err
      const memoize = memoizeFs({
        cachePath,
      })

      const memFn = await memoize.fn(
        () => {
          throw new Error('qux')
        },
        { cacheId: 'foobar' }
      )
      try {
        await memFn()
      } catch (exc) {
        err = exc
      }
      assert.ok((err as unknown) instanceof Error)
      assert.ok((err as unknown as Error).message.includes('qux'))

      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        0,
        'expected cache with id foobar to be empty'
      )
    })

    it('does not cache the result of a memoized promisified function if an exception is raised during execution', async () => {
      const cachePath = FIXTURE_CACHE
      let err
      const memoize = memoizeFs({
        cachePath,
      })

      const memFn = await memoize.fn(
        () =>
          new Promise(function (resolve, reject) {
            setTimeout(function () {
              reject(Error('qux'))
            }, 10)
          }),
        { cacheId: 'foobar' }
      )
      try {
        await memFn()
      } catch (exc) {
        err = exc
      }
      assert.ok((err as unknown) instanceof Error)
      assert.ok((err as unknown as Error).message.includes('qux'))

      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        0,
        'expected cache with id foobar to be empty'
      )
    })

    it('caches the result of a memoized function on first execution to its cache folder', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({
        cachePath,
      })
      let c = 3
      const memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar' }
      )
      let result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      c = 999
      result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')

      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('caches the result of a memoized function on first execution to its cache folder with salt', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({
        cachePath,
      })
      let c = 3
      const memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar', salt: 'qux' }
      )
      let result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      c = 999
      result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')

      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('caches the result of a memoized function on first execution to the root cache folder if no cache id is provided', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({
        cachePath,
      })
      let c = 3
      const memFn = await memoize.fn(function (a: number, b: number) {
        return a + b + c
      })
      let result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      c = 999
      result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')

      const files = await readdir(path.join(cachePath))
      assert.strictEqual(files.length, 1, 'expected exactly one file in cache')
    })

    it('returns the cached result with the value undefined of a previously memoized function with return type void', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({
        cachePath,
      })
      let c = 0
      const memFn = await memoize.fn(
        function () {
          ++c
        },
        { cacheId: 'foobar' }
      )
      let result = await memFn()
      assert.strictEqual(
        c,
        1,
        'expected constiable from outer scope to strictly equal 1'
      )
      assert.strictEqual(
        result,
        undefined,
        'expected result to strictly equal undefined'
      )
      result = await memFn()
      assert.strictEqual(
        c,
        1,
        'expected constiable from outer scope to still strictly equal 1'
      )
      assert.strictEqual(
        result,
        undefined,
        'expected result to strictly equal undefined'
      )

      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('returns the cached result of type number of a previously memoized function', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({
        cachePath,
      })
      let c = 3
      const memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar' }
      )
      let result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      c = 999
      result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')

      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('returns the cached result of type number of a previously memoized function cached in the root cache folder if no cache id is provided', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({
        cachePath,
      })
      let c = 3
      const memFn = await memoize.fn(function (a: number, b: number) {
        return a + b + c
      })
      let result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      c = 999
      result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')

      const files = await readdir(path.join(cachePath))
      assert.strictEqual(files.length, 1, 'expected exactly one file in cache')
    })

    it('returns the cached result of type string of a previously memoized function', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({
        cachePath,
      })
      let c = 3
      const memFn = await memoize.fn(
        function (a: number, b: number) {
          return String(a) + String(b) + String(c)
        },
        { cacheId: 'foobar' }
      )
      let result = await memFn(1, 2)
      assert.strictEqual(result, '123', 'expected result to strictly equal 6')
      c = 999
      result = await memFn(1, 2)
      assert.strictEqual(result, '123', 'expected result to strictly equal 6')

      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('returns the cached result of type string with lots of quotation marks in it of a previously memoized function', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({
        cachePath,
      })
      const memFn = await memoize.fn(
        function (a: number, b: number) {
          return '"{"foo": "bar", "qux": "\'sas\'"quatch""}"' + (a + b)
        },
        { cacheId: 'foobar' }
      )
      let result = await memFn(1, 2)
      assert.strictEqual(
        result,
        '"{"foo": "bar", "qux": "\'sas\'"quatch""}"3',
        'expected result to strictly equal "{"foo": "bar", "qux": "\'sas\'"quatch""}"3'
      )
      result = await memFn(1, 2)
      assert.strictEqual(
        result,
        '"{"foo": "bar", "qux": "\'sas\'"quatch""}"3',
        'expected result to strictly equal "{"foo": "bar", "qux": "\'sas\'"quatch""}"3'
      )

      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })
  })

  it('returns the cached result with the value undefined of a previously memoized function', async () => {
    const cachePath = FIXTURE_CACHE
    const memoize = memoizeFs({ cachePath })
    let c: boolean | undefined = undefined
    const memFn = await memoize.fn(
      function (a: undefined, b: undefined) {
        return a || b || c
      },
      { cacheId: 'foobar' }
    )
    let result = await memFn(undefined, undefined)

    assert.strictEqual(
      result,
      undefined,
      'expected result to strictly equal undefined'
    )
    c = true
    result = await memFn(undefined, undefined)

    assert.strictEqual(
      result,
      undefined,
      'expected result to strictly equal undefined'
    )
    const files = await readdir(path.join(cachePath, 'foobar'))
    assert.strictEqual(
      files.length,
      1,
      'expected exactly one file in cache with id foobar'
    )
  })

  it('returns the cached result with the value null of a previously memoized function', async () => {
    const cachePath = FIXTURE_CACHE
    const memoize = memoizeFs({ cachePath })
    let c: boolean | null = null
    const memFn = await memoize.fn(
      function (a: null, b: null) {
        return a || b || c
      },
      { cacheId: 'foobar' }
    )
    let result = await memFn(null, null)
    assert.strictEqual(result, null, 'expected result to strictly equal null')
    c = true
    result = await memFn(null, null)
    assert.strictEqual(result, null, 'expected result to strictly equal null')
    const files = await readdir(path.join(cachePath, 'foobar'))
    assert.strictEqual(
      files.length,
      1,
      'expected exactly one file in cache with id foobar'
    )
  })

  it('returns the cached result with the value NaN of a previously memoized function converting NaN to undefined', async () => {
    const cachePath = FIXTURE_CACHE
    const memoize = memoizeFs({ cachePath })
    let c: number | undefined = undefined
    const memFn = await memoize.fn(
      function (a: number, b: number) {
        return a + b + (c as number)
      },
      { cacheId: 'foobar' }
    )
    let result = await memFn(1, 2)

    assert.ok(isNaN(result), 'expected result to be NaN')
    c = 3
    result = await memFn(1, 2)

    assert.strictEqual(result, undefined, 'expected result to be undefined')
    const files = await readdir(path.join(cachePath, 'foobar'))
    assert.strictEqual(
      files.length,
      1,
      'expected exactly one file in cache with id foobar'
    )
  })

  it('returns the cached result of type object of a previously memoized function', async () => {
    const cachePath = FIXTURE_CACHE
    const memoize = memoizeFs({ cachePath })
    let c = 3
    class Circ {
      abc: string
      circular: Circ
      constructor() {
        this.abc = 'Hello'
        this.circular = this
      }
    }
    const memFn = await memoize.fn(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function (a: unknown, b: unknown, circ: Circ) {
        return {
          a: a,
          b: b,
          c: c,
          d: {
            e: [3, 2, 1],
            f: null,
            g: 'qux',
          },
          circ: new Circ(),
        }
      },
      { cacheId: 'foobar' }
    )
    let result = await memFn(1, 2, new Circ())

    assert.ok(Circ.prototype.isPrototypeOf(result.circ)) // eslint-disable-line no-prototype-builtins
    assert.strictEqual(result.circ.abc, 'Hello')
    assert.strictEqual(result.circ.circular.abc, 'Hello')
    assert.strictEqual(result.circ.circular.circular.abc, 'Hello')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete result.circ
    assert.deepStrictEqual(result, {
      a: 1,
      b: 2,
      c: 3,
      d: {
        e: [3, 2, 1],
        f: null,
        g: 'qux',
      },
    } as never)
    c = 999
    result = await memFn(1, 2, new Circ())

    assert.deepStrictEqual(result, {
      a: 1,
      b: 2,
      c: 3,
      d: {
        e: [3, 2, 1],
        f: null,
        g: 'qux',
      },
      circ: { abc: 'Hello' },
    } as never)
    const files = await readdir(path.join(cachePath, 'foobar'))
    assert.strictEqual(
      files.length,
      1,
      'expected exactly one file in cache with id foobar'
    )
  })

  it('returns the cached result of a previously memoized promisified async function', async () => {
    const cachePath = FIXTURE_CACHE
    const memoize = memoizeFs({ cachePath })
    let c = 3
    const memFn = await memoize.fn(
      function (a: number, b: number) {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(a + b + c)
          })
        })
      },
      { cacheId: 'foobar' }
    )
    let result = await memFn(1, 2)

    assert.strictEqual(result, 6, 'expected result to strictly equal 6')
    c = 999
    result = await memFn(1, 2)

    assert.strictEqual(result, 6, 'expected result to strictly equal 6')
    const files = await readdir(path.join(cachePath, 'foobar'))
    assert.strictEqual(
      files.length,
      1,
      'expected exactly one file in cache with id foobar'
    )
  })

  it('ignores arguments of type function silently during serialization', async () => {
    const cachePath = FIXTURE_CACHE
    const memoize = memoizeFs({ cachePath })
    let d = 3
    const memFn = await memoize.fn(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function (a: number, b: number, c: () => boolean) {
        return a + b + d
      },
      { cacheId: 'foobar' }
    )
    let result = await memFn(1, 2, function foo() {
      return true
    })
    assert.strictEqual(result, 6, 'expected result to strictly equal 6')
    d = 999
    result = await memFn(1, 2, function bar() {
      return false
    })

    assert.strictEqual(result, 6, 'expected result to strictly equal 6')
    const files = await readdir(path.join(cachePath, 'foobar'))
    assert.strictEqual(
      files.length,
      1,
      'expected exactly one file in cache with id foobar'
    )
  })

  it('ignores argument attributes of type function silently during serialization', async () => {
    const cachePath = FIXTURE_CACHE
    const memoize = memoizeFs({ cachePath })
    let d = 3
    const memFn = await memoize.fn(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function (a: number, b: number, c?: { [key: string]: () => boolean }) {
        return a + b + d
      },
      { cacheId: 'foobar' }
    )
    let result = await memFn(1, 2, {
      foo: function () {
        return true
      },
    })

    assert.strictEqual(result, 6, 'expected result to strictly equal 6')
    d = 999
    result = await memFn(1, 2, {
      bar: function () {
        return false
      },
    })

    assert.strictEqual(result, 6, 'expected result to strictly equal 6')
    const files = await readdir(path.join(cachePath, 'foobar'))
    assert.strictEqual(
      files.length,
      1,
      'expected exactly one file in cache with id foobar'
    )
  })

  describe('async', () => {
    it('returns a rejecting promise instance if option async is provided but function has no callback', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      const memFn = await memoize.fn(
        function (a: number, cb: (a: number) => void) {
          cb(a)
        },
        { cacheId: 'foobar' }
      )
      let throws = false
      try {
        await memFn(1, 'yolo' as never)
      } catch (err) {
        throws = true
        assert.ok(
          (err as unknown as Error).message.includes('cb is not a function')
        )
      }
      assert.isTrue(throws)
    })

    it('does not cache the result of a memoized async function if its callback receives an error', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      const memFn = await memoize.fn(
        function (cb: (err: Error) => void) {
          setTimeout(function () {
            cb(new Error('fake error'))
          })
        },
        { cacheId: 'foobar' }
      )

      await memFn(function (err) {
        console.error(err)
      })
      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        0,
        'expected cache with id foobar to be empty'
      )
    })

    it('returns the cached result of a previously memoized async function', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let c = 3
      let d
      const memFn = await memoize.fn(
        function (
          a: number,
          b: number,
          cb: (err: Error | null, v: unknown) => void
        ) {
          setTimeout(function () {
            cb(null, a + b + c)
          })
        },
        { cacheId: 'foobar' }
      )
      await memFn(1, 2, function (err, sum) {
        if (err) {
          throw err
        }
        d = sum
      })
      assert.strictEqual(d, 6, 'expected d to strictly equal 6')
      d = undefined
      c = 999
      await memFn(1, 2, function (err, sum) {
        if (err) {
          throw err
        }
        d = sum
      })
      assert.strictEqual(d, 6, 'expected result to strictly equal 6')
      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('returns the cached result of a previously memoized async function with a callback which only excepts an error argument', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let c = true
      let d
      const memFn = await memoize.fn(
        function (a: boolean, b: boolean, cb: (err: Error | null) => void) {
          setTimeout(function () {
            cb(a && b && c ? null : new Error('qux'))
          })
        },
        { cacheId: 'foobar' }
      )
      await memFn(true, true, function (err) {
        if (err) {
          d = err
        }
      })
      assert.ifError(d)
      d = undefined
      c = false
      await memFn(true, true, function (err) {
        if (err) {
          d = err
        }
      })
      assert.ifError(d)
      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('returns the cached result of a previously memoized async function which only excepts a callback argument', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let c = true
      let d
      const memFn = await memoize.fn(
        function (cb: (err: Error | null) => void) {
          setTimeout(function () {
            cb(c ? null : new Error('qux'))
          })
        },
        { cacheId: 'foobar' }
      )
      await memFn(function (err) {
        if (err) {
          d = err
        }
      })
      assert.ifError(d)
      d = undefined
      c = false
      await memFn(function (err) {
        if (err) {
          d = err
        }
      })
      assert.ifError(d)
      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('runs the memoized function only once even when called with the same arguments on the same tick', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let n = 0
      const memFn = await memoize.fn(function (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        cb: (err: Error | null) => void
      ) {
        return n++
      })
      await Promise.all([memFn(() => {}), memFn(() => {})])
      assert.strictEqual(n, 1)
    })
  })

  describe('force recaching', () => {
    it('should not recache the result of a memoized function on second execution if force option is not set', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let c = 3
      let result = await memoize
        .fn(
          function (a: number, b: number) {
            return a + b + c
          },
          { cacheId: 'foobar' }
        )
        .then(function (memFn) {
          return memFn(1, 2)
        })
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      const memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar' }
      )
      c = 999
      result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })
  })

  it('should recache the result of a memoized function on second execution if force option is set', async () => {
    const cachePath = FIXTURE_CACHE
    const memoize = memoizeFs({ cachePath })
    let c = 3
    let result = await memoize
      .fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar' }
      )
      .then(function (memFn) {
        return memFn(1, 2)
      })
    assert.strictEqual(result, 6, 'expected result to strictly equal 6')
    const memFn = await memoize.fn(
      function (a: number, b: number) {
        return a + b + c
      },
      { cacheId: 'foobar', force: true }
    )
    c = 4
    result = await memFn(1, 2)
    assert.strictEqual(result, 7, 'expected result to strictly equal 7')
    const files = await readdir(path.join(cachePath, 'foobar'))
    assert.strictEqual(
      files.length,
      1,
      'expected exactly one file in cache with id foobar'
    )
  })

  describe('noBody', () => {
    it('caches the result of a memoized function on second execution with option noBody set to true with different function names', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let c = 3
      let memFn = await memoize.fn(
        function foo(a: number, b: number) {
          return a + b + c
        },
        {
          cacheId: 'foobar',
          salt: 'qux',
          noBody: true,
        }
      )
      let result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      memFn = await memoize.fn(
        function bar(a: number, b: number) {
          return a + b + c
        },
        {
          cacheId: 'foobar',
          salt: 'qux',
          noBody: true,
        }
      )
      c = 999
      result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('does not cache the result of a memoized function on second execution with option noBody not set with different function names', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let c = 3
      let memFn = await memoize.fn(
        function foo(a: number, b: number) {
          return a + b + c
        },
        {
          cacheId: 'foobar',
          salt: 'qux',
        }
      )
      let result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      memFn = await memoize.fn(
        function bar(a: number, b: number) {
          return a + b + c
        },
        {
          cacheId: 'foobar',
          salt: 'qux',
        }
      )
      c = 999
      result = await memFn(1, 2)
      assert.strictEqual(result, 1002, 'expected result to strictly equal 1002')
      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        2,
        'expected exactly two files in cache with id foobar'
      )
    })
  })

  describe('astBody', () => {
    it('should cache the result of a memoized function on second execution with option astBody set to true with equivalent function ASTs', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let memFn = await memoize.fn(
        function foo() {
          // double quoted
          return 'string' // eslint-disable-line quotes
        },
        {
          cacheId: 'foobar',
          salt: 'qux',
          astBody: true,
        }
      )
      let result = await memFn()
      assert.strictEqual(
        result,
        'string',
        'expected result to strictly equal "string"'
      )
      memFn = await memoize.fn(
        function foo() {
          // single quoted
          return 'string'
        },
        {
          cacheId: 'foobar',
          salt: 'qux',
          astBody: true,
        }
      )
      result = await memFn()
      assert.strictEqual(
        result,
        'string',
        'expected result to strictly equal "string"'
      )
      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('should work with ES2020 async keyword', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let c = 0

      const memFn = await memoize.fn(async (a: number) => {
        c++
        return a
      })

      let result = await memFn(1)
      assert.strictEqual(result, 1, 'should be 1')
      assert.strictEqual(c, 1, 'should be 1')

      result = await memFn(1)
      assert.strictEqual(result, 1, 'should be memoized 1')
      assert.strictEqual(c, 1, 'should still be 1')

      result = await memFn(2)
      assert.strictEqual(result, 2, 'should be 2')
      assert.strictEqual(c, 2, 'should be 2')
    })
  })

  describe('getCacheFilePath', () => {
    it('returns a path', async () => {
      const actual = getCacheFilePath(function () {}, [], {
        cacheId: './',
        cachePath: '/',
      })
      const expected = '/b5d63bae8e80bd56f9317d1e3c969915'
      assert.strictEqual(actual, expected)
    })

    it('is available on memoizer', async () => {
      const cachePath = '/'
      const actual = memoizeFs({ cachePath }).getCacheFilePath(
        function () {},
        [],
        {
          cacheId: './',
        }
      )
      const expected = '/b3e831410f20372483b78b2a4dd28c4c'
      assert.strictEqual(actual, expected)
    })
  })

  describe('invalidate cache', () => {
    it('recaches the result of a memoized function after invalidating the cache before the second execution', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let c = 3
      let memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar' }
      )
      let result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      await memoize.invalidate('foobar')
      c = 4
      memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar' }
      )
      result = await memFn(1, 2)
      assert.strictEqual(result, 7, 'expected result to strictly equal 7')
      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('recaches the result of a memoized function after invalidating the root cache by not providing a cache id before the second execution', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let c = 3
      let memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar' }
      )
      let result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      await memoize.invalidate()
      c = 4
      memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar' }
      )
      result = await memFn(1, 2)
      assert.strictEqual(result, 7, 'expected result to strictly equal 7')
      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('invalidates cache after timeout with maxAge option set', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let c = 3
      let memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar', maxAge: 10 }
      )
      let result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      c = 3
      memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar' }
      )
      result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 7')
      await new Promise(function (resolve) {
        setTimeout(resolve, 20)
      })
      c = 4
      memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar' }
      )
      result = await memFn(1, 2)
      assert.strictEqual(result, 7, 'expected result to strictly equal 7')
      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })

    it('does not throw if it fails to invalidate cache after timeout with maxAge option set, because already invalidated manually', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let c = 3
      let memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar', maxAge: 10 }
      )
      let result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 6')
      await memoize.invalidate('foobar')
      new Promise(function (resolve) {
        setTimeout(resolve, 20)
      })
      c = 3
      memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar' }
      )
      result = await memFn(1, 2)
      assert.strictEqual(result, 6, 'expected result to strictly equal 7')
      await new Promise(function (resolve) {
        setTimeout(resolve, 20)
      })
      c = 4
      memFn = await memoize.fn(
        function (a: number, b: number) {
          return a + b + c
        },
        { cacheId: 'foobar' }
      )
      result = await memFn(1, 2)
      assert.strictEqual(result, 7, 'expected result to strictly equal 7')
      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )
    })
  })

  describe('retryOnInvalidCache', () => {
    it('retries when the cache file is invalid', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })

      let timesCalled = 0
      const fnToMemo = function (a: number, b: number) {
        timesCalled++
        return a + b
      }

      const args = [1, 2]
      const options = { cacheId: 'foobar', retryOnInvalidCache: true }
      let memFn = await memoize.fn(fnToMemo, options)
      await memFn(args[0], args[1])
      const cacheFilePath = memoize.getCacheFilePath(fnToMemo, args, options)
      await writeFile(cacheFilePath, '}{') // write some invalid JSON
      memFn = await memoize.fn(fnToMemo, options)
      await memFn(args[0], args[1])
      assert.equal(timesCalled, 2)
    })
  })

  describe('errors', () => {
    it('throws when trying to invalidate cache with an invalid cache id', async () => {
      const cachePath = path.join(__dirname, '../README.md')
      const memoize = memoizeFs({ cachePath })
      let throws = false
      try {
        await memoize.invalidate(true as unknown as string)
      } catch (err) {
        throws = true
      }
      assert.ok(throws)
    })

    it('throws when trying to memoize a function with an invalid combination of cache path and cache id', async () => {
      const cachePath = path.join(__dirname, '..')
      const memoize = memoizeFs({ cachePath })
      let throws = false
      try {
        await memoize.fn(function () {}, { cacheId: 'README.md' })
      } catch (err) {
        throws = true
      }
      assert.ok(throws)
    })

    it('does NOT throw if cache dir exists and opts.throwError is `false`', async () => {
      const cachePath = path.join(__dirname, '..')
      const memoize = memoizeFs({ cachePath, throwError: false })
      let throws = false
      try {
        await memoize.fn(function () {}, { cacheId: 'README.md' })
      } catch (err) {
        throws = true
      }
      assert.isFalse(throws)
    })

    it('should throw an error when trying to write cache on a file without having the necessary permission', async () => {
      const cachePath = FIXTURE_CACHE
      const memoize = memoizeFs({ cachePath })
      let memFn = await memoize.fn(
        function () {
          return 1
        },
        { cacheId: 'foobar' }
      )
      await memFn()

      const files = await readdir(path.join(cachePath, 'foobar'))
      assert.strictEqual(
        files.length,
        1,
        'expected exactly one file in cache with id foobar'
      )

      await chmod(path.join(cachePath, 'foobar', files[0]), 0)
      memFn = await memoize.fn(
        function () {
          return 1
        },
        {
          cacheId: 'foobar',
          force: true,
        }
      )

      let throws = false
      try {
        await memFn()
      } catch (err) {
        throws = true
      }
      assert.ok(throws)
    })
  })
})
