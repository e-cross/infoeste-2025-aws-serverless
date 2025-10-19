import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";

export class InfoesteServerlessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket
    const shipmentsBucket = new s3.Bucket(this, "ShipmentsBucket", {
      bucketName: `infoeste-2025-aws-serverless-${this.account}`,
      blockPublicAccess: new s3.BlockPublicAccess({ blockPublicPolicy: false }),
      publicReadAccess: true,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    shipmentsBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowPublicRead",
        actions: ["s3:GetObject"],
        resources: [shipmentsBucket.arnForObjects("*")],
        principals: [new iam.AnyPrincipal()],
        effect: iam.Effect.ALLOW,
      })
    );

    // SQS queue
    const shipmentEventsQueue = new sqs.Queue(this, "ShipmentEventsSQS", {
      queueName: "ShipmentEventsSQS",
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(4),
    });

    // Lambda functions
    const createShipmentFn = new lambda.Function(
      this,
      "CreateShipmentApiHandlerFn",
      {
        functionName: "CreateShipmentApiHandler",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "dist/index.handler",
        code: lambda.Code.fromAsset(
          "../hands-on-3/CreateShipmentApiHandler/bundle.zip"
        ),
        memorySize: 128,
        timeout: cdk.Duration.seconds(10),
        environment: {
          SHIPMENTS_BUCKET_NAME: shipmentsBucket.bucketName,
        },
      }
    );
    const identifyFn = new lambda.Function(
      this,
      "IdentifyNewTrackingsHandlerFn",
      {
        functionName: "IdentifyNewTrackingsHandler",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "dist/index.handler",
        code: lambda.Code.fromAsset(
          "../hands-on-4/IdentifyNewTrackingsHandler/bundle.zip"
        ),
        memorySize: 128,
        timeout: cdk.Duration.seconds(10),
        environment: {
          TRACKINGS_QUEUE_URL: shipmentEventsQueue.queueUrl,
        },
      }
    );
    const processFn = new lambda.Function(this, "ProcessTrackingHandlerFn", {
      functionName: "ProcessTrackingHandler",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "dist/index.handler",
      code: lambda.Code.fromAsset(
        "../hands-on-4/ProcessTrackingHandler/bundle.zip"
      ),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        SHIPMENTS_BUCKET_NAME: shipmentsBucket.bucketName,
      },
    });

    // API Gateway
    const httpApi = new apigwv2.HttpApi(this, "ShipmentsHttpApi", {
      apiName: "Shipments API",
    });
    httpApi.addRoutes({
      path: "/shipments",
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        "CreateShipmentIntegration",
        createShipmentFn
      ),
    });

    // S3 permissions
    shipmentsBucket.grantWrite(createShipmentFn); // CreateShipmentApiHandler can add objects to the bucket
    shipmentsBucket.grantReadWrite(processFn); // ProcessTrackingHandler can read and write objects to the bucket

    // SQS permissions
    shipmentEventsQueue.grantSendMessages(identifyFn); // IdentifyNewTrackingsHandler can send messages to the queue
    shipmentEventsQueue.grantConsumeMessages(processFn); // ProcessTrackingHandler can receive messages from the queue

    // Lambda event source (ShipmentEventsSQS -> ProcessTrackingHandler)
    processFn.addEventSource(
      new lambdaEventSources.SqsEventSource(shipmentEventsQueue, {
        batchSize: 10,
        enabled: true,
      })
    );

    // Outputs
    new cdk.CfnOutput(this, "BucketName", {
      value: shipmentsBucket.bucketName,
    });
    new cdk.CfnOutput(this, "HttpApiUrl", { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, "ShipmentEventsQueueUrl", {
      value: shipmentEventsQueue.queueUrl,
    });
  }
}
