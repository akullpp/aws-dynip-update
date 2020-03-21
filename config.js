const set = require('lodash.set')
const fs = require('fs')
const yaml = require('js-yaml')

const CONFIG_PATH = `${require('os').homedir()}/.aws_ip.yml`

const get = program => {
  const config = parse()
  return withArgs(program, config)
}

// Read config from file.
const parse = () => {
  try {
    const configFile = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const parsedConfig = yaml.safeLoad(configFile)
    return parsedConfig
  } catch (err) {
    console.error(
      `Error parsing the config file could not be found, creating a new one.\n${err}`,
    )
    return {}
  }
}

const withArgs = (program, config) => {
  // If there is secgroup or region set, the other has to present too.
  if (
    (!program.region && program.secgroup) ||
    (program.region && !program.secgroup)
  ) {
    throw new Error(
      'Region and security group argument are both required, exiting...',
    )
  }

  // Empty config
  if (!Object.keys(config).length) {
    // Set region from args.
    if (!program.region) {
      throw new Error('Empty configuration and no region provided, exiting...')
    }
    // Set secgroup from args.
    if (!program.secgroup) {
      throw new Error(
        'Empty configuration and no security group provided, exiting...',
      )
    }
  }

  if (!program.region && !program.secgroup) {
    return config
  }
  return set(config, `${program.region}.${program.secgroup}`, null)
}

const save = async config => fs.writeFile(CONFIG_PATH, yaml.safeDump(config))

module.exports = {
  get,
  save,
}
