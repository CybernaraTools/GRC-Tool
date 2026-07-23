import 'dotenv/config';
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { readEnv } from "./config/env.js";
import { ProblemDetailsFilter } from "./shared/problem-details.filter.js";

async function bootstrap(): Promise<void> {
  readEnv();
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidUnknownValues: true,
      transform: true
    })
  );
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

void bootstrap();

