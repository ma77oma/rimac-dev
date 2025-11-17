import { Appointment } from "../../domain/Appointment";

export interface IAppointmentRepo {
  savePending(app: Appointment): Promise<void>;
  listByInsured(insuredId: string): Promise<Appointment[]>;
  markCompleted(appointmentId: string): Promise<void>;
}
