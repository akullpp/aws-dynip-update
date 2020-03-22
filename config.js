const set = require('lodash.set')
const fs = require('fs')
const yaml = require('js-yaml')

const CONFIG_PATH = `${require('os').homedir()}/.aws_ip.yml`

const get = (program, ip) => {
  const config = parse()
  return withArgs(program, config, ip)
}

// Read config from file.
const parse = () => {
  try {
    const configFile = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const parsedConfig = yaml.safeLoad(configFile)
    return parsedConfig
  } catch (err) {
    console.info(
      `Could not parse the config file, creating a new one.\n${err}\n`,
    )
    return {}
  }
}

const withArgs = (program, config, ip) => {
  // If there is secgroup or region set, the other has to present too.
  const { region, secgroup } = program

  if ((!region && secgroup) || (region && !secgroup)) {
    throw new Error(
      'Region and security group argument are both required, exiting...',
    )
  }

  // Empty config
  if (!Object.keys(config).length) {
    if (!region || !secgroup) {
      throw new Error(
        'Empty configuration and no region and security group provided, exiting...',
      )
    }
  }

  if (!region && !secgroup) {
    return config
  }
  return set(config, `${region}.${secgroup}`, ip)
}

const save = config => fs.writeFileSync(CONFIG_PATH, yaml.safeDump(config))

module.exports = {
  get,
  save,
}
