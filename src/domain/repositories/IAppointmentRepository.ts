import { Appointment } from "../Appointment";

export interface IAppointmentRepository {
  savePending(app: Appointment): Promise<void>;
  listByInsured(insuredId: string): Promise<Appointment[]>;
  markCompleted(appointmentId: string): Promise<void>;
}

