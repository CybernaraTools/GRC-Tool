import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { OUTBOX_REPOSITORY } from "./application/tokens.js";
import { OutboxService } from "./application/outbox.service.js";
import { PostgresOutboxRepository } from "./infrastructure/postgres-outbox.repository.js";
import { OutboxController } from "./presentation/outbox.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [OutboxController],
  providers: [
    OutboxService,
    {
      provide: OUTBOX_REPOSITORY,
      useClass: PostgresOutboxRepository
    }
  ],
  exports: [OutboxService]
})
export class OutboxModule {}

