import { readFileSync } from "node:fs";
import path from "node:path";
import { Inject, Injectable, type OnApplicationBootstrap } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants.js";
import { DiscoveryService } from "@nestjs/core";

const apiTagsMetadata = "swagger/apiUseTags";

type ControllerMetatype = {
  name: string;
  prototype: object;
};

type ControllerWrapper = {
  metatype?: ControllerMetatype | null;
};

export interface RegisteredRouteSummary {
  routeCount: number;
  modules: string[];
}

export interface RootStatusResponse {
  service: "cybernara-backend";
  status: "ok";
  apiVersion: string;
  openapiSpecPath: string | null;
  routeCount: number;
  modules: string[];
  documentation: string;
}

@Injectable()
export class RootStatusService implements OnApplicationBootstrap {
  private readonly apiVersion = readOpenApiVersion();
  private routeSummary: RegisteredRouteSummary = { routeCount: 0, modules: [] };

  constructor(@Inject(DiscoveryService) private readonly discovery: DiscoveryService) {}

  onApplicationBootstrap(): void {
    this.routeSummary = buildRegisteredRouteSummary(this.discovery.getControllers());
  }

  getStatus(): RootStatusResponse {
    return {
      service: "cybernara-backend",
      status: "ok",
      apiVersion: this.apiVersion,
      openapiSpecPath: null,
      routeCount: this.routeSummary.routeCount,
      modules: this.routeSummary.modules,
      documentation: "README.md#current-api-routes"
    };
  }
}

export function buildRegisteredRouteSummary(controllers: Iterable<ControllerWrapper>): RegisteredRouteSummary {
  const modules = new Set<string>();
  let routeCount = 0;

  for (const wrapper of controllers) {
    const metatype = wrapper.metatype ?? undefined;
    if (!metatype) {
      continue;
    }

    const controllerRouteCount = countControllerRoutes(metatype);
    if (controllerRouteCount === 0) {
      continue;
    }

    routeCount += controllerRouteCount;
    for (const moduleName of controllerModuleNames(metatype)) {
      modules.add(moduleName);
    }
  }

  return {
    routeCount,
    modules: [...modules].sort((left, right) => left.localeCompare(right))
  };
}

function countControllerRoutes(metatype: ControllerMetatype): number {
  const controllerPathCount = metadataPathCount(Reflect.getMetadata(PATH_METADATA, metatype));
  let routeCount = 0;

  for (const propertyName of Object.getOwnPropertyNames(metatype.prototype)) {
    if (propertyName === "constructor") {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(metatype.prototype, propertyName);
    if (typeof descriptor?.value !== "function") {
      continue;
    }

    if (Reflect.getMetadata(METHOD_METADATA, descriptor.value) === undefined) {
      continue;
    }

    routeCount += controllerPathCount * metadataPathCount(Reflect.getMetadata(PATH_METADATA, descriptor.value));
  }

  return routeCount;
}

function metadataPathCount(metadata: unknown): number {
  if (Array.isArray(metadata)) {
    return Math.max(metadata.length, 1);
  }

  return 1;
}

function controllerModuleNames(metatype: ControllerMetatype): string[] {
  const tags = Reflect.getMetadata(apiTagsMetadata, metatype);
  if (Array.isArray(tags) && tags.every((tag) => typeof tag === "string") && tags.length > 0) {
    return tags;
  }

  return [metatype.name.replace(/Controller$/, "") || "Unknown"];
}

function readOpenApiVersion(): string {
  const specPath = path.resolve(process.cwd(), "openapi/cybernara.openapi.json");
  const spec = JSON.parse(readFileSync(specPath, "utf8")) as { info?: { version?: unknown } };
  if (typeof spec.info?.version !== "string" || spec.info.version.length === 0) {
    throw new Error(`OpenAPI spec at ${specPath} does not define info.version.`);
  }

  return spec.info.version;
}
