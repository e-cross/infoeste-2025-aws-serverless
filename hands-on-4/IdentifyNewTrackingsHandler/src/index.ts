import { Handler, Context } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

type ShipmentEventType =
  | "SHIPPED"
  | "CUSTOMS"
  | "LAST_MILE"
  | "DELIVERED"
  | "CANCELLED";

type ShipmentEvent = {
  eventType: ShipmentEventType;
  eventCode: string;
  eventAt: string; // ISO future datetime
};

type Scenario =
  | "COLLECTED_ONLY"
  | "TO_DESTINATION"
  | "AWAITING_TAX"
  | "LAST_MILE_IN_PROGRESS"
  | "DELIVERED"
  | "PROHIBITED";

type LookupInput = {
  shipmentId?: string;
};

type TrackingBatchMessage = {
  shipmentId: string;
  events: ShipmentEvent[];
};

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "us-east-1",
});

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

function futureBetween(start: Date, minHours: number, maxHours: number): Date {
  const delta =
    Math.floor(Math.random() * (maxHours - minHours + 1)) + minHours;
  return addHours(start, delta);
}

function buildScenarioEvents(now: Date, scenario: Scenario): ShipmentEvent[] {
  // Base timeline starts in the near future to ensure all events are in the future
  let t = addHours(now, 1);
  const push = (
    eventType: ShipmentEventType,
    eventCode: string,
    minH: number,
    maxH: number
  ) => {
    t = futureBetween(t, minH, maxH);
    events.push({ eventType, eventCode, eventAt: t.toISOString() });
  };

  const events: ShipmentEvent[] = [];

  switch (scenario) {
    case "COLLECTED_ONLY": {
      push("SHIPPED", "COLLECTED", 1, 3);
      break;
    }
    case "TO_DESTINATION": {
      push("SHIPPED", "COLLECTED", 1, 3);
      push("SHIPPED", "PREPARING_FLIGHT", 2, 8);
      push("SHIPPED", "IN_FLIGHT", 6, 24);
      push("SHIPPED", "ARRIVED_DESTINATION_COUNTRY", 24, 48);
      break;
    }
    case "AWAITING_TAX": {
      push("SHIPPED", "COLLECTED", 1, 3);
      push("SHIPPED", "PREPARING_FLIGHT", 2, 8);
      push("SHIPPED", "IN_FLIGHT", 6, 24);
      push("SHIPPED", "ARRIVED_DESTINATION_COUNTRY", 24, 48);
      push("CUSTOMS", "AWAITING_TAX_PAYMENT", 6, 24);
      break;
    }
    case "LAST_MILE_IN_PROGRESS": {
      push("SHIPPED", "COLLECTED", 1, 3);
      push("SHIPPED", "PREPARING_FLIGHT", 2, 8);
      push("SHIPPED", "IN_FLIGHT", 6, 24);
      push("SHIPPED", "ARRIVED_DESTINATION_COUNTRY", 24, 48);
      push("CUSTOMS", "AWAITING_TAX_PAYMENT", 6, 24);
      push("CUSTOMS", "NATIONALIZED", 6, 24);
      push("LAST_MILE", "IN_TRANSIT", 2, 12);
      push("LAST_MILE", "AT_SORTING_HUB", 2, 12);
      break;
    }
    case "DELIVERED": {
      push("SHIPPED", "COLLECTED", 1, 3);
      push("SHIPPED", "PREPARING_FLIGHT", 2, 8);
      push("SHIPPED", "IN_FLIGHT", 6, 24);
      push("SHIPPED", "ARRIVED_DESTINATION_COUNTRY", 24, 48);
      push("CUSTOMS", "AWAITING_TAX_PAYMENT", 6, 24);
      push("CUSTOMS", "NATIONALIZED", 6, 24);
      push("LAST_MILE", "IN_TRANSIT", 2, 12);
      push("LAST_MILE", "AT_SORTING_HUB", 2, 12);
      push("LAST_MILE", "OUT_FOR_DELIVERY", 2, 8);
      push("DELIVERED", "DELIVERED", 2, 8);
      break;
    }
    case "PROHIBITED": {
      push("SHIPPED", "COLLECTED", 1, 3);
      push("SHIPPED", "PREPARING_FLIGHT", 2, 8);
      push("SHIPPED", "IN_FLIGHT", 6, 24);
      push("SHIPPED", "ARRIVED_DESTINATION_COUNTRY", 24, 48);
      push("CANCELLED", "PROHIBTED", 2, 8);
      break;
    }
    default:
      // fallback should not occur due to typing; still return at least COLLECTED
      push("SHIPPED", "COLLECTED", 1, 3);
  }

  // ensure ascending by time (already constructed in order, but sort just in case)
  return events.sort(
    (a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime()
  );
}

export const handler: Handler<
  LookupInput,
  { shipmentId: string; scenario: Scenario; enqueuedEvents: number }
> = async (
  lambdaInput: LookupInput,
  _context: Context
): Promise<{
  shipmentId: string;
  scenario: Scenario;
  enqueuedEvents: number;
}> => {
  const queueUrl = process.env.TRACKINGS_QUEUE_URL;
  if (!queueUrl) {
    throw new Error("TRACKINGS_QUEUE_URL not configured");
  }

  const shipmentId = lambdaInput.shipmentId;
  if (!shipmentId) {
    throw new Error("shipmentId is required");
  }

  const allScenarios: Scenario[] = [
    "COLLECTED_ONLY",
    "TO_DESTINATION",
    "AWAITING_TAX",
    "LAST_MILE_IN_PROGRESS",
    "DELIVERED",
    "PROHIBITED",
  ];
  const scenario: Scenario =
    allScenarios[Math.floor(Math.random() * allScenarios.length)];

  const now = new Date();
  const events = buildScenarioEvents(now, scenario);

  const payload: TrackingBatchMessage = { shipmentId, events };
  console.log(
    "Sending batch of",
    events.length,
    "events to SQS: ",
    JSON.stringify(payload, null, 2)
  );
  const cmd = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(payload),
  });
  await sqsClient.send(cmd);

  return {
    shipmentId,
    scenario,
    enqueuedEvents: events.length,
  };
};
