import { SQSHandler } from "aws-lambda";
import { MySqlAppointmentRepository } from "../infrastructure/mysql/MySqlAppointmentRepository";
import { EventPublisherFactory } from "../infrastructure/factories/EventPublisherFactory";


const repository = new MySqlAppointmentRepository();
const eventPublisher = EventPublisherFactory.create();

export const handler: SQSHandler = async (event) => {
  const records = event.Records ?? [];
  console.log("appointmentPE:start", { records: records.length });

  for (const rec of event.Records) {
    try {
      console.log("appointmentPE:record:rawBody", rec.body);
      const outer = JSON.parse(rec.body);
      const msg =
        typeof outer.Message === "string"
          ? JSON.parse(outer.Message)
          : outer.Message;

      console.log("appointmentPE:save:before", {
        appointmentId: msg.appointmentId,
      });
      await repository.save({
        appointmentId: msg.appointmentId,
        insuredId: msg.insuredId,
        scheduleId: Number(msg.scheduleId),
        countryISO: msg.countryISO,
      });

      console.log("appointmentPE:save:ok", {
        appointmentId: msg.appointmentId,
      });

      console.log("appointmentPE:publishConfirmed:before");

      await eventPublisher.publishConfirmed({ appointmentId: msg.appointmentId });

      console.log("appointmentPE:publishConfirmed:ok");
    } catch (e: any) {
      console.error(
        "[EB] ❌ Error en PutEvents:",
        e?.name,
        e?.message,
        e?.code,
        e?.$metadata ?? ""
      );
      throw e;
    }
  }
  console.log("appointmentPE:end");
};
