import { Appointment } from "../../domain/Appointment";
import { IMessagePublisher } from "../../application/AppointmentService";

export class NoopPublisher implements IMessagePublisher {
  async publishAppointmentRequested(_app: Appointment): Promise<void> {
    // no hace nada en offline; solo log si quieres
    console.log("[offline] NOOP publish", _app);
  }
}
