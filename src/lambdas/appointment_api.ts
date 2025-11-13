import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { AppointmentService } from "../application/AppointmentService";
import { SnsPublisher } from "../infrastructure/sns/SnsPublisher";
import { DynamoAppointmentRepository } from "../infrastructure/dynamo/DynamoAppointmentRepository";
import { InMemoryAppointmentRepository } from "../infrastructure/memory/InMemoryAppointmentRepository";
import { NoopPublisher } from "../infrastructure/memory/NoopPublisher";

const isOffline = process.env.IS_OFFLINE === "true";

const repo = isOffline ? new InMemoryAppointmentRepository() : new DynamoAppointmentRepository();
const pub  = isOffline ? new NoopPublisher() : new SnsPublisher();

const service = new AppointmentService(repo as any, pub as any);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext?.http?.method;
  const rid = event.requestContext?.requestId || Math.random().toString(36).slice(2);
  console.log("appointmentApi:start", {
    rid,
    method,
    stage: process.env.AWS_STAGE || process.env.STAGE,
    table: process.env.TABLE_NAME,
    topic: process.env.TOPIC_ARN,
    eventBus: process.env.EVENT_BUS_NAME,
    inVpc: !!process.env.AWS_LAMBDA_FUNCTION_VPC_ID
  });

  try {
    if (method === "POST") {
      console.log("appointmentApi:POST:body", event.body);
      const body = JSON.parse(event.body || "{}");
      const { insuredId, scheduleId, countryISO } = body;

      console.log("appointmentApi:POST:create:before", { insuredId, scheduleId, countryISO });
      const res = await service.create(insuredId, Number(scheduleId), countryISO);
      console.log("appointmentApi:POST:create:ok", res);

      return { statusCode: 202, body: JSON.stringify(res) };
    }

    if (method === "GET") {
      const insuredId = event.pathParameters?.insuredId!;
      console.log("appointmentApi:GET:list:before", { insuredId });
      const items = await service.list(insuredId);
      console.log("appointmentApi:GET:list:ok", { count: items?.length });

      return { statusCode: 200, body: JSON.stringify(items) };
    }

    console.warn("appointmentApi:unsupportedMethod", { method });
    return { statusCode: 400, body: "Unsupported method" };

  } catch (err: any) {
    console.error("appointmentApi:error", {
      rid,
      name: err?.name,
      message: err?.message,
      stack: err?.stack
    });
    return { statusCode: 500, body: JSON.stringify({ error: "internal" }) };
  } finally {
    console.log("appointmentApi:end", { rid });
  }
};
