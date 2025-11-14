import { IEventPublisher } from "../../domain/publishers/IEventPublisher";
import { EventBridgePublisher } from "../eventbridge/EventBridgePublisher";


export class EventPublisherFactory {
 
  static create(): IEventPublisher {
    return new EventBridgePublisher();
  }
}

