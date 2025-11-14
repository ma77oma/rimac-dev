import { v4 as uuidv4 } from "uuid";
import { Appointment } from "../domain/Appointment";
import { IAppointmentRepository } from "../domain/repositories/IAppointmentRepository";
import { IMessagePublisher } from "../domain/publishers/IMessagePublisher";
import { CreateAppointmentRequest, CreateAppointmentResponse } from "./dtos/CreateAppointmentRequest";


export class AppointmentService {
  constructor(
    private repository: IAppointmentRepository,
    private messagePublisher: IMessagePublisher
  ) {}


  async create(request: CreateAppointmentRequest): Promise<CreateAppointmentResponse> {
    if (!/^\d{5}$/.test(request.insuredId)) {
      throw new Error("insuredId debe tener 5 dígitos");
    }

    const appointment: Appointment = {
      appointmentId: uuidv4(),
      insuredId: request.insuredId,
      scheduleId: request.scheduleId,
      countryISO: request.countryISO,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    console.log("[SERVICE] Guardando pending en repo...", {
      insuredId: request.insuredId,
      scheduleId: request.scheduleId,
      countryISO: request.countryISO,
    });
    await this.repository.savePending(appointment);
    console.log("[SERVICE] Guardado OK");

    try {
      console.log("[SERVICE] Publicando en SNS...");
      await this.messagePublisher.publishAppointmentRequested(appointment);
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

  async listByInsured(insuredId: string): Promise<Appointment[]> {
    return this.repository.listByInsured(insuredId);
  }

  async markAsCompleted(appointmentId: string): Promise<void> {
    await this.repository.markCompleted(appointmentId);
  }
}
