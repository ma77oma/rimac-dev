import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Appointment } from "../../domain/Appointment";
import { IMessagePublisher } from "../../domain/publishers/IMessagePublisher";

const TOPIC_ARN = process.env.TOPIC_ARN!;


export class SnsPublisher implements IMessagePublisher {
  private sns = new SNSClient({});

  async publishAppointmentRequested(app: Appointment): Promise<void> {
    console.log("sns:publish:start", {
      topic: TOPIC_ARN,
      appointmentId: app.appointmentId,
    });
    try {
      const res = await this.sns.send(
        new PublishCommand({
          TopicArn: TOPIC_ARN,
          Message: JSON.stringify(app),
          MessageAttributes: {
            countryISO: { DataType: "String", StringValue: app.countryISO },
          },
        })
      );
      console.log("sns:publish:ok", { messageId: res.MessageId });
    } catch (err: any) {
      console.error("sns:publish:error", err.name, err.message);
    }
  }
}
