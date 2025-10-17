import {
  Handler,
  Context,
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { randomUUID } from "crypto";

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

export const handler: Handler<
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2
> = async (
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  console.log("Event: ", event);

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

  // Return API Gateway HTTP API response
  return {
    statusCode: 201,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(shipment),
  };
};
