#!/usr/bin/env node

const AWS = require('aws-sdk')
const axios = require('axios')
const cloneDeep = require('lodash.clonedeep')
const program = require('commander')

const config = require('./config')

const IP_SERVICE = 'http://api.ipify.org'

const getEC2 = region => {
  // Configure AWS
  AWS.config.apiVersions = {
    ec2: '2016-11-15',
  }
  AWS.config.update({
    region,
  })
  return new AWS.EC2()
}

const getNewIp = async () => {
  // Try to resolve IP from service.
  try {
    return await axios.get(IP_SERVICE)
  } catch (err) {
    console.error('Could not retrieve new IP: ', err)
    process.exit(1)
  }
}

const ingress = (ip, secgroup, dry) => ({
  CidrIp: `${ip}/32`,
  DryRun: dry,
  GroupName: secgroup,
  IpProtocol: '-1',
})

const removeOldIp = async (ec2, ingress) => {
  try {
    await ec2.revokeSecurityGroupIngress(ingress).promise()
  } catch (err) {
    throw new Error(
      `\nCould not delete old ingress: ${JSON.stringify(
        ingress,
        null,
        2,
      )}\n${err}`,
    )
    process.exit(1)
  }
}

const addNewIp = async (ec2, ingress) => {
  try {
    await ec2.authorizeSecurityGroupIngress(ingress).promise()
  } catch (err) {
    console.error(
      `\nCould not add new ingress: ${JSON.stringify(
        ingress,
        null,
        2,
      )}\n${err}`,
    )
    process.exit(1)
  }
}

;(async () => {
  // Configure axios to unpack responses.
  axios.interceptors.response.use(response => response.data)

  // CLI args.
  program.option('-r --region <region>', 'AWS region')
  program.option('-s --secgroup <secgroup>', 'Security group name')
  program.option('-d --dry', 'Dry run')
  program.parse(process.argv)

  const cfg = await config.get(program)
  const newCfg = cloneDeep(cfg)
  const newIp = await getNewIp()
  console.log(`New IP: ${newIp}`)

  // For each region...
  Object.keys(cfg).forEach(async region => {
    // ... create a new EC2 instance.
    const ec2 = getEC2(region)

    // For each secgroup in each region...
    Object.keys(cfg[region]).forEach(async secgroup => {
      let oldIp = cfg[region][secgroup]

      // ... remove old IP if found.
      if (oldIp) {
        console.log(`Removing old IP from ${region}/${secgroup}...`)
        try {
          await ec2
            .revokeSecurityGroupIngress(ingress(oldIp, secgroup, program.dry))
            .promise()
        } catch (err) {
          console.error(err)
          process.exit(1)
        }
      } else {
        console.log(
          `No old IP found for ${region}/${secgroup}. Creating new rule...`,
        )
      }
      try {
        await ec2
          .authorizeSecurityGroupIngress(ingress(newIp, secgroup, program.dry))
          .promise()
        newCfg[region][secgroup] = newIp
      } catch (err) {
        console.error(err)
        process.exit(1)
      }
    })
  })
  if (!program.dry) {
    await config.save(newCfg)
  }
})()
