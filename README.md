## aws-dynip-update

Update the IP of an inbound rule of a security group for EC2.

```shell
npx aws-dynip-update [Options]

Options:
  -r --region <region>      AWS region
  -s --secgroup <secgroup>  Security group name
  -i --ip                   IP
  -d --dry                  Dry run
  -f --force                Force update
  -h, --help                output usage information
```

The region and security group name parameters are required for the first tim.

Currently a rule that allows **all trafic** is created, this might change at a later point.

After the initial run, you'll have a configuration in `$HOME/.aws_ip.yml` and don't need to provide the params again if they didn't change.
