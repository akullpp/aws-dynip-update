#!/usr/bin/env node

const AWS = require('aws-sdk')
const axios = require('axios')
const cloneDeep = require('lodash.clonedeep')
const program = require('commander')

const config = require('./config')

const IP_SERVICE = 'http://api.ipify.org'
const EC2_VERSION = '2016-11-15'

const getEC2 = region => {
  // Configure AWS
  AWS.config.apiVersions = {
    ec2: EC2_VERSION,
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
    throw new Error(`Could not retrieve new IP from ${IP_SERVICE}`)
  }
}

const ingress = (ip, secgroup, dry) => ({
  CidrIp: `${ip}/32`,
  DryRun: dry,
  GroupName: secgroup,
  IpProtocol: '-1',
})

;(async () => {
  // Configure axios to unpack responses.
  axios.interceptors.response.use(response => response.data)

  // CLI args.
  program.option('-r --region <region>', 'AWS region')
  program.option('-s --secgroup <secgroup>', 'Security group name')
  program.option('-d --dry', 'Dry run')
  program.parse(process.argv)

  const newIp = await getNewIp()
  console.log(`Current IP: ${newIp}\n`)
  const cfg = config.get(program, newIp)
  const newCfg = cloneDeep(cfg)

  // For each region...
  for (let region of Object.keys(cfg)) {
    // ... create a new EC2 instance.
    const ec2 = getEC2(region)

    // For each secgroup in each region...
    for (let secgroup of Object.keys(cfg[region])) {
      let oldIp = cfg[region][secgroup]

      // ... remove old IP if found.
      if (oldIp) {
        console.log(`Removing ${oldIp} from ${region}/${secgroup}...`)
        try {
          await ec2
            .revokeSecurityGroupIngress(ingress(oldIp, secgroup, program.dry))
            .promise()
        } catch (error) {
          if (error.code === 'DryRunOperation') {
            console.error(error.message)
          }
        }
      } else {
        console.log(
          `No old IP found for ${region}/${secgroup}. Creating new rule...`,
        )
      }
      try {
        console.log(
          `Adding new rule for ${region}/${secgroup} with ${newIp}...`,
        )

        await ec2
          .authorizeSecurityGroupIngress(ingress(newIp, secgroup, program.dry))
          .promise()
      } catch (error) {
        if (error.code === 'DryRunOperation') {
          console.error(error.message)
        } else {
          console.error(`Error: ${error.message}`)
          delete newCfg[region][secgroup]
          if (!Object.keys(newCfg[region]).length) {
            delete newCfg[region]
          }
        }
      }
      if (!program.dry) {
        config.save(newCfg)
      }
      console.log()
    }
  }
})()
