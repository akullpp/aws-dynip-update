# aws-dynip-update

Update the IP of an inbound rule in security groups.

## Requirements

- Configured `aws` CLI ([docs](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html))
- Nodejs > 12.16.x ([link](https://nodejs.org/en/))

## Usage

```shell
npx aws-dynip-update [Options]

Options:
  -r --region <region>      AWS region
  -s --secgroup <secgroup>  Security group name
  -d --dry                  Dry run
  -h, --help                output usage information
```

The **region** and **security group name** parameters are required for the first time.

After the initial run, you'll have a configuration in `$HOME/.aws_ip.yml` and don't need to provide the params again if they didn't change. Of course you can always add another region/secgroup combination.

## Notes

- Created rule allows **all trafic**
- Created rule doesn't have a description
