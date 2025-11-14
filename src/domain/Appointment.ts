export type CountryISO = 'PE' | 'CL';


export interface Appointment {
appointmentId: string;
insuredId: string; 
scheduleId: number;
countryISO: CountryISO;
status: 'pending' | 'completed';
createdAt: string; 
}