import { SQSHandler } from "aws-lambda";
import { MySqlAppointmentRepository } from "../infrastructure/mysql/MySqlAppointmentRepository";
import { EventPublisherFactory } from "../infrastructure/factories/EventPublisherFactory";


const repository = new MySqlAppointmentRepository();
const eventPublisher = EventPublisherFactory.create();

export const handler: SQSHandler = async (event) => {
  for (const rec of event.Records) {
    // SNS → SQS: el "body" es JSON con 'Message' como string
    const outer = JSON.parse(rec.body);
    const msg = typeof outer.Message === "string" ? JSON.parse(outer.Message) : outer.Message;

    // msg debe contener: appointmentId, insuredId, scheduleId, countryISO
    await repository.save({
      appointmentId: msg.appointmentId,
      insuredId: msg.insuredId,
      scheduleId: Number(msg.scheduleId),
      countryISO: msg.countryISO,
    });

    // 5) Enviar conformidad
    await eventPublisher.publishConfirmed({ appointmentId: msg.appointmentId });
  }
};
