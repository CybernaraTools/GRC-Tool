import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { OutboxService } from "../application/outbox.service.js";

class PublishOutboxDto {
  tenantId!: string;
  eventType!: string;
  aggregateType!: string;
  aggregateId!: string;
  payload!: Record<string, unknown>;
  idempotencyKey!: string;
  createdBy!: string;
}

@ApiTags("Outbox")
@Controller("v1/outbox")
export class OutboxController {
  constructor(@Inject(OutboxService) private readonly service: OutboxService) {}

  @Post("events")
  async publish(@Body() body: PublishOutboxDto) {
    return this.service.publish(body);
  }
}

