import {
  AppointmentService,
 
} from "../src/application/AppointmentService";
import { IMessagePublisher } from "../src/domain/publishers/IMessagePublisher";
import { IAppointmentRepository } from "../src/domain/repositories/IAppointmentRepository";

test("crea cita en pending y publica evento", async () => {
  const saved: any[] = [];
  const repo: IAppointmentRepository = {
    savePending: async (a) => void saved.push(a),
    listByInsured: async () => [],
    markCompleted: async () => {},
  };
  let published = false;
  const pub: IMessagePublisher = {
    publishAppointmentRequested: async () => {
      published = true;
    },
  };

  const svc = new AppointmentService(repo, pub);
  const res = await svc.create("00045", 1, "PE");

  expect(saved[0].status).toBe("pending");
  expect(published).toBe(true);
  expect(res.message).toBe("Agendamiento en proceso");
});
