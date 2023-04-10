async function test(name, fn) {
  try {
    await fn(await import('node:assert/strict'))
    console.log(`✓ ${name}`)
  } catch (err) {
    console.error(`✗ ${name}`)
    throw err
  }
}

async function run(json, code = '') {
  const {spawnSync} = await import('node:child_process')
  return spawnSync(`echo '${JSON.stringify(json)}' | node index.js ${code}`, {
    stdio: 'pipe',
    encoding: 'utf8',
    shell: true
  })
}

void async function main() {
  await test('passes json as is', async t => {
    const {stdout} = await run([{'greeting': 'hello world'}])
    t.deepEqual(JSON.parse(stdout), [{'greeting': 'hello world'}])
  })

  await test('works with anon func', async t => {
    const {stdout} = await run({'key': 'value'}, '\'function (x) { return x.key }\'')
    t.equal(stdout, 'value\n')
  })

  await test('works with arrow func', async t => {
    const {stdout} = await run({'key': 'value'}, '\'x => x.key\'')
    t.equal(stdout, 'value\n')
  })

  await test('works with arrow func with param brackets', async t => {
    const {stdout} = await run({'key': 'value'}, `'(x) => x.key'`)
    t.equal(stdout, 'value\n')
  })

  await test('this is json', async t => {
    const {stdout} = await run([1, 2, 3, 4, 5], `'this.map(x => x * this.length)'`)
    t.deepEqual(JSON.parse(stdout), [5, 10, 15, 20, 25])
  })

  await test('args chain works', async t => {
    const {stdout} = await run({'items': ['foo', 'bar']}, `'this.items' '.' 'x => x[1]'`)
    t.equal(stdout, 'bar\n')
  })

  await test('map works', async t => {
    const {stdout} = await run([1, 2, 3], `'map(x * 2)'`)
    t.deepEqual(JSON.parse(stdout), [2, 4, 6])
  })

  await test('map works with dot', async t => {
    const {stdout} = await run([{foo: 'bar'}], `'map(.foo)'`)
    t.deepEqual(JSON.parse(stdout), ['bar'])
  })

  await test('map works with func', async t => {
    const {stdout} = await run([{foo: 'bar'}], `'map(x => x.foo)'`)
    t.deepEqual(JSON.parse(stdout), ['bar'])
  })

  await test('flat map works', async t => {
    const {stdout} = await run({master: {foo: [{bar: [{val: 1}]}]}}, '.master.foo[].bar[].val')
    t.deepEqual(JSON.parse(stdout), [1])
  })

  await test('flat map works on the first level', async t => {
    const {stdout} = await run([{val: 1}, {val: 2}], '.[].val')
    t.deepEqual(JSON.parse(stdout), [1, 2])
  })

  await test('sort & uniq', async t => {
    const {stdout} = await run([2, 2, 3, 1], `sort uniq`)
    t.deepEqual(JSON.parse(stdout), [1, 2, 3])
  })

  await test('invalid code argument', async t => {
    const json = {foo: 'bar'}
    const code = '".foo.toUpperCase("'
    const {stderr, status} = await run(json, code)
    t.equal(status, 1)
    t.ok(stderr.includes(`SyntaxError: Unexpected token '}'`))
  })
}()
