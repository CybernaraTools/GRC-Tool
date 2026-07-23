# M3 Governed AI and Knowledge Automation Checkpoint

Date: 2026-07-02
API contract version: `0.1.0-m0` (unchanged; M3 added backend domain internals and schema)
Frontend target contract: `cybernara-backend/openapi/cybernara.openapi.json`

## Requirement IDs Closed

- `ENG-DOM-09`: AIOrchestration domain and schema foundation for retrieval indexes, prompt versions, model deployments, validation, evaluation, approvals, and provenance.
- `AI-01`: Governed assessment-question generation validates typed output, citations, duplicates, safety policy, evidence expectations, and tenant-scoped retrieval sources.
- `AI-02`: Prompt, model deployment, retrieval index, generation parameters, fingerprints, and immutable question versions are captured for reproducibility.
- `AI-03`: Generated questions remain pending until human reviewer approval; AI actors are blocked from publish, score, approve, or risk-accept actions.
- `AI-04`: Curated fallback question generation keeps assessments usable when model, retrieval, policy, or evaluation paths fail.
- `AI-07`, `AI-08`: Prompt-injection checks, retrieval ACLs, no-training/egress controls, kill switch, golden-set evaluation gates, drift/adversarial/tenant-isolation gates, and promotion approval are implemented as domain invariants.
- `PRD-14`: Backend foundation supports AI-assisted question generation and reviewer-governed advisory outputs with citations, confidence, and SME-review routing.

## Explicit Deferrals

- Live model gateway calls, retrieval-index materialization, vector storage, and provider adapters are not wired yet.
- AI-assisted mapping suggestions, evidence classification, control summaries, policy drafting, regulatory impact analysis, and security questionnaire automation are represented by use-case types and governance invariants; full workflows/UI remain later slices.
- DLP/redaction, regional routing enforcement, cost/latency monitoring, and drift dashboards are schema/domain foundations only.
- AI output is not exposed through API endpoints or frontend UI yet.

## Built

- `AIOrchestration` module with pure domain functions for prompt/model promotion, retrieval-index approval, question-generation runs, fallback, reviewer approval, SME-review routing, and autonomous-action denial.
- M3 migration tables for retrieval indexes, prompt versions, model deployments, evaluation runs, generation runs, immutable question versions, and output reviews with tenant isolation.
- Golden-set promotion gate requiring evaluation pass, adversarial pass, tenant-isolation pass, drift threshold, and reviewer approval.
- Policy validation for citations, duplicate questions, unauthorized source references, evidence expectation references, bounded deterministic generation parameters, prompt-injection patterns, no-training, egress allow-list, and model kill switch.
- Unit tests covering approved generation, fallback generation, unsafe output rejection, AI action denial, SME-review routing, and promotion governance.

## Verification

- Backend `npm run lint`: passed.
- Backend `npm run typecheck`: passed.
- Backend `npm run build`: passed; OpenAPI contract regenerated and current.
- Backend `npm run test`: passed; 7 test files, 16 tests, architecture boundary check, migration convention check, OpenAPI freshness check.
- Frontend `npm run lint`: passed.
- Frontend `npm run typecheck`: passed.
- Frontend `npm run test`: passed; 1 test file, 2 tests, architecture boundary check, generated client freshness check.
- Frontend `npm run build`: passed.

## Known Gaps

- Local shell used Node `v22.11.0` during npm commands while repository engines target Node `>=24.0.0`; commands passed, but Node 24 remains the supported runtime.
- No external AI provider calls were added, so no new dependency installation was required.
- OpenAPI and generated frontend client are unchanged because this is not yet an API-exposed workflow slice.

## Recommendation

Proceed to M4 Integration Platform and Continuous Assurance.
