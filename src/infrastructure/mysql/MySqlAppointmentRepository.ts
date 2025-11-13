import { getMySqlPool } from "./MySqlClient";

export type RdsAppointment = {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: string;
  status?: string;
};

export class MySqlAppointmentRepository {
  async save(req: RdsAppointment): Promise<void> {
    const pool = await getMySqlPool();
    await pool.execute(
      `
      INSERT INTO appointments_ext
        (appointment_id, insured_id, schedule_id, country_iso, status, created_at)
      VALUES (?,?,?,?, 'pending', NOW())
      ON DUPLICATE KEY UPDATE
        insured_id = VALUES(insured_id),
        schedule_id = VALUES(schedule_id),
        country_iso = VALUES(country_iso),
        updated_at = NOW()
      `,
      [req.appointmentId, req.insuredId, req.scheduleId, req.countryISO]
    );
  }
}
