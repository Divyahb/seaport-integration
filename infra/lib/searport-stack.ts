import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

export class SearportStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "SearportVpc", {
      maxAzs: 2,
      natGateways: 1
    });

    const lambdaSecurityGroup = new ec2.SecurityGroup(this, "EtlLambdaSecurityGroup", {
      vpc,
      allowAllOutbound: true,
      description: "Security group for the searport ETL lambda"
    });

    const databaseSecurityGroup = new ec2.SecurityGroup(this, "PostgresSecurityGroup", {
      vpc,
      allowAllOutbound: true,
      description: "Security group for the searport PostgreSQL database"
    });

    databaseSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow ETL Lambda to connect to PostgreSQL"
    );

    const database = new rds.DatabaseInstance(this, "SearportPostgres", {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [databaseSecurityGroup],
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4
      }),
      credentials: rds.Credentials.fromGeneratedSecret("searport"),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      multiAz: false,
      databaseName: "searport",
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const etlLambda = new lambda.Function(this, "SearportEtlLambda", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("../etl/dist"),
      timeout: cdk.Duration.minutes(1),
      memorySize: 512,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        NODE_ENV: "production",
        DATABASE_URL_SECRET_ARN: database.secret?.secretArn ?? "",
        DATABASE_HOST: database.instanceEndpoint.hostname,
        DATABASE_PORT: database.instanceEndpoint.port.toString(),
        DATABASE_NAME: "searport"
      }
    });

    if (database.secret) {
      database.secret.grantRead(etlLambda);
    }

    etlLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
        resources: ["*"]
      })
    );

    new cdk.CfnOutput(this, "PostgresEndpoint", {
      value: database.instanceEndpoint.hostname
    });

    new cdk.CfnOutput(this, "PostgresSecretArn", {
      value: database.secret?.secretArn ?? ""
    });

    new cdk.CfnOutput(this, "EtlLambdaName", {
      value: etlLambda.functionName
    });
  }
}
