import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ url?: string; headers?: Record<string, string> }>();
    const status =
      error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const correlationId =
      request.headers?.["x-correlation-id"] ??
      request.headers?.["x-request-id"] ??
      "missing-correlation-id";

    response.status(status).json({
      type: "about:blank",
      title: status >= 500 ? "Internal Server Error" : "Request Error",
      status,
      detail: error instanceof Error ? error.message : "Unexpected error",
      instance: request.url,
      correlationId
    });
  }
}

