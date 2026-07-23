import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested
} from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { IntegrationPlatformService } from "../application/integration-platform.service.js";
import type {
  AlertStatus,
  ConnectorKind,
  DeliveryStatus,
  SyncStatus,
  TestResultStatus,
  WebhookContract
} from "../domain/integration.js";

const connectorKinds = [
  "cloud",
  "identity",
  "endpoint",
  "code",
  "ticketing",
  "document",
  "siem",
  "vulnerability",
  "data",
  "crm",
  "clm",
  "notification",
  "vendor_intelligence",
  "trust_portal"
] as const;
const deliveryStatuses = ["pending", "delivered", "failed", "dead_lettered"] as const;

class ConnectorScopeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(["read", "write"])
  access!: "read" | "write";

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

class RegisterConnectorDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  provider!: string;

  @IsIn(connectorKinds)
  kind!: ConnectorKind;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConnectorScopeDto)
  scopes!: ConnectorScopeDto[];

  @IsString()
  @IsNotEmpty()
  secretRef!: string;
}

class ObjectCountsDto {
  @IsInt()
  @Min(0)
  read!: number;

  @IsInt()
  @Min(0)
  created!: number;

  @IsInt()
  @Min(0)
  updated!: number;

  @IsInt()
  @Min(0)
  deleted!: number;
}

class RecordSyncRunDto {
  @IsIn(["started", "succeeded", "failed"])
  status!: SyncStatus;

  @IsOptional()
  @IsString()
  cursorAfter?: string | null;

  @ValidateNested()
  @Type(() => ObjectCountsDto)
  objectCounts!: ObjectCountsDto;

  @IsOptional()
  @IsDateString()
  finishedAt?: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsUUID()
  alertOwnerId?: string;
}

class RecordConnectorObjectDto {
  @IsUUID()
  syncRunId!: string;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsString()
  @IsNotEmpty()
  externalId!: string;

  @IsObject()
  sourcePayload!: Record<string, unknown>;

  @IsIn(deliveryStatuses)
  deliveryStatus!: DeliveryStatus;

  @IsDateString()
  sourceTimestamp!: string;
}

class RegisterWebhookContractDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsIn(["inbound", "outbound"])
  direction!: WebhookContract["direction"];

  @IsString()
  @IsNotEmpty()
  signingSecretRef!: string;

  @IsInt()
  @Min(1)
  rateLimitPerMinute!: number;
}

class RecordWebhookDeliveryDto {
  @IsString()
  @IsNotEmpty()
  deliveryIdempotencyKey!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsIn(deliveryStatuses)
  deliveryStatus!: DeliveryStatus;

  @IsInt()
  @Min(1)
  attempts!: number;

  @IsOptional()
  @IsDateString()
  observedAt?: string;

  @IsOptional()
  @IsString()
  lastError?: string;
}

class ControlTestResultDto {
  @IsIn(["pass", "fail", "inconclusive"])
  status!: TestResultStatus;

  @IsString()
  @IsNotEmpty()
  summary!: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  evidenceObjectIds!: string[];
}

class RecordControlTestDto {
  @IsUUID()
  connectorId!: string;

  @IsString()
  @IsNotEmpty()
  controlRef!: string;

  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsObject()
  population!: Record<string, unknown>;

  @IsObject()
  sample!: Record<string, unknown>;

  @ValidateNested()
  @Type(() => ControlTestResultDto)
  result!: ControlTestResultDto;

  @IsDateString()
  sourceTimestamp!: string;

  @IsUUID()
  ownerId!: string;
}

class ControlTestListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  connectorId?: string;

  @IsOptional()
  @IsString()
  controlRef?: string;
}

class AlertListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(["open", "triaged", "resolved"])
  status?: AlertStatus;
}

@ApiTags("IntegrationPlatform")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/integration-platform")
export class IntegrationPlatformController {
  constructor(@Inject(IntegrationPlatformService) private readonly service: IntegrationPlatformService) {}

