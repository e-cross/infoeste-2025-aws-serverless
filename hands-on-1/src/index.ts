import { Handler, Context } from "aws-lambda";
import { randomUUID } from "crypto";

type CreateShipmentInput = {
  destinationCountry: string;
  orderId: string;
};

type CreateShipmentResponse = {
  shipmentId: string;
  status: string;
  createdAt: string;
  lastUpdatedAt: string;
  destinationCountry: string | null;
  orderId: string | null;
};

export const handler: Handler<
  CreateShipmentInput,
  CreateShipmentResponse
> = async (
  event: CreateShipmentInput,
  _context: Context
): Promise<CreateShipmentResponse> => {
  // Start processing date and time
  const now = new Date().toISOString();

  // Generate a new ID for the shipment
  const shipmentId = randomUUID();

  // Create the shipment
  const response: CreateShipmentResponse = {
    shipmentId,
    status: "CREATED",
    createdAt: now,
    lastUpdatedAt: now,
    destinationCountry: event?.destinationCountry,
    orderId: event?.orderId,
  };

  // Return the response
  return response;
};
