const assert = require('assert')
const memoizeFs = require('./index')

const memoizer = memoizeFs({ cachePath: './some-cache' })

console.log(memoizer)
// => {
//   fn: [Function: fn],
//   getCacheFilePath: [Function: getCacheFilePathBound],
//   invalidate: [Function: invalidateCache]
// }

async function main () {
  let idx = 0
  const func = function foo (a, b) {
    idx += a + b
    return idx
  }

  const memoizedFn = await memoizer.fn(func)
  const resultOne = await memoizedFn(1, 2)

  assert.strictEqual(resultOne, 3)
  assert.strictEqual(idx, 3)

  const resultTwo = await memoizedFn(1, 2) // cache hit
  assert.strictEqual(resultTwo, 3)
  assert.strictEqual(idx, 3)
}

main().catch(console.error)
