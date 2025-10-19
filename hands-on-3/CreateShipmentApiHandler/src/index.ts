import {
  Handler,
  Context,
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

type CreateShipmentInput = {
  destinationCountry: string;
  orderId: string;
};

type Shipment = {
  shipmentId: string;
  status: string;
  createdAt: string;
  lastUpdatedAt: string;
  destinationCountry: string | null;
  orderId: string | null;
};

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type,Authorization,X-Requested-With",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  };
}

// Reuse S3 client across invocations for efficiency
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

export const handler: Handler<
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2
> = async (
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  console.log("Event: ", event);

  // Resolve bucket name from environment variable for flexibility across accounts/students
  const bucketName = process.env.SHIPMENTS_BUCKET_NAME;

  // Ensure environment variable is configured
  if (!bucketName) {
    console.error(
      "Environment variable SHIPMENTS_BUCKET_NAME is not configured."
    );
    return {
      statusCode: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message:
          "Server misconfiguration: SHIPMENTS_BUCKET_NAME env var is required.",
      }),
    };
  }

  // Parse and validate input
  let input: CreateShipmentInput | null = null;
  try {
    console.log("Parsing and validating input");
    input = event.body ? JSON.parse(event.body) : null;
  } catch {
    return {
      statusCode: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Invalid JSON body" }),
    };
  }

  if (!input?.destinationCountry || !input?.orderId) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "destinationCountry and orderId are required",
      }),
    };
  }

  // Start processing date and time
  const now = new Date().toISOString();

  // Generate a new ID for the shipment
  const shipmentId = randomUUID();
  console.log("Shipment ID: ", shipmentId);

  // Create the shipment payload
  const shipment: Shipment = {
    shipmentId,
    status: "CREATED",
    createdAt: now,
    lastUpdatedAt: now,
    destinationCountry: input.destinationCountry,
    orderId: input.orderId,
  };
  console.log("Shipment: ", shipment);

  // Persist shipment to S3 with key equal to shipmentId
  try {
    const body = JSON.stringify(shipment);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: shipmentId,
        Body: body,
        ContentType: "application/json",
      })
    );

    const region = process.env.AWS_REGION || "us-east-1";
    const objectUrl =
      region === "us-east-1"
        ? `https://${bucketName}.s3.amazonaws.com/${encodeURIComponent(
            shipmentId
          )}`
        : `https://${bucketName}.s3.${region}.amazonaws.com/${encodeURIComponent(
            shipmentId
          )}`;
    console.log("S3 object stored at: ", objectUrl);
  } catch (err) {
    console.error("Failed to persist shipment to S3", err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Failed to persist shipment" }),
    };
  }

  // Return API Gateway HTTP API response
  return {
    statusCode: 201,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(shipment),
  };
};
