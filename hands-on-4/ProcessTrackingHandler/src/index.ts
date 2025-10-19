import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Handler, Context, SQSEvent, SQSBatchResponse } from "aws-lambda";

type ShipmentEvent = {
  eventType:
    | "PROCESSING"
    | "SHIPPED"
    | "CUSTOMS"
    | "LAST_MILE"
    | "DELIVERED"
    | "CANCELLED";
  eventCode: string;
  eventAt: string; // ISO datetime
};

type Shipment = {
  shipmentId: string;
  status: string;
  createdAt: string;
  lastUpdatedAt: string;
  destinationCountry: string | null;
  orderId: string | null;
  events?: ShipmentEvent[];
};

type TrackingMessage = {
  shipmentId: string;
  event: ShipmentEvent;
};

type TrackingBatchMessage = {
  shipmentId: string;
  events: ShipmentEvent[];
};

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

export const handler: Handler<SQSEvent, SQSBatchResponse> = async (
  event: SQSEvent,
  _context: Context
): Promise<SQSBatchResponse> => {
  console.log(
    "Processing batch of",
    event.Records.length,
    "messages: ",
    JSON.stringify(event, null, 2)
  );

  const bucketName = process.env.SHIPMENTS_BUCKET_NAME;
  if (!bucketName) {
    console.error("Missing env var SHIPMENTS_BUCKET_NAME");
    // Fail entire batch; DLQ or redrive policy should catch
    return {
      batchItemFailures: event.Records.map((r) => ({
        itemIdentifier: r.messageId,
      })),
    };
  }

  const failures: { itemIdentifier: string }[] = [];

  // Group by shipmentId to aggregate events and write once per shipment
  const shipmentIdToEvents: Record<string, ShipmentEvent[]> = {};
  const shipmentIdToMessageIds: Record<string, string[]> = {};

  // First pass: parse and group messages (support batch payload with events[])
  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body) as
        | TrackingBatchMessage
        | TrackingMessage;
      const shipmentId = (body as TrackingBatchMessage).shipmentId;
      if (!shipmentId) throw new Error("Missing shipmentId");

      let incomingEvents: ShipmentEvent[] = [];
      if ((body as TrackingBatchMessage).events) {
        incomingEvents = (body as TrackingBatchMessage).events || [];
      } else if ((body as TrackingMessage).event) {
        incomingEvents = [(body as TrackingMessage).event];
      }
      if (incomingEvents.length === 0) throw new Error("No events provided");
      if (!shipmentIdToEvents[shipmentId]) {
        shipmentIdToEvents[shipmentId] = [];
        shipmentIdToMessageIds[shipmentId] = [];
      }
      for (const ev of incomingEvents) {
        if (!ev?.eventAt) throw new Error("event.eventAt is required");
        shipmentIdToEvents[shipmentId].push(ev);
      }
      shipmentIdToMessageIds[shipmentId].push(record.messageId);
    } catch (err) {
      console.error("Failed to parse record", {
        messageId: record.messageId,
        err,
      });
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  console.log("Shipment events: ", JSON.stringify(shipmentIdToEvents, null, 2));

  // Second pass: for each shipment, fetch once, merge all events, sort and write once
  const shipmentIds = Object.keys(shipmentIdToEvents);
  await Promise.all(
    shipmentIds.map(async (shipmentId) => {
      try {
        const getRes = await s3Client.send(
          new GetObjectCommand({ Bucket: bucketName, Key: shipmentId })
        );
        const existing = await getRes.Body?.transformToString("utf-8");
        if (!existing) throw new Error("Empty shipment content");

        const shipment = JSON.parse(existing) as Shipment;

        const mergedEvents = [
          ...(shipment.events || []),
          ...shipmentIdToEvents[shipmentId],
        ].sort(
          (a, b) =>
            new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime()
        );
        const lastEvent = mergedEvents[mergedEvents.length - 1];

        const updated: Shipment = {
          ...shipment,
          events: mergedEvents,
          lastUpdatedAt: new Date().toISOString(),
          status: lastEvent?.eventType || shipment.status,
        };

        console.log(
          "Persisting shipment",
          shipmentId,
          "with events: ",
          JSON.stringify(updated, null, 2)
        );

        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: shipmentId,
            Body: JSON.stringify(updated),
            ContentType: "application/json",
          })
        );
      } catch (err) {
        console.error("Failed to persist shipment", { shipmentId, err });
        // Mark all messages for this shipment as failed
        for (const messageId of shipmentIdToMessageIds[shipmentId] || []) {
          failures.push({ itemIdentifier: messageId });
        }
      }
    })
  );

  return { batchItemFailures: failures };
};
