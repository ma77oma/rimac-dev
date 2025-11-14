
export interface CreateAppointmentRequest {
  insuredId: string;
  scheduleId: number;
  countryISO: "PE" | "CL";
}


export interface CreateAppointmentResponse {
  message: string;
  appointmentId: string;
}

