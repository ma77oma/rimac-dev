import { SQSHandler } from "aws-lambda";
import { RepositoryFactory } from "../infrastructure/factories/RepositoryFactory";


const repository = RepositoryFactory.create();

export const handler: SQSHandler = async (event) => {
  const records = event.Records ?? [];

  console.log("[CONFIRM] start", { records: records.length });

  for (const rec of event.Records) {
    console.log("[CONFIRM] raw record body:", rec.body);

    const body = JSON.parse(rec.body);

    console.log("[CONFIRM] raw  body:", body);

    const detail = body?.detail || {};
    const id = detail.appointmentId;

    if (!id) {
      console.warn("[CONFIRM] record without appointmentId, skipping");
      continue;
    }

    console.log("[CONFIRM] markCompleted:before", { appointmentId: id });
    await repository.markCompleted(id);
    console.log("[CONFIRM] markCompleted:ok", { appointmentId: id });
  }

  console.log("[CONFIRM] end");
};
