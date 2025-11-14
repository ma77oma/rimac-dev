import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ServiceFactory } from "../infrastructure/factories/ServiceFactory";
import { CreateAppointmentRequest } from "../application/dtos/CreateAppointmentRequest";

const service = ServiceFactory.createAppointmentService();

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
      
      // Mapear request HTTP a DTO de aplicación
      const request: CreateAppointmentRequest = {
        insuredId: body.insuredId,
        scheduleId: Number(body.scheduleId),
        countryISO: body.countryISO,
      };

      console.log("appointmentApi:POST:create:before", request);
      const res = await service.create(request);
      console.log("appointmentApi:POST:create:ok", res);

      return { statusCode: 202, body: JSON.stringify(res) };
    }

    if (method === "GET") {
      const insuredId = event.pathParameters?.insuredId!;
      console.log("appointmentApi:GET:list:before", { insuredId });
      const items = await service.listByInsured(insuredId);
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
