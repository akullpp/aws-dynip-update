const test = require('ava')
const mockFs = require('mock-fs')

const config = require('./config')

test.after.always('cleanup', () => {
  mockFs.restore()
})

test('should return new object if config could not be read', t => {
  mockFs({})

  const result = config.get({ region: 'foo', secgroup: 'bar' })

  t.deepEqual(result, { foo: { bar: null } })
})

test('should be able to load existing config', t => {
  const configPath = `${require('os').homedir()}/.aws_ip.yml`
  mockFs({
    [configPath]: `
      eu1:
        sg1: 1
        sg2: 2
      eu2:
        sg3: 3
        sg4: 4
    `,
  })

  const result = config.get({})

  t.deepEqual(result, {
    eu1: { sg1: 1, sg2: 2 },
    eu2: { sg3: 3, sg4: 4 },
  })
})

test('should be able to extend existing config with new data', t => {
  const configPath = `${require('os').homedir()}/.aws_ip.yml`
  mockFs({
    [configPath]: `
      eu1:
        sg1: 1
        sg2: 2
      eu2:
        sg3: 3
        sg4: 4
    `,
  })

  const result = config.get({ region: 'eu1', secgroup: 'sg5' })

  t.deepEqual(result, {
    eu1: { sg1: 1, sg2: 2, sg5: null },
    eu2: { sg3: 3, sg4: 4 },
  })
})

test('should throw error if region is provided but secgroup is not', t => {
  const configPath = `${require('os').homedir()}/.aws_ip.yml`
  mockFs({
    [configPath]: `
      eu1:
        sg1: 1
        sg2: 2
      eu2:
        sg3: 3
        sg4: 4
    `,
  })

  const error = t.throws(() => config.get({ region: 'eu1' }))

  t.is(
    error.message,
    'Region and security group argument are both required, exiting...',
  )
})

test('should throw error if secgroup is provided but region is not', t => {
  const configPath = `${require('os').homedir()}/.aws_ip.yml`
  mockFs({
    [configPath]: `
      eu1:
        sg1: 1
        sg2: 2
      eu2:
        sg3: 3
        sg4: 4
    `,
  })

  const error = t.throws(() => config.get({ secgroup: 'sg5' }))

  t.is(
    error.message,
    'Region and security group argument are both required, exiting...',
  )
})

test('should throw error if there is no config and parameters have not been provided', t => {
  mockFs({})

  const error = t.throws(() => config.get({}))

  t.is(
    error.message,
    'Empty configuration and no region and security group provided, exiting...',
  )
})
