import { v4 as uuidv4 } from "uuid";
import { Appointment } from "../domain/Appointment";

export interface IAppointmentRepo {
  savePending(app: Appointment): Promise<void>;
  listByInsured(insuredId: string): Promise<Appointment[]>;
  markCompleted(appointmentId: string): Promise<void>;
}

export interface IMessagePublisher {
  publishAppointmentRequested(app: Appointment): Promise<void>;
}

export class AppointmentService {
  constructor(
    private repo: IAppointmentRepo,
    private publisher: IMessagePublisher
  ) {}

  async create(insuredId: string, scheduleId: number, countryISO: "PE" | "CL") {
    if (!/^\d{5}$/.test(insuredId)) {
      throw new Error("insuredId debe tener 5 dígitos");
    }

    const appointment: Appointment = {
      appointmentId: uuidv4(),
      insuredId,
      scheduleId,
      countryISO,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    console.log("[SERVICE] Guardando pending en repo...", {
      insuredId,
      scheduleId,
      countryISO,
    });
    await this.repo.savePending(appointment);
    console.log("[SERVICE] Guardado OK en Dynamo");

    // ⬇️ NO dejes que SNS rompa la API
    try {
      console.log("[SERVICE] Publicando en SNS...");
      await this.publisher.publishAppointmentRequested(appointment);
      console.log("[SERVICE] SNS publish OK");
    } catch (err: any) {
      console.error(
        "[SERVICE] Error al publicar en SNS (se ignora para no romper la API):",
        err?.name,
        err?.message
      );
    }

    return {
      message: "Agendamiento en proceso",
      appointmentId: appointment.appointmentId,
    };
  }

  async list(insuredId: string) {
    return this.repo.listByInsured(insuredId);
  }

  async complete(appointmentId: string) {
    await this.repo.markCompleted(appointmentId);
  }
}
