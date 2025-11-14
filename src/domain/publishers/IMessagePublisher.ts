import { Appointment } from "../Appointment";

export interface IMessagePublisher {
  publishAppointmentRequested(app: Appointment): Promise<void>;
}

