import { SQSHandler } from "aws-lambda";
import { DynamoAppointmentRepository } from "../infrastructure/dynamo/DynamoAppointmentRepository";

const repo = new DynamoAppointmentRepository();

export const handler: SQSHandler = async (event) => {
  console.log("[CONFIRM] start", { records: event.Records.length });

  for (const rec of event.Records) {
    console.log("[CONFIRM] raw record body:", rec.body);

    const body = JSON.parse(rec.body);
    const detail = body?.detail || {};
    const id = detail.appointmentId;

    if (!id) {
      console.warn("[CONFIRM] record without appointmentId, skipping");
      continue;
    }

    console.log("[CONFIRM] markCompleted:before", { appointmentId: id });
    await repo.markCompleted(id);
    console.log("[CONFIRM] markCompleted:ok", { appointmentId: id });
  }

  console.log("[CONFIRM] end");
};