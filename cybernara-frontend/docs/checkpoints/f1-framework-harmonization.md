# F1 Checkpoint - Framework and Harmonization Browsing

## Requirements and workflows closed

- Framework browsing: published content-pack list, immutable version pinning, canonical requirements, source package lineage, and rejected-record diagnostics.
- Harmonization browsing: paginated harmonized control library, exact harmonized-control lookup, mappings by control, mappings by framework, and framework-unique controls.
- Backend module surfaces consumed: `ENG-DOM-02` FrameworkContent and `ENG-DOM-03` Harmonization.

## Backend API target

- Version: `0.1.0-m0`
- Current contract: 92 paths, 120 operations
- Generated client current against `../cybernara-backend/openapi/cybernara.openapi.json`.

## Built

- `app/frameworks/page.tsx`: protected framework library with server-side offset pagination, exact `frameworkKey` requirement filtering, content-pack pinning, and source diagnostics.
- `app/harmonization/page.tsx`: protected harmonization explorer with server-side offset pagination, exact `harmonizedId` and `frameworkKey` lookups, mappings, and unique controls.
- `src/components/pagination-controls.tsx`: reusable server-rendered pagination controls.
- `src/lib/listing.ts`: query parsing, bounded pagination, and display helpers.
- `src/lib/protected-session.ts`: shared protected-route redirect helper.
- `e2e/f1-framework-harmonization.spec.ts`: real login plus backend-backed F1 workflow.

## Verification

| Check | Result |
| --- | --- |
| Full frontend gate | `npm run test` passed |
| Unit tests | 6 files, 13 tests passed |
| Boundary check | `npm run arch:test` passed |
| Contract freshness | `npm run contract:check` passed |
| E2E/accessibility | 4 Chromium tests passed; F1 includes axe scan on the harmonization explorer after real backend data loads |
| Production build | `npm run build` passed |

## Accessibility notes

- F1 tables use captions, column headers, and normal links/buttons.
- Filter forms are labeled and keyboard reachable.
- Automated axe scan on the F1 harmonization flow found no serious or critical violations.

## Deviations and constraints

- The backend contract supports offset pagination and exact filters/paths: `frameworkKey`, `packId`, `harmonizedId`, and framework mapping routes. It does not expose free-text search over requirements or harmonized controls. F1 does not load all rows client-side to simulate search; it documents and uses only the server-supported filters.
- Content packs and harmonized library records remain read-only because the backend exposes no edit/delete endpoints for published versions.

## Known gaps carried forward

- Free-text framework/control search requires a backend API addition before the UI can offer it honestly at large data volume.
- F2 begins the assessment core workflow and will consume the Assessment, EvidenceAssurance, RiskWorkflow, and ReportingAnalytics surfaces.

## Recommendation

Go for F2.
