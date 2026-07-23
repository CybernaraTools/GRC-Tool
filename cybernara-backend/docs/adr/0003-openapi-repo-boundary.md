# ADR-0003: Backend/Frontend Contract Boundary

Status: Accepted

## Context

The build prompt requires two independent repositories and forbids shared monorepo packages. The frontend must integrate through a published OpenAPI 3.1 backend artifact.

## Decision

The backend generates `openapi/cybernara.openapi.json` and publishes `dist/openapi/cybernara.openapi.json` in CI. The frontend reads that artifact and generates `src/lib/api/generated.ts`, including Zod schemas and a contract hash.

## Consequences

- Frontend CI fails when generated client code is stale.
- Frontend code may not import backend source paths.
- Contract-breaking backend changes must be visible as OpenAPI diffs before frontend upgrades.

