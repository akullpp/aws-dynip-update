#!/usr/bin/env node

const fs = require('fs').promises
const inquirer = require('inquirer')
const program = require('commander')
const yaml = require('js-yaml')
const AWS = require('aws-sdk')
const axios = require('axios')

const CONFIG_PATH = `${require('os').homedir()}/.aws_ip.yml`
const IP_SERVICE = 'http://api.ipify.org'

const parseConfig = async () => {
  try {
    const configFile = await fs.readFile(CONFIG_PATH, 'utf-8')
    return yaml.safeLoad(configFile)
  } catch (_) {
    console.log('Config file could not be found, creating a new one.')
    return {}
  }
}

const getNewIp = async config => {
  // Provided IP manually.
  if (program.ip) {
    return program.ip
  }
  // Try to resolve IP from service.
  try {
    return await axios.get(IP_SERVICE)
  } catch (err) {
    console.error('Could not retrieve new IP: ', err)
    process.exit(1)
  }
}

const getOldIp = async config => {
  if (config.ip) {
    return config.ip
  }
  console.log(
    '\nCould not find an old IP address to clean up.\nWould you like to provide an existing IP address?\n',
  )
  let { customIpOld } = await inquirer.prompt([
    {
      type: 'input',
      name: 'customIpOld',
      message: 'Existing IP (optional): ',
    },
  ])
  return customIpOld
}

const removeOldIp = async (ip_old, secgroup, ec2) => {
  const ingress = {
    CidrIp: `${ip_old}/32`,
    DryRun: program.dry,
    GroupName: secgroup,
    IpProtocol: '-1',
  }

  try {
    await ec2.revokeSecurityGroupIngress(ingress).promise()
  } catch (err) {
    console.error(
      `\nCould not delete old ingress: ${JSON.stringify(ingress, null, 2)}`,
    )
    process.exit(1)
  }
}

const getConfig = async () => {
  // Parse CLI args.
  program.option('-r --region <region>', 'AWS region')
  program.option('-s --secgroup <secgroup>', 'Security group name')
  program.option('-i --ip', 'IP')
  program.option('-d --dry', 'Dry run')
  program.option('-f --force', 'Force update')
  program.parse(process.argv)

  // Parse YML configuration.
  const config = await parseConfig()

  // Overwrite with manual region.
  if (program.region) {
    config.region = program.region
  }
  // Overwrite with manual security group name.
  if (program.secgroup) {
    config.secgroup = program.secgroup
  }
  // No manual or saved region found.
  if (!config.region) {
    console.error('No region specified, aborting...')
    process.exit(1)
  }
  // No manual or saved security group name found.
  if (!config.secgroup) {
    console.error('No security group name specified, aborting...')
    process.exit(1)
  }
  return config
}

const getEC2 = config => {
  // Configure AWS
  AWS.config.apiVersions = {
    ec2: '2016-11-15',
  }
  AWS.config.update({
    region: config.region,
  })
  return new AWS.EC2()
}

const addNewIp = async (ip_new, secgroup, ec2) => {
  const ingress = {
    CidrIp: `${ip_new}/32`,
    DryRun: program.dry,
    GroupName: secgroup,
    IpProtocol: '-1',
  }

  try {
    await ec2.authorizeSecurityGroupIngress(ingress).promise()
    console.log(`\nAdded new ingress: ${JSON.stringify(ingress, null, 2)}`)
  } catch (err) {
    console.error(
      `\nCould not add new ingress: ${JSON.stringify(
        ingress,
        null,
        2,
      )}: ${err}`,
    )
    process.exit(1)
  }
}

const saveConfig = async config =>
  fs.writeFile(CONFIG_PATH, yaml.safeDump(config))

;(async () => {
  // Configure axios to unpack responses.
  axios.interceptors.response.use(response => response.data)

  const config = await getConfig()
  const ec2 = getEC2(config)
  const newIp = await getNewIp(config)
  console.log(`New IP: ${newIp}`)
  const oldIp = await getOldIp(config)

  if (!program.force && newIp === oldIp) {
    console.log('IP has not changed, aborting.')
    process.exit(0)
  }
  if (oldIp) {
    console.log(`\nOld IP: ${oldIp}\n`)
    await removeOldIp(oldIp, config.secgroup, ec2)
  }
  await addNewIp(newIp, config.secgroup, ec2)
  await saveConfig({ ...config, ip: newIp })
})()
