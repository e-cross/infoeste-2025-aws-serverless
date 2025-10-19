#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { InfoesteServerlessStack } from "../lib/infoeste-serverless-stack";

const app = new cdk.App();
new InfoesteServerlessStack(app, "InfoesteServerlessStack", {
  env: {
    // Use default account/region from environment
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-west-2",
  },
});
