import { AppointmentService } from "../../application/AppointmentService";
import { RepositoryFactory } from "./RepositoryFactory";
import { PublisherFactory } from "./PublisherFactory";


export class ServiceFactory {
  
  static createAppointmentService(): AppointmentService {
    const repository = RepositoryFactory.create();
    const publisher = PublisherFactory.createMessagePublisher();
    
    return new AppointmentService(repository, publisher);
  }
}

