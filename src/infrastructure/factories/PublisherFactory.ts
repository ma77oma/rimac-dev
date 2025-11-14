import { IMessagePublisher } from "../../domain/publishers/IMessagePublisher";
import { SnsPublisher } from "../sns/SnsPublisher";
import { NoopPublisher } from "../memory/NoopPublisher";

export class PublisherFactory {
  
  static createMessagePublisher(): IMessagePublisher {
    const useInMemory = process.env.USE_IN_MEMORY === "true" || process.env.IS_OFFLINE === "true";
    
    if (useInMemory) {
      return new NoopPublisher();
    }
    
    return new SnsPublisher();
  }
}

