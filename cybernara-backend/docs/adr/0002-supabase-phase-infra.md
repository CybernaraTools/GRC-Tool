# ADR-0002: M0 Supabase Infrastructure Translation

Status: Accepted

## Context

The architecture document targets Kubernetes, PostgreSQL HA, S3-compatible object storage, Redis, OpenSearch/pgvector, Prometheus/Grafana, and SIEM export. The build prompt overrides this phase to use Supabase-hosted equivalents and defer Kubernetes/Terraform/Helm.

## Decision

For M0, implement the platform against Supabase Postgres, Supabase Auth, Supabase Storage, and pgvector-ready PostgreSQL. Keep Kubernetes, Helm, Terraform/OpenTofu, Prometheus/Grafana, and SIEM export as explicit future deployment targets in the traceability matrix.

## Consequences

- Local repo artifacts include Dockerfiles and per-repo docker-compose files.
- Live Supabase smoke tests require real `SUPABASE_*` values and fail fast when absent.
- Observability starts with structured logs and OpenTelemetry-ready boundaries; full dashboards and SIEM export are M6 work.

