import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandOutput,
  PutEventsRequestEntry,
} from "@aws-sdk/client-eventbridge";

import { IEventPublisher } from "../../domain/publishers/IEventPublisher";


export class EventBridgePublisher implements IEventPublisher {
  private eb: EventBridgeClient;
  private bus: string;

  constructor(opts?: { client?: EventBridgeClient; busName?: string }) {
    this.eb = opts?.client ?? new EventBridgeClient({});
    this.bus = opts?.busName ?? process.env.EVENT_BUS_NAME ?? "";
    if (!this.bus) {
      // Log temprano para no perder tiempo si falta la var
      console.error("[EB] ❌ EVENT_BUS_NAME no está definido en variables de entorno");
      throw new Error("EVENT_BUS_NAME not configured");
    }
  }

  /**
   * Publica un evento de confirmación de cita en EventBridge.
   * Retorna info útil para saber si falló o no.
   */
  async publishConfirmed(
    detail: { appointmentId: string },
    opts?: { correlationId?: string }
  ): Promise<{
    ok: boolean;
    failed: number;
    entries?: Array<{
      EventId?: string;
      ErrorCode?: string;
      ErrorMessage?: string;
    }>;
  }> {
    const correlationId =
      opts?.correlationId || `${detail.appointmentId}-${Date.now()}`;

    const entry: PutEventsRequestEntry = {
      Source: "rimac.appointments",
      DetailType: "AppointmentConfirmed",
      Detail: JSON.stringify({ appointmentId: detail.appointmentId, correlationId }),
      EventBusName: this.bus,
      // opcionalmente: Time: new Date()
    };

    console.log(
      "[EB] → Enviando evento",
      JSON.stringify({
        bus: this.bus,
        detailType: entry.DetailType,
        source: entry.Source,
        correlationId,
        payloadPreview: entry.Detail,
      })
    );

    try {
      const res = await this.eb.send(new PutEventsCommand({ Entries: [entry] }));
      const failed = res.FailedEntryCount ?? 0;

      // Log del resultado completo (sin ocultar)
      console.log(
        "[EB] ← Respuesta PutEvents",
        JSON.stringify({
          failed,
          entries: res.Entries?.map((e, i) => ({
            idx: i,
            eventId: e.EventId,
            errorCode: e.ErrorCode,
            errorMessage: e.ErrorMessage,
          })),
        })
      );

      if (failed > 0 && res.Entries) {
        // Log por cada entrada fallida
        res.Entries.forEach((e, i) => {
          if (e.ErrorCode || e.ErrorMessage) {
            console.error(
              "[EB] ❌ Entrada fallida",
              JSON.stringify({
                idx: i,
                errorCode: e.ErrorCode,
                errorMessage: e.ErrorMessage,
                correlationId,
              })
            );
          }
        });
      } else {
        const eventId = res.Entries?.[0]?.EventId;
        console.log(
          "[EB] ✅ Evento enviado",
          JSON.stringify({ eventId, correlationId, appointmentId: detail.appointmentId })
        );
      }

      return { ok: failed === 0, failed, entries: res.Entries };
    } catch (err: any) {
      console.error(
        "[EB] ❌ Error al enviar evento",
        JSON.stringify({
          message: err?.message || String(err),
          name: err?.name,
          stack: err?.stack,
          correlationId,
          bus: this.bus,
        })
      );
      throw err;
    }
  }
}
