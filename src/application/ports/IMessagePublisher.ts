import { Appointment } from "../../domain/Appointment";

export interface IMessagePublisher {
  publishAppointmentRequested(app: Appointment): Promise<void>;
}