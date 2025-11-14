import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Appointment } from "../../domain/Appointment";
import { IAppointmentRepository } from "../../domain/repositories/IAppointmentRepository";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = process.env.TABLE_NAME!;

// Cliente base
const rawClient = new DynamoDBClient({ region: REGION });

// Middleware para ver llamadas al SDK (útil para VPC bloqueada)
rawClient.middlewareStack.add(
  (next, context) => async (args) => {
    console.log("DDB >>", context.commandName, "request started");
    try {
      const result = await next(args);
      console.log("DDB <<", context.commandName);
      return result;
    } catch (err: any) {
      console.error("DDB !!", context.commandName, err.name, err.message);
      throw err;
    }
  },
  { step: "initialize" }
);

const ddb = DynamoDBDocumentClient.from(rawClient);


export class DynamoAppointmentRepository implements IAppointmentRepository {
  async savePending(app: Appointment): Promise<void> {
    console.log("savePending:start", { TABLE_NAME, pk: app.appointmentId });
    try {
      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: app }));
      console.log("savePending:ok", app.appointmentId);
    } catch (err: any) {
      console.error("savePending:error", err.name, err.message);
      throw err;
    }
  }

  async listByInsured(insuredId: string): Promise<Appointment[]> {
    console.log("listByInsured:start", { insuredId });
    try {
      const res = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "insuredId-createdAt-index",
          KeyConditionExpression: "insuredId = :i",
          ExpressionAttributeValues: { ":i": insuredId },
          ScanIndexForward: false,
        })
      );
      console.log("listByInsured:ok", { count: res.Count });
      return (res.Items as Appointment[]) || [];
    } catch (err: any) {
      console.error("listByInsured:error", err.name, err.message);
      throw err;
    }
  }

  async markCompleted(appointmentId: string): Promise<void> {
    console.log("[DDB] Actualizando a completed", { appointmentId });

    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { appointmentId },
          UpdateExpression: "SET #s = :c",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":c": "completed" },
        })
      );

      console.log("[DDB] ✅ Actualizado");
    } catch (err: any) {
      console.error("markCompleted:error", err.name, err.message);
      throw err;
    }
  }
}
