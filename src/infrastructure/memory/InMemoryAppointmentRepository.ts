import { Appointment } from "../../domain/Appointment";
import { IAppointmentRepository } from "../../domain/repositories/IAppointmentRepository";

const db: Record<string, Appointment> = {};


export class InMemoryAppointmentRepository implements IAppointmentRepository {
  async savePending(app: Appointment): Promise<void> {
    db[app.appointmentId] = app;
  }
  async listByInsured(insuredId: string): Promise<Appointment[]> {
    return Object.values(db)
      .filter(x => x.insuredId === insuredId)
      .sort((a,b) => a.createdAt.localeCompare(b.createdAt));
  }
  async markCompleted(appointmentId: string): Promise<void> {
    if (db[appointmentId]) db[appointmentId].status = "completed";
  }
}