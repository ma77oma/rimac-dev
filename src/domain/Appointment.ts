export type CountryISO = 'PE' | 'CL';


export interface Appointment {
appointmentId: string;
insuredId: string; // 5 dígitos, puede tener ceros a la izquierda
scheduleId: number;
countryISO: CountryISO;
status: 'pending' | 'completed';
createdAt: string; // ISO
}