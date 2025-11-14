import { IAppointmentRepository } from "../../domain/repositories/IAppointmentRepository";
import { DynamoAppointmentRepository } from "../dynamo/DynamoAppointmentRepository";
import { InMemoryAppointmentRepository } from "../memory/InMemoryAppointmentRepository";


export class RepositoryFactory {
  
  static create(): IAppointmentRepository {
    const useInMemory = process.env.USE_IN_MEMORY === "true" || process.env.IS_OFFLINE === "true";
    
    if (useInMemory) {
      return new InMemoryAppointmentRepository();
    }
    
    return new DynamoAppointmentRepository();
  }
}