  @Post("connectors")
  @RequirePolicy({ resourceType: "connector", action: "write" })
  @ApiOperation({ summary: "Register a least-privilege connector with a secret reference." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Connector registered." })
  @ApiBadRequestResponse({ description: "Invalid request body or idempotency key." })
  async registerConnector(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: RegisterConnectorDto
  ) {
    const context = readRequestContext(request);
    return this.service.registerConnector({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      key: body.key,
      provider: body.provider,
      kind: body.kind,
      scopes: body.scopes,
      secretRef: body.secretRef
    });
  }

  @Get("connectors")
  @RequirePolicy({ resourceType: "connector", action: "read" })
  @ApiOperation({ summary: "List connectors with health and sync cursor status." })
  @ApiOkResponse({ description: "Connectors." })
  async listConnectors(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listConnectors(context.tenantId, toPagination(query));
  }

  @Get("connectors/:connectorId")
  @RequirePolicy({ resourceType: "connector", action: "read", resourceIdParam: "connectorId" })
  @ApiOperation({ summary: "Fetch one connector with health and sync cursor status." })
  @ApiOkResponse({ description: "Connector." })
  async getConnector(@Req() request: Request, @Param("connectorId") connectorId: string) {
    const context = readRequestContext(request);
    return this.service.getConnector(context.tenantId, connectorId);
  }

  @Post("connectors/:connectorId/sync-runs")
  @RequirePolicy({ resourceType: "connector_sync_run", action: "write", resourceIdParam: "connectorId" })
  @ApiOperation({ summary: "Record connector sync status and cursor movement." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Sync run recorded." })
  async recordSyncRun(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("connectorId") connectorId: string,
    @Body() body: RecordSyncRunDto
  ) {
    const context = readRequestContext(request);
    return this.service.recordSyncRun({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      connectorId,
      status: body.status,
      cursorAfter: body.cursorAfter ?? null,
      objectCounts: body.objectCounts,
      finishedAt: body.finishedAt ? new Date(body.finishedAt) : undefined,
      error: body.error,
      alertOwnerId: body.alertOwnerId
    });
  }

  @Get("connectors/:connectorId/sync-runs")
  @RequirePolicy({ resourceType: "connector_sync_run", action: "read", resourceIdParam: "connectorId" })
  @ApiOperation({ summary: "List connector sync runs." })
  @ApiOkResponse({ description: "Sync runs." })
  async listSyncRuns(
    @Req() request: Request,
    @Param("connectorId") connectorId: string,
    @Query() query: PaginationQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.listSyncRuns(context.tenantId, connectorId, toPagination(query));
  }

  @Post("connectors/:connectorId/objects")
  @RequirePolicy({ resourceType: "connector_object", action: "write", resourceIdParam: "connectorId" })
  @ApiOperation({ summary: "Record a reconciled connector object with provenance." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Connector object recorded." })
  async recordConnectorObject(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("connectorId") connectorId: string,
    @Body() body: RecordConnectorObjectDto
  ) {
    const context = readRequestContext(request);
    return this.service.recordConnectorObject({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      connectorId,
      syncRunId: body.syncRunId,
      objectType: body.objectType,
      externalId: body.externalId,
      sourcePayload: body.sourcePayload,
      deliveryStatus: body.deliveryStatus,
      sourceTimestamp: new Date(body.sourceTimestamp)
    });
  }

  @Get("connectors/:connectorId/objects")
  @RequirePolicy({ resourceType: "connector_object", action: "read", resourceIdParam: "connectorId" })
  @ApiOperation({ summary: "List reconciled connector objects." })
  @ApiOkResponse({ description: "Connector objects." })
  async listConnectorObjects(
    @Req() request: Request,
    @Param("connectorId") connectorId: string,
    @Query() query: PaginationQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.listConnectorObjects(context.tenantId, connectorId, toPagination(query));
  }

  @Post("webhook-contracts")
  @RequirePolicy({ resourceType: "webhook_contract", action: "write" })
  @ApiOperation({ summary: "Register a versioned webhook contract." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Webhook contract registered." })
  async registerWebhookContract(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: RegisterWebhookContractDto
  ) {
    const context = readRequestContext(request);
    return this.service.registerWebhookContract({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      key: body.key,
      version: body.version,
      direction: body.direction,
      signingSecretRef: body.signingSecretRef,
      rateLimitPerMinute: body.rateLimitPerMinute
    });
  }

  @Get("webhook-contracts")
  @RequirePolicy({ resourceType: "webhook_contract", action: "read" })
  @ApiOperation({ summary: "List webhook contracts." })
  @ApiOkResponse({ description: "Webhook contracts." })
  async listWebhookContracts(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listWebhookContracts(context.tenantId, toPagination(query));
  }

  @Post("webhook-contracts/:webhookId/deliveries")
  @RequirePolicy({ resourceType: "webhook_delivery", action: "write", resourceIdParam: "webhookId" })
  @ApiOperation({ summary: "Record a webhook delivery attempt." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Webhook delivery recorded." })
  async recordWebhookDelivery(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("webhookId") webhookId: string,
    @Body() body: RecordWebhookDeliveryDto
  ) {
    const context = readRequestContext(request);
    return this.service.recordWebhookDelivery({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      webhookId,
      deliveryIdempotencyKey: body.deliveryIdempotencyKey,
      payload: body.payload,
      deliveryStatus: body.deliveryStatus,
      attempts: body.attempts,
      observedAt: body.observedAt ? new Date(body.observedAt) : undefined,
      lastError: body.lastError
    });
  }

  @Get("webhook-contracts/:webhookId/deliveries")
  @RequirePolicy({ resourceType: "webhook_delivery", action: "read", resourceIdParam: "webhookId" })
  @ApiOperation({ summary: "List webhook delivery log entries." })
  @ApiOkResponse({ description: "Webhook deliveries." })
  async listWebhookDeliveries(
    @Req() request: Request,
    @Param("webhookId") webhookId: string,
    @Query() query: PaginationQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.listWebhookDeliveries(context.tenantId, webhookId, toPagination(query));
  }

  @Post("control-tests")
  @RequirePolicy({ resourceType: "automated_control_test", action: "write" })
  @ApiOperation({ summary: "Record an automated control-test result." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Control-test result recorded." })
  async recordControlTest(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: RecordControlTestDto
  ) {
    const context = readRequestContext(request);
    return this.service.recordAutomatedControlTest({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      connectorId: body.connectorId,
      controlRef: body.controlRef,
      query: body.query,
      population: body.population,
      sample: body.sample,
      result: body.result,
      sourceTimestamp: new Date(body.sourceTimestamp),
      ownerId: body.ownerId
    });
  }

  @Get("control-tests")
  @RequirePolicy({ resourceType: "automated_control_test", action: "read" })
  @ApiOperation({ summary: "List automated control-test results." })
  @ApiOkResponse({ description: "Automated control-test results." })
  async listControlTests(@Req() request: Request, @Query() query: ControlTestListQueryDto) {
    const context = readRequestContext(request);
    return this.service.listAutomatedControlTests({
      tenantId: context.tenantId,
      connectorId: query.connectorId,
      controlRef: query.controlRef,
      pagination: toPagination(query)
    });
  }

  @Get("assurance-alerts")
  @RequirePolicy({ resourceType: "assurance_alert", action: "read" })
  @ApiOperation({ summary: "List assurance alerts from connectors and automated tests." })
  @ApiOkResponse({ description: "Assurance alerts." })
  async listAssuranceAlerts(@Req() request: Request, @Query() query: AlertListQueryDto) {
    const context = readRequestContext(request);
    return this.service.listAssuranceAlerts({
      tenantId: context.tenantId,
      status: query.status,
      pagination: toPagination(query)
    });
  }
}

function requiredIdempotencyKey(value: string | undefined): string {
  if (!value?.trim()) {
    throw new BadRequestException("Idempotency-Key header is required.");
  }
  return value;
}
