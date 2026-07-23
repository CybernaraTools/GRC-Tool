import { Controller, Get } from "@nestjs/common";

@Controller("v1/health")
export class HealthController {
  @Get()
  health() {
    return {
      status: "ok",
      service: "cybernara-backend",
      apiVersion: "0.1.0-m0"
    };
  }
}

