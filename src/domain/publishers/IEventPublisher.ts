export interface IEventPublisher {
  publishConfirmed(detail: { appointmentId: string }): Promise<{
    ok: boolean;
    failed: number;
    entries?: Array<{
      EventId?: string;
      ErrorCode?: string;
      ErrorMessage?: string;
    }>;
  }>;
}

