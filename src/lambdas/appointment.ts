import type { Handler } from "aws-lambda";
import { AppointmentService } from "../application/AppointmentService";
import { DynamoAppointmentRepository } from "../infrastructure/dynamo/DynamoAppointmentRepository";
import { SnsPublisher } from "../infrastructure/sns/SnsPublisher";

const service = new AppointmentService(
  new DynamoAppointmentRepository() as any,
  new SnsPublisher() as any
);

export const handler: Handler = async (event: any) => {
  // HTTP API
  const method = event?.requestContext?.http?.method;
  if (method === "POST") {
    const body = JSON.parse(event.body || "{}");
    const { insuredId, scheduleId, countryISO } = body;
    const res = await service.create(insuredId, Number(scheduleId), countryISO);
    return { statusCode: 202, body: JSON.stringify(res) };
  }
  if (method === "GET") {
    const insuredId = event.pathParameters?.insuredId!;
    const items = await service.list(insuredId);
    return { statusCode: 200, body: JSON.stringify(items) };
  }

  // SQS (confirmaciones)
  if (event?.Records?.[0]?.eventSource === "aws:sqs") {
    for (const rec of event.Records) {
      const msg = JSON.parse(rec.body);
      const detail = JSON.parse(msg?.detail || "{}");
      if (detail?.appointmentId) await service.complete(detail.appointmentId);
    }
    // devolvemos una respuesta “HTTP-like” para contentar al tipo
    return { statusCode: 200, body: "OK" };
  }

  return { statusCode: 400, body: "Unsupported event" };
};
