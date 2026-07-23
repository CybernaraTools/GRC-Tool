import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../../app.module.js";
import { OutboxService } from "../application/outbox.service.js";

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const outbox = app.get(OutboxService);

  const result = await outbox.dispatchBatch(async (event) => {
    // M0 example handler: future milestones route by schema-versioned event type.
    console.log(
      JSON.stringify({
        message: "outbox.event.dispatched",
        eventId: event.id,
        eventType: event.eventType,
        tenantId: event.tenantId
      })
    );
  });

  console.log(JSON.stringify({ message: "outbox.batch.complete", ...result }));
  await app.close();
}

void main();

