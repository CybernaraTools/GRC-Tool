import { Inject, Injectable } from "@nestjs/common";
import { createOutboxEvent, type OutboxEvent } from "../domain/outbox-event.js";
import { OUTBOX_REPOSITORY } from "./tokens.js";

export interface OutboxRepository {
  enqueue(event: OutboxEvent): Promise<OutboxEvent>;
  findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<OutboxEvent | null>;
  claimBatch(limit: number): Promise<OutboxEvent[]>;
  markProcessed(eventId: string): Promise<void>;
  markFailed(eventId: string, error: string): Promise<void>;
}

@Injectable()
export class OutboxService {
  constructor(@Inject(OUTBOX_REPOSITORY) private readonly repository: OutboxRepository) {}

  async publish(input: Parameters<typeof createOutboxEvent>[0]): Promise<OutboxEvent> {
    return this.repository.enqueue(createOutboxEvent(input));
  }

  async findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<OutboxEvent | null> {
    return this.repository.findByIdempotencyKey(tenantId, idempotencyKey);
  }

  async dispatchBatch(
    handler: (event: OutboxEvent) => Promise<void>,
    limit = 25
  ): Promise<{ processed: number; failed: number }> {
    const batch = await this.repository.claimBatch(limit);
    let processed = 0;
    let failed = 0;

    for (const event of batch) {
      try {
        await handler(event);
        await this.repository.markProcessed(event.id);
        processed += 1;
      } catch (error) {
        await this.repository.markFailed(event.id, error instanceof Error ? error.message : String(error));
        failed += 1;
      }
    }

    return { processed, failed };
  }
}
