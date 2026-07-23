# Cybernara Business Workflow Specification
### How the Platform Operates — From Purchase to Continuous Audit Readiness

*Prepared as internal/enterprise-facing documentation. This document explains business operation only — it deliberately avoids APIs, code, controllers, and database internals, which are covered in the companion Engineering Requirements, Architecture, and Schema specifications.*

---

## 1. Executive Product Vision

### The problem Cybernara exists to solve

Every mid-market and enterprise organization today is regulated by more obligations than it can practically track by hand: privacy law (GDPR, DPDP, CCPA/CPRA, Saudi PDPL), security and operational assurance (SOC 2, ISO 27001, NIST SP 800-53, Essential Eight), and quality/maturity frameworks (CMMI, ISO 9001), often simultaneously and often for the same underlying business activity. The default response — a wall of spreadsheets, shared drives, and email threads — breaks down for four structural reasons:

- **Duplication.** The same underlying control (encryption, access control, incident response, vendor due diligence) shows up, worded differently, in ten or more frameworks. Teams re-implement and re-document the same control repeatedly instead of doing the work once.
- **Staleness.** Spreadsheets do not expire evidence, escalate overdue owners, or detect regulatory change. Compliance posture is only as current as the last manual refresh.
- **Weak traceability.** When an auditor or regulator asks "why do you believe you comply," spreadsheet-based programs cannot show a defensible chain from the legal citation to the control, to the specific evidence, to who reviewed it and when.
- **No single source of truth.** Privacy, security, and quality obligations are usually owned by different teams, in different tools, with no shared model of risk, ownership, or readiness — so executives cannot get one honest view of enterprise posture.

### Why harmonization and evidence reuse matter

Cybernara's foundational bet is that **frameworks are not independent programs — they are different lenses on a shared set of operational controls.** GDPR Article 32, HIPAA §164.308, SOC 2 CC6, and ISO 27001 Annex A all care about access control. If Cybernara represents "access control" once, as a **harmonized control**, and maps every framework's specific requirement to it with an explicit coverage/confidence rating, then:

- Implementing and evidencing the control once satisfies many mapped obligations simultaneously.
- Framework-specific nuance (a stricter clause, a regional carve-out, a unique obligation with no analog elsewhere) remains visible and traceable rather than being flattened away.
- Adding a fourteenth framework is a **content operation** (import, map, publish) rather than a software rewrite.

This is why Cybernara treats "framework requirement," "harmonized control," and "implementation/evidence" as three distinct, related layers rather than one flat compliance checklist.

### Why multi-framework compliance is otherwise so hard

Multi-framework programs fail when tools conflate these three layers, when AI is allowed to silently change conclusions, or when historical assessments cannot be reproduced after content changes. Cybernara's answer to each:

- Layers stay explicit and separately versioned (framework content, harmonized controls, mappings, and tenant execution are four distinct, independently versioned things).
- AI is advisory-only; it can draft, suggest, and summarize, but a human must approve before anything it produces becomes authoritative.
- Every assessment is pinned to exact content, mapping, and question versions at creation time, so a report generated a year later, or a re-run audit, reproduces the same conclusions from the same inputs.

### How Cybernara solves these problems, end to end

Cybernara is best understood as a **compliance operating system**: a harmonized control graph (what "good" looks like, sourced from 13+ regulatory frameworks) connected to an execution layer (who owns what, what evidence exists, what gaps and risks remain) connected to an assurance layer (continuous testing, drift detection, and audit-ready reporting). The remainder of this document walks through how that system actually runs, day to day, for every role that touches it.

---

## 2. Platform Philosophy

These are the design commitments that shape every workflow described later in this document. They are not implementation choices — they are business promises to customers, auditors, and regulators.

| Principle | What it means in practice |
|---|---|
| **Single source of truth** | One compliance graph connects requirements, harmonized controls, evidence, risks, tasks, policies, vendors, and reports. No parallel spreadsheet is needed once a framework is onboarded. |
| **Framework separation** | A framework's authoritative text (its articles, clauses, and controls) is never edited or reinterpreted in place. It is imported, versioned, and cited — never silently altered. |
| **Harmonized controls** | Reusable control objectives sit between "what the law says" and "what we actually built," so one implementation can satisfy many obligations. |
| **Evidence-first compliance** | A claim of compliance without evidence is not accepted anywhere in the platform. Every control instance, question, and report links back to specific, dated, owned evidence. |
| **Assessment-driven workflow** | Compliance work is organized around scoped, time-bound assessments (not an undifferentiated backlog), each of which produces a defensible, closable outcome. |
| **Audit readiness as a default state** | The platform is built so that "prepare for the audit" mostly means "export what's already true," not a scramble to reconstruct history. |
| **Continuous compliance** | Automated tests, evidence expiry, and drift detection keep posture current between formal assessment cycles, rather than only at renewal time. |
| **AI as advisory only** | AI drafts questions, suggests mappings, classifies evidence, and summarizes gaps — but cannot publish, approve, score, or accept risk on its own. |
| **Human approval model** | Every consequential state change (a published mapping, an approved question set, a closed finding, an accepted risk) has a named human approver and a timestamp. |
| **Version pinning** | Every assessment freezes the exact framework version, mapping version, and question version in use at the time of scoping, so results remain reproducible forever. |
| **Immutable history** | Once published, framework content, approved mappings, question versions, evidence versions, and audit events cannot be edited — only superseded by a new version, preserving a complete history of what was known and decided, and when. |

---

## 3. Personas

Each persona below is described by what they are accountable for, not by what screen they click through — the platform's job is to make that accountability easy to discharge.

### Platform Admin
- **Responsibilities:** Operates the private-cloud deployment itself — identity/SSO configuration, encryption keys, integration health, backup/recovery, and platform-level security posture.
- **Goals:** Keep the platform available, secure, and correctly isolated per tenant/workspace.
- **Daily activities:** Monitor system health dashboards, review security alerts, manage service accounts and connector credentials, oversee key rotation.
- **Permissions:** Full administrative access to platform configuration; typically no access to tenant business content unless explicitly granted.
- **Pain points (that Cybernara removes):** No visibility into connector health or drift; manual key rotation; undocumented recovery procedures.
- **Modules used:** Administration, Integrations, Audit, Analytics.
- **Expected outputs:** Verified backups, health dashboards, incident runbooks executed, key rotation records.

### Tenant Admin
- **Responsibilities:** Owns the organization's instance of Cybernara — enabling frameworks, structuring business units/workspaces, provisioning users and roles, configuring evidence and workflow rules.
- **Goals:** Get the organization productive quickly and keep configuration aligned to how the business is actually structured.
- **Daily activities:** Manage users/roles, enable or update frameworks, configure workspace hierarchy, review platform-wide adoption metrics.
- **Pain points removed:** Re-implementing the same setup steps per framework; unclear delegation across business units.
- **Modules used:** Framework Library, Administration, Analytics, Reporting.
- **Expected outputs:** A correctly scoped, framework-enabled tenant ready for GRC/Privacy/Security teams to operate in.

### GRC Manager
- **Responsibilities:** Owns the overall compliance program — scoping assessments, coordinating cross-framework activity, tracking readiness.
- **Goals:** Demonstrable, defensible readiness across every enabled framework, on schedule.
- **Daily activities:** Create/scope assessments, assign owners, monitor dashboards, chase overdue items, prepare executive updates.
- **Pain points removed:** No cross-framework visibility; manual status roll-ups; unclear ownership of gaps.
- **Modules used:** Assessment Workspace, Risk Register, Tasks, Reporting, Analytics.
- **Expected outputs:** Scoped assessments, readiness dashboards, executive reports.

### Privacy Officer
- **Responsibilities:** Data inventory, RoPA, DPIAs, rights requests, consent, incident response, retention/deletion, and jurisdictional interpretation.
- **Goals:** Defensible, jurisdiction-specific privacy posture with auditable rationale.
- **Daily activities:** Review processing activities, triage rights requests, evaluate DPIA outcomes, approve retention/deletion exceptions.
- **Modules used:** Privacy (inventory, RoPA, DPIA, rights, consent, incidents, retention), Reporting, Audit.
- **Expected outputs:** Up-to-date RoPA, closed rights requests within SLA, DPIA approvals, incident notification records.

### Security Manager
- **Responsibilities:** Security control implementation and evidence across frameworks (encryption, access control, monitoring, vulnerability management).
- **Goals:** Strong, evidenced control coverage that satisfies the maximum number of mapped requirements.
- **Daily activities:** Review control test results, triage assurance alerts, coordinate remediation with control owners.
- **Modules used:** Control Harmonization, Evidence Vault, Continuous Monitoring, Risk Register.
- **Expected outputs:** Passing automated control tests, closed security findings, current evidence.

### Compliance Manager
- **Responsibilities:** Day-to-day operation of specific framework assessments (e.g., SOC 2 cycle, ISO 27001 surveillance audit).
- **Goals:** Complete an assessment cycle on time with clean evidence and minimal rework.
- **Daily activities:** Track item-level status, chase control owners, review submitted evidence, prepare the assessment for sign-off.
- **Modules used:** Assessment Workspace, Evidence Vault, Tasks, Reporting.
- **Expected outputs:** Item completion, evidence sufficiency, assessment ready for approval.

### Control Owner
- **Responsibilities:** Implements and evidences specific assigned controls.
- **Goals:** Understand exactly what's expected, submit evidence once, avoid duplicate requests.
- **Daily activities:** Work through an assigned task queue, answer questions, upload evidence, respond to reviewer feedback.
- **Pain points removed:** Being asked for the same evidence repeatedly across frameworks (evidence reuse solves this directly).
- **Modules used:** Assessment Workspace (item-level), Evidence Vault, Tasks.
- **Expected outputs:** Submitted, sufficient evidence; closed assigned items.

### Evidence Reviewer
- **Responsibilities:** Validates that submitted evidence is sufficient, current, and correctly scoped before it counts toward a control's status.
- **Goals:** Accurate assessment of evidence quality without becoming a bottleneck.
- **Daily activities:** Review evidence queue, approve/reject with rationale, flag staleness or scope mismatch.
- **Modules used:** Evidence Vault, Assessment Workspace.
- **Expected outputs:** Reviewed evidence with documented sufficiency decisions.

### Auditor (internal or external)
- **Responsibilities:** Independently tests control design and operating effectiveness, raises findings.
- **Goals:** Efficient, well-evidenced, traceable testing without needing to chase the organization for basic artifacts.
- **Daily activities:** Work the auditor portal — request list, evidence review, sampling, annotation, findings.
- **Modules used:** Audit, Evidence Vault (read/scoped), Reporting.
- **Expected outputs:** Completed test procedures, findings with evidence citations, signed audit report.

### Executive
- **Responsibilities:** Understands enterprise risk and compliance posture to guide investment and represent the organization to the board.
- **Goals:** A concise, trustworthy, comparable view of posture and trend — not raw operational detail.
- **Daily activities (periodic, not daily):** Review executive dashboards and board-ready reports.
- **Modules used:** Reporting, Analytics.
- **Expected outputs:** Consumption of executive reports; investment/prioritization decisions.

### SME (Subject Matter Expert)
- **Responsibilities:** Provides domain expertise (legal, technical, regulatory) for mapping review, question review, and complex questionnaire responses.
- **Goals:** Efficient, well-routed review requests limited to genuinely ambiguous items.
- **Daily activities:** Review flagged mappings, approve/reject AI-suggested content, respond to routed questionnaire items.
- **Modules used:** Control Harmonization (review queue), AI Governance, Vendor/Questionnaire workflows.
- **Expected outputs:** Approved mappings, approved AI-assisted content, resolved questionnaire items.

### Legal Reviewer
- **Responsibilities:** Reviews and approves regulatory interpretation, particularly mapping rationale and jurisdiction-specific privacy content.
- **Goals:** No public-facing or audit-facing conclusion is published without appropriate legal sign-off.
- **Daily activities:** Review mapping approval queue, review RoPA/DPIA jurisdictional content, approve regulatory-impact assessments.
- **Modules used:** Control Harmonization, Privacy, Framework Updates.
- **Expected outputs:** Approved mappings and privacy content with documented legal rationale.

---

## 4. Complete Platform Modules

Each module below is described by its business purpose, not its internal implementation.

### Framework Library
- **Purpose:** House the authoritative, versioned content of every supported regulation/standard (13 initial frameworks, extensible).
- **Business value:** Removes the need for each customer to independently research and maintain regulatory text; guarantees every citation is traceable to a specific source and version.
- **Inputs:** Raw regulatory/standard content (spreadsheets, official text, framework packs).
- **Outputs:** Published, versioned, citable framework requirements available for mapping and assessment.
- **Dependencies:** Feeds Control Harmonization and Assessment Workspace.
- **Example:** A customer enables "ISO 27001:2022" — the library exposes every Annex A control with citation and effective date, ready to map.

### Control Harmonization
- **Purpose:** Maintain the reusable control library and the many-to-many mappings between framework requirements and harmonized controls.
- **Business value:** This is where duplicate effort is actually eliminated — one control can satisfy requirements from GDPR, ISO 27001, and SOC 2 simultaneously.
- **Inputs:** Published framework requirements; SME/legal mapping review decisions.
- **Outputs:** Approved, versioned mapping sets with coverage/confidence ratings; visibility into unique (unmapped) obligations.
- **Dependencies:** Consumes Framework Library; feeds Assessment Workspace, AI Governance (question generation), Reporting.
- **Example scenario:** A GRC admin maps "Multi-Factor Authentication" (harmonized control) to GDPR Art. 32, HIPAA §164.312(d), SOC 2 CC6.1, and ISO 27001 A.9.4.2 — each with its own coverage/confidence rating and a legal reviewer's sign-off.

### Assessment Workspace
- **Purpose:** The operational heart of the platform — where scoped, time-bound compliance evaluations actually happen.
- **Business value:** Converts the abstract "are we compliant?" question into a structured, ownable, closable body of work.
- **Inputs:** Scope decisions (frameworks, business units, systems, jurisdictions, period); pinned control/mapping/question versions; owner assignments.
- **Outputs:** Item-level status, findings, evidence, sign-offs, a reportable readiness position.
- **Dependencies:** Consumes Framework Library, Control Harmonization, AI Governance (questions); feeds Evidence Vault, Risk Register, Tasks, Reporting, Audit.
- **Example:** GRC Manager creates a "Q3 SOC 2 + ISO 27001 Renewal" assessment scoped to the production business unit; the workspace instantiates every applicable control with its questions ready for owners.

### Evidence Vault
- **Purpose:** Centralized, scoped, reusable repository for every artifact that proves a control is operating.
- **Business value:** Eliminates duplicate evidence requests across frameworks and preserves a defensible chain of custody.
- **Inputs:** Uploaded files, links, automated connector observations, attestations.
- **Outputs:** Reviewed, dated, classified evidence available for reuse across every mapped control.
- **Dependencies:** Feeds Assessment Workspace, Risk Register (closure proof), Reporting (audit packages), Continuous Monitoring.
- **Example:** A single "Q3 access review export" is uploaded once and reused to satisfy the access-review question in SOC 2, ISO 27001, and NIST assessments, provided scope/period checks pass.

### Risk Register
- **Purpose:** Track findings, enterprise risks, treatment plans, and formal risk acceptance.
- **Business value:** Converts raw gaps into governed, owned, risk-rated work with a defensible acceptance trail where remediation isn't chosen.
- **Inputs:** Findings from assessments, automated tests, or audits.
- **Outputs:** Risk-rated remediation plans, residual risk positions, formal acceptances with expiry and review.
- **Dependencies:** Consumes Assessment Workspace and Evidence Vault (test failures); feeds Tasks, Reporting.

### Tasks
- **Purpose:** Universal work-assignment layer — due dates, reminders, escalation, and completion tracking for every actionable item in the platform.
- **Business value:** Nothing falls through the cracks; overdue high-risk items are visible before they become audit findings.
- **Inputs:** Assignments generated from assessments, findings, evidence requests, access reviews, policy reviews.
- **Outputs:** Completed/approved work items; escalation records for anything overdue.

### Reporting
- **Purpose:** Generate every audience-specific output — executive, framework-specific, gap, evidence, and full audit packages — in PDF and Excel.
- **Business value:** Turns the compliance graph into board-ready and auditor-ready deliverables without manual reconstruction.
- **Inputs:** Frozen assessment snapshots, evidence, findings, mappings.
- **Outputs:** Signed, versioned PDF/Excel reports.

### AI Governance
- **Purpose:** Manage every AI-assisted capability (question generation, evidence classification, gap summaries, mapping suggestions, questionnaire drafting) under a strict human-approval model.
- **Business value:** Delivers the speed of AI assistance without accepting the risk of an ungoverned system silently altering compliance conclusions.
- **Inputs:** Approved harmonized controls, tenant scope, retrieval sources.
- **Outputs:** Draft content routed for human review; once approved, an immutable, reproducible version.

### Integrations
- **Purpose:** Connect to identity, cloud, SIEM, ticketing, storage, HR, and other systems to automate evidence collection and continuous testing.
- **Business value:** Moves evidence from "manually gathered once a year" to "continuously observed."
- **Inputs:** Connector credentials/scopes, sync schedules.
- **Outputs:** Normalized evidence with full provenance; automated test results.

### Privacy
- **Purpose:** First-class operational privacy management — data inventory, RoPA, DPIA, rights requests, consent, incidents, and retention/deletion.
- **Business value:** Privacy obligations are executed as real workflows with SLAs and evidence, not static documents.
- **Outputs:** Rights-request resolutions, DPIA approvals, incident notifications, verified deletions.

### Audit
- **Purpose:** Manage the full lifecycle of an audit engagement, internal or external, using the same evidence lineage as day-to-day compliance work.
- **Business value:** Removes the "audit fire drill" — request lists, testing, and findings draw on evidence that already exists and is already reviewed.

### Administration
- **Purpose:** Tenant, workspace, user, role, and permission management.
- **Business value:** Correct, least-privilege access as the organization scales and reorganizes.

### Analytics
- **Purpose:** Cross-cutting dashboards — coverage, reuse, freshness, test health, risk, remediation, and trend.
- **Business value:** Gives every persona a lens sized to their decision — an executive gets trend and comparison; a control owner gets a task queue.

### Trust Center
- **Purpose:** Publish approved security/privacy posture artifacts to customers and prospects under gated, audited access.
- **Business value:** Reduces the burden of repeated customer security questionnaires by giving verified requesters self-service access to current, approved artifacts.

### Vendor Management
- **Purpose:** Track third parties, tiering, due diligence, questionnaires, monitoring, findings, and renewal.
- **Business value:** Extends the same harmonized-control and evidence discipline to third-party risk, which is itself a mapped obligation in most frameworks.

### Policy Management
- **Purpose:** Draft, review, approve, publish, and track attestation of organizational policies, mapped to the controls they support.
- **Business value:** Policies stop being static PDFs — they become versioned, control-linked, attestation-tracked artifacts.

### Continuous Monitoring
- **Purpose:** Run automated control tests against connected systems and detect drift, failure, or expired evidence between formal assessment cycles.
- **Business value:** Converts compliance from a point-in-time exercise into an always-current state.

### Framework Updates
- **Purpose:** Manage new framework versions — diffing, impact analysis, and required reassessment of affected controls, evidence, and assessments.
- **Business value:** Regulatory change becomes a tracked, routed workflow instead of an ad hoc scramble.

### Question Generation
- **Purpose:** AI-assisted, human-approved generation of assessment questions from approved harmonized controls and mapped clauses.
- **Business value:** Removes the manual burden of authoring assessment questionnaires from scratch for every framework, while keeping a human gate on what actually gets asked.

---

## 5. Customer Onboarding Workflow

What happens, step by step, when a new enterprise customer purchases Cybernara:

1. **Tenant creation.** A dedicated private-cloud tenant is provisioned with its own isolation boundary, encryption key, and regional placement.
2. **Identity setup.** The customer's SSO/identity provider is connected; initial platform admin and tenant admin accounts are established with phishing-resistant MFA.
3. **Organization setup.** The tenant admin defines the organizational structure: business units, workspaces, and delegated administration boundaries that mirror how the company actually operates (e.g., "EU Operations," "US Healthcare Division").
4. **Systems and assets.** Relevant systems, applications, and data-bearing assets are registered, each with an owner and criticality rating — this becomes the scoping surface for future assessments.
5. **Users, roles, and permissions.** Employees are provisioned (directly or via SCIM sync), assigned roles (GRC admin, control owner, privacy officer, etc.), and — where applicable — delegated administration is set up for individual business units.
6. **Jurisdictions.** Relevant jurisdictions are declared (e.g., EU, California, India, Saudi Arabia) so privacy and framework applicability logic has the context it needs.
7. **Framework enablement.** The tenant admin enables the frameworks relevant to the business (e.g., GDPR + SOC 2 + ISO 27001), each pinning a specific published version.
8. **Initial configuration.** Evidence rules, notification preferences, and workflow defaults are set (or left as sensible platform defaults).
9. **Expected output of onboarding:** A fully structured tenant — organization, systems, users, jurisdictions, and enabled frameworks — ready for the GRC team to scope its first assessment.

---

## 6. Framework Content Lifecycle

How regulatory/standard content actually enters and matures inside the platform:

1. **Raw framework intake.** A source package (official text, spreadsheet, or API feed) is received and quarantined pending validation.
2. **Validation.** The content is checked for completeness, duplication, and structural correctness; a dry-run report shows what would be accepted, rejected, or flagged as changed.
3. **Normalization.** Accepted content is standardized into the platform's canonical requirement structure (citation, text, category, applicability rules, effective dates).
4. **Versioning.** The normalized content becomes a new, immutable framework version — never overwriting the prior version.
5. **Mapping.** GRC/SME staff map the new or changed requirements to harmonized controls, assigning coverage and confidence.
6. **Review.** A second reviewer (four-eyes principle) validates each mapping; the original mapper cannot self-approve.
7. **Approval.** Legal/SME sign-off is captured for mappings requiring regulatory interpretation.
8. **Publishing.** The reviewed, approved content pack is signed and published as the new active version, with atomic rollback available if a defect is found.
9. **Change management / impact analysis.** Publishing a new version automatically identifies every affected control, evidence expectation, active assessment, and report that referenced the prior version.
10. **Version pinning.** Assessments already in progress remain pinned to the version they started with; only newly created assessments use the new version by default.
11. **Relationship to assessments.** This lifecycle is what makes "the framework changed mid-audit" a manageable, visible event rather than a silent inconsistency.

---

## 7. Harmonization Workflow

The chain that makes multi-framework reuse real:

```
13 Frameworks → Requirements → Mapped Controls → Sub-controls → Reusable Controls → Evidence → Assessment
```

- **One-to-many:** A single harmonized control (e.g., "Encryption of Data at Rest") can satisfy requirements from many frameworks simultaneously.
- **Many-to-many:** A single framework requirement may need more than one harmonized control to be fully satisfied (e.g., a broad "access governance" clause might require both MFA and periodic access review controls).
- **Coverage:** Each mapping states whether the harmonized control fully, partially, or does not satisfy the specific requirement's wording.
- **Confidence:** Each mapping carries a confidence rating reflecting how directly the control objective matches the requirement's intent — lower confidence routes to SME/legal review.
- **Applicability:** Even a well-mapped control may not apply to every scope (e.g., a jurisdiction-specific clause only applies where that jurisdiction's data is processed).
- **Traceability:** Every harmonized control retains a visible list of every requirement it satisfies, and every requirement shows every control that maps to it — including any requirement left explicitly **unique** (unmapped, standalone) where no reuse is possible.

This is the mechanism that lets the platform honestly say "one piece of evidence closes five obligations" instead of overstating coverage.

---

## 8. Assessment Lifecycle

Every stage of a compliance assessment, and the business rule governing each transition:

1. **Create Assessment** — GRC Manager defines name, purpose, and target completion period.
2. **Scope** — Business units, systems, jurisdictions, data categories, and vendors in scope are selected. *Rule: scope must be approved before it becomes an immutable snapshot.*
3. **Framework selection** — One or more enabled frameworks (and their pinned versions) are attached to the assessment.
4. **Question generation** — Approved question sets (curated or AI-generated-then-approved) are instantiated for every in-scope control. *Rule: question versions freeze at instantiation and remain reproducible even if the master question set later changes.*
5. **Assignments** — Each control/requirement instance is assigned an owner with a due date.
6. **Control execution** — Owners implement/confirm the control and answer assigned questions.
7. **Evidence upload** — Owners attach evidence (new or reused) to support their answers.
8. **Review** — A separate reviewer validates answers and evidence sufficiency. *Rule: preparer and reviewer must be different people (separation of duties).*
9. **Gap detection** — Any control that fails review, lacks sufficient evidence, or is marked ineffective automatically becomes a finding.
10. **Risk** — Findings are risk-rated and, where relevant, escalated to the enterprise risk register.
11. **Remediation** — Owners execute remediation plans against defined SLAs.
12. **Approval** — Authorized reviewers sign off that all required items are complete and remediation is either closed or formally accepted as residual risk.
13. **Report** — A frozen snapshot generates the readiness/audit report.
14. **Closure** — The assessment is marked closed; its snapshot becomes part of permanent, immutable history.
15. **Reopen** — Only an authorized reviewer can reopen a closed item or assessment, and only with a documented reason — creating a full audit event.

---

## 9. User Workflow (Role-by-Role Daily Operation)

- **GRC Manager:** Opens the readiness dashboard → reviews overdue items across all active assessments → reassigns or escalates as needed → prepares a status summary for the next executive review.
- **Control Owner:** Opens their task queue → works through assigned questions → for each, either reuses existing evidence (system suggests eligible reuse candidates) or uploads new evidence → submits for review → responds to reviewer feedback if returned as "needs changes."
- **Evidence Reviewer:** Opens the evidence review queue → checks freshness, scope match, and period match for each submission → approves or rejects with rationale → flagged rejections automatically notify the control owner.
- **Privacy Officer:** Reviews open rights requests against SLA countdowns → triages new DPIA triggers → reviews retention/deletion exceptions awaiting approval.
- **Auditor:** Logs into the scoped auditor portal → works the request list → reviews evidence and annotations → raises findings directly into the shared findings/risk model → the organization sees and responds to findings in the same workflow used for internal ones.
- **Executive:** Opens the executive dashboard periodically (not daily) → reviews readiness by framework, risk trend, and remediation velocity → uses board-ready report exports for governance meetings.

Notifications, reminders, and escalations are woven through every role above: an approaching due date reminds the owner; an overdue item after a grace period escalates to the owner's manager and appears on the GRC Manager's dashboard; a high-risk finding triggers immediate notification regardless of due date.

---

## 10. Evidence Lifecycle

1. **Creation** — Evidence originates either from manual upload/link/attestation, or from an automated connector observation (e.g., a cloud configuration snapshot).
2. **Upload** — The artifact is captured with owner, scope, period, classification, and source.
3. **Validation** — The item is quarantined until integrity/malware validation completes; it is not visible or usable until this clears.
4. **Review** — A reviewer assesses sufficiency: is it current, correctly scoped, and does it actually demonstrate what's being asked?
5. **Mapping** — Once approved, the evidence is linked to every control/requirement it can legitimately support.
6. **Reuse** — When a different control or a different framework needs comparable proof, the system checks scope, period, and freshness before suggesting reuse — it does not allow blind reuse of stale or mismatched evidence.
7. **Versions and history** — Superseding evidence creates a new version rather than overwriting; the full history remains visible.
8. **Expiry** — Evidence carries a validity period; approaching or passed expiry triggers a refresh request to the owner.
9. **Approval** — Formal sign-off that a specific piece of evidence satisfies a specific control instance for a specific assessment period.
10. **Archive** — Superseded or period-closed evidence is retained (not deleted) for historical reproducibility, subject to retention policy and legal hold.
11. **In reports** — Reports reference the specific evidence version used at report-generation time, preserving a defensible trail even after the evidence is later updated.

---

## 11. AI Workflow

Cybernara's AI features are designed around one non-negotiable rule: **AI drafts; humans decide.**

- **Question generation:** Draft assessment questions are generated from *approved* harmonized controls and their mapped clauses, using only tenant-appropriate, retrieved source material — never invented from general model knowledge.
- **Evidence classification:** AI suggests what an uploaded artifact appears to demonstrate and which controls it may satisfy — a reviewer confirms or overrides.
- **Gap summaries:** AI can summarize open gaps in plain language for executive consumption; the underlying data (not the summary) remains the system of record.
- **Mapping suggestions:** AI proposes candidate requirement-to-control mappings with a confidence score; every suggestion enters the same four-eyes mapping review queue as a human-authored mapping.
- **Regulatory comparison:** When a framework version changes, AI can draft a plain-language diff summary to accelerate human impact review.
- **Human review / approval workflow:** Nothing AI produces becomes active or authoritative until a named reviewer approves it — this applies uniformly across question sets, mappings, evidence classifications, and questionnaire responses.
- **Prompt governance and versioning:** Every prompt used is itself versioned, so that any AI-assisted output can be traced back to exactly which prompt, model, and source material produced it.
- **AI limitations:** AI cannot publish, score, approve, or accept risk. If the underlying AI service is unavailable, the platform falls back to curated, pre-approved content so that assessment work is never blocked.
- **Auditability:** Every AI-assisted output carries full provenance — what was retrieved, what was generated, what was checked, and who approved it — so an auditor can independently verify how a question or suggestion came to exist.

---

## 12. Risk Workflow

1. **Finding creation** — A finding originates from a failed assessment item, a failed automated test, or an auditor's independent test.
2. **Risk creation** — Significant findings are escalated into the enterprise risk register as formal risks.
3. **Severity, likelihood, impact** — Each risk is scored using the organization's configured risk model.
4. **Mitigation** — A treatment plan (mitigate, transfer, avoid, accept) is defined with an owner and due date.
5. **Residual risk** — After treatment, the remaining risk level is recorded distinctly from the original inherent risk.
6. **Risk acceptance** — Where remediation is not pursued, a formal, time-bounded acceptance is recorded with an approver and rationale — acceptance is never implied by simple inactivity.
7. **Review** — Accepted risks are periodically reviewed before their acceptance expires; expired acceptances must be renewed or resolved.
8. **Closure** — Once mitigated and verified, the risk is closed with evidence of the fix.
9. **Reporting** — Risk trend, distribution, and high-risk exposure feed directly into executive dashboards and reports.

---

## 13. Task Workflow

- **Assignment:** Every actionable item (question response, evidence request, remediation step, policy review, access-review decision) becomes a task with a named owner.
- **Notifications:** Owners are notified on assignment and on approaching due dates.
- **Due dates:** Set based on the assessment timeline, SLA policy, or finding severity.
- **Escalations:** Overdue tasks escalate automatically — first as a reminder, then to the owner's manager or the GRC Manager if still unresolved.
- **Review:** Completed tasks that require sign-off move to a reviewer queue.
- **Completion:** Marked complete only once required outputs (e.g., evidence, an answer, a remediation confirmation) are actually attached.
- **Approval:** Certain tasks (final assessment sign-off, risk acceptance) require a distinct approver from the person who completed the work.
- **Reopening:** Requires an authorized actor and a documented reason, and is fully logged.

---

## 14. Reporting Workflow

- **Executive reports:** Concise, board-ready summaries of posture, risk, and trend across the enterprise.
- **Framework reports:** Applicable requirements, mapped controls, status, evidence, and residual gaps for a specific framework.
- **Gap reports:** Severity-ranked open gaps with owners and remediation status.
- **Evidence reports:** Full evidence inventory for a scope/period, useful for internal review or handoff.
- **Audit packages:** A complete, exportable bundle of evidence, mappings, citations, and conclusions for a specific audit engagement.
- **Readiness dashboards:** Live view of current standing per framework/business unit.
- **Trend analysis:** Historical comparison of posture, remediation velocity, and evidence freshness over time.
- **Output formats:** PDF for circulation/signing; Excel for working registers and offline filtering.
- **Historical snapshots:** Every report is generated from a frozen assessment snapshot, so regenerating the same report later — even after the underlying content has since changed — produces an identical, reproducible result.

---

## 15. Audit Workflow

1. **Preparation** — The audit scope, period, and framework(s) are defined; relevant historical assessment snapshots are identified.
2. **Fieldwork** — The auditor (internal or external) is granted scoped, time-limited access to the relevant assessment and evidence.
3. **Evidence collection** — The auditor reviews existing evidence and requests any additional items via the same request-list mechanism used internally.
4. **Control testing** — The auditor performs independent testing (including sampling where relevant) and records results.
5. **Findings** — Any deficiency identified becomes a finding in the same shared findings model used elsewhere in the platform.
6. **Remediation** — Findings route to the standard remediation workflow with owners and SLAs.
7. **Closure** — Once remediation is verified (or formally accepted as residual risk), the audit engagement closes.
8. **Audit package generation** — A complete, signed export bundles every relevant citation, mapping, evidence item, and conclusion.
9. **External auditor experience** — External auditors interact through a dedicated, read-mostly portal scoped strictly to their engagement, with every access and download logged.

---

## 16. Regulatory Update Workflow

1. **Framework version change** — A new version of a framework (e.g., ISO 27001:2022 superseding :2013) is imported and published following the Framework Content Lifecycle.
2. **Diffing** — The platform computes exactly what changed: new, removed, or reworded requirements.
3. **Impact analysis** — Every affected harmonized control, mapping, active assessment, piece of evidence, and report referencing the old version is identified.
4. **Affected controls / evidence / assessments** — These are surfaced in a change-impact queue routed to accountable owners.
5. **Required reassessment** — Where a change is material, the relevant control instances are flagged for reassessment in the next cycle (existing closed assessments remain untouched and reproducible).
6. **Notifications** — Owners, GRC Managers, and — where legal interpretation is involved — Legal Reviewers are notified of pending impact-review work.

---

## 17. Integration Workflow

- **Identity:** SSO/SCIM integrations provide user lifecycle and access evidence directly, removing manual access-review data collection.
- **Cloud (AWS/Azure/GCP):** Configuration and posture signals feed automated control tests (e.g., encryption settings, network configuration).
- **SIEM:** Security event and monitoring data supports control evidence and continuous assurance.
- **Ticketing (Jira/ServiceNow):** Remediation tasks and approvals can synchronize with existing engineering/IT workflows rather than forcing a second system of record.
- **Storage (SharePoint/Drive/S3):** Existing policy and evidence documents can be referenced or ingested directly.
- **HR/HRIS:** Employee lifecycle data supports access reviews and policy attestation population accuracy.
- **Connectors generally:** Each integration is scoped to least-privilege access, monitored for health, and reconciled periodically to catch missed or drifted data — evidence collected this way carries full provenance (source, external ID, and observation time).
- **Automation and continuous monitoring:** Once connected, these integrations power scheduled automated tests and drift/staleness alerts rather than one-time imports.

---

## 18. End-to-End Enterprise Journey — ABC Bank

*A walkthrough of a fictional mid-market bank adopting Cybernara, from purchase through continuous compliance.*

**Day 0 — Purchase and provisioning.** ABC Bank signs on for private-cloud deployment. Cybernara provisions a dedicated tenant in ABC's chosen region, connects to ABC's Okta tenant for SSO, and creates the first Tenant Admin and Platform Admin accounts.

**Week 1 — Configuration.** ABC's Tenant Admin defines three workspaces — Retail Banking, Digital Payments, and Corporate IT — each with its own delegated administration. Systems (core banking platform, mobile app backend, internal HR system) and their owners are registered. Jurisdictions are set to United States (federal) and California, reflecting where ABC operates and where its customers reside.

**Week 2 — Framework onboarding.** ABC enables SOC 2, GDPR is skipped (no EU operations), CCPA/CPRA is enabled (California customers), and NIST SP 800-53 is enabled for a regulator-driven requirement. Each framework pins its currently published version. The Control Harmonization library already contains mappings between these frameworks' overlapping obligations (e.g., encryption, access control, incident response), so ABC does not start from zero.

**Week 3 — First assessment.** ABC's GRC Manager creates "SOC 2 Type II — FY26" scoped to Digital Payments and Corporate IT. Applicability rules plus a manual review determine that 140 harmonized controls are in scope. Approved question sets are instantiated for each. Owners across engineering, security, and HR are assigned.

**Weeks 4–10 — Control execution.** Control owners work their task queues. The encryption-at-rest control owner uploads one KMS configuration export; the system flags it as reusable evidence for both the SOC 2 CC6.1 requirement and the CCPA reasonable-security-measures requirement, since both map to the same harmonized "Encryption of Data at Rest" control with matching scope and period. Evidence reviewers validate freshness and sufficiency. Two items are returned "needs changes" because uploaded evidence predates the assessment period.

**Week 8 — Gap and remediation.** The MFA control for a legacy admin console fails testing — enrollment records show gaps for two privileged accounts. This becomes a finding, escalated to a risk with "High" severity given privileged access exposure. A remediation task is assigned to Corporate IT with a two-week SLA. Because it's high-risk, it also appears immediately on the GRC Manager's dashboard, without waiting for the normal escalation window.

**Week 10 — Remediation and closure.** The finding is remediated (both accounts are re-enrolled in phishing-resistant MFA), verification evidence is attached, and the risk is closed.

**Week 11 — Review and approval.** All required items reach "Approved" status; the designated final reviewer — distinct from any preparer — signs off on the assessment.

**Week 12 — Report and audit.** A frozen assessment snapshot generates the SOC 2 readiness report (PDF for leadership, Excel for the working audit team). ABC's external SOC 2 auditor is granted scoped auditor-portal access; they review the same evidence lineage, perform independent sampling, and raise zero additional findings, since the internal review already surfaced and closed the MFA gap.

**Month 4 onward — Continuous compliance.** Automated connectors continue testing cloud configuration and identity posture monthly. When NIST SP 800-53 publishes a content update mid-year, the impact-analysis workflow identifies twelve affected control instances across ABC's active assessments; owners are notified, and the affected items are queued for the next assessment cycle rather than silently left stale.

**Day 365 — Renewal.** ABC's next SOC 2 cycle begins. Because evidence, mappings, and control history persisted continuously rather than being rebuilt from scratch, the renewal assessment starts from a materially stronger baseline than Day 0 — most controls already have current, reusable evidence, and the only new work is what genuinely changed.

---

## 19. Data Flow

The core information chain that runs through every workflow described above:

```
Framework → Requirement → Mapping → Harmonized Control → Question → Answer → Evidence → Finding → Risk → Task → Report
```

- A **Framework** publishes versioned **Requirements** (citable obligations).
- Requirements are connected via **Mapping** to one or more **Harmonized Controls** (with coverage/confidence).
- Each in-scope Harmonized Control, once an assessment is created, generates a **Question** (approved, versioned).
- A Control Owner provides an **Answer**, supported by **Evidence** (new or reused).
- Where an Answer/Evidence combination fails review or automated testing, a **Finding** is created.
- Significant Findings become a **Risk**, scored and treated.
- Risk treatment and Finding remediation generate **Tasks** with owners and due dates.
- Every stage above — from Framework to Task — feeds the **Report** layer, which freezes a point-in-time snapshot for audit-ready output.

This chain is what allows the platform to answer, for any control in any report: *which law required this, what control satisfies it, who did the work, what proves it, and who approved it* — without leaving any step to informal memory or a side spreadsheet.

---

## 20. Workflow Validation

| Workflow | Expected outcome | Business rules | Failure / recovery |
|---|---|---|---|
| Framework onboarding | Content published with full traceability | Every requirement accepted or explicitly rejected with reason | Rejected records generate an error report for remediation, not silent drops |
| Harmonization mapping | Coverage-rated, approved mapping | Four-eyes review; author ≠ approver | Low-confidence or conflicting mappings route to SME/legal review before publication |
| Assessment scoping | Immutable, approved scope snapshot | Approval required before pinning | Scope changes after approval require a new version, not an in-place edit |
| Control execution | Sufficient, current, correctly scoped evidence | Preparer ≠ reviewer | Insufficient evidence returns to owner as "needs changes," not silently marked complete |
| Gap/finding | Risk-rated finding with owner and SLA | Every finding traces to its source (assessment item, test, or audit) | Overdue high-risk findings escalate automatically |
| Risk acceptance | Time-bounded, approved acceptance | Acceptance requires a named approver and expiry, never implied by inactivity | Expired acceptances are flagged for renewal or resolution, not silently carried forward |
| Reporting | Reproducible frozen output | Reports render from a specific pinned snapshot | Re-rendering the same snapshot/template always produces a materially identical result |
| Regulatory update | Routed impact analysis | Every affected object (control, evidence, assessment, report) is identified before reassessment is required | Existing closed assessments are never retroactively altered by a new framework version |
| AI-assisted content | Approved, provenance-tracked output | Human approval required before activation | AI service unavailability falls back to curated content; assessment work is never blocked |

---

## 21. Feature Purpose Matrix

| Feature | Why it exists | Who uses it | Business value | Connected workflows |
|---|---|---|---|---|
| Framework Library | Single, versioned source of regulatory truth | GRC Admin, Legal Reviewer | Removes redundant regulatory research; guarantees citation traceability | Framework Content Lifecycle, Harmonization |
| Harmonized Controls | Eliminate duplicate control implementation across frameworks | GRC Manager, SME, Legal Reviewer | Direct reduction in duplicate compliance effort | Harmonization, Assessment Lifecycle |
| Assessment Workspace | Structure compliance work into scoped, closable units | GRC Manager, Compliance Manager, Control Owner | Converts an abstract compliance goal into ownable, trackable work | Assessment Lifecycle, Tasks, Evidence |
| Evidence Vault | Store and reuse evidence safely across mapped controls | Control Owner, Evidence Reviewer | Cuts duplicate evidence requests; preserves defensible chain of custody | Evidence Lifecycle, Reporting, Audit |
| Risk Register | Govern findings and risk acceptance formally | Security Manager, GRC Manager | Prevents silent risk carry-forward; supports defensible risk decisions | Risk Workflow, Reporting |
| Tasks | Universal accountability layer | Every persona | Nothing falls through the cracks; overdue high-risk work is visible | All workflows |
| Reporting | Translate the compliance graph into audience-specific outputs | Executive, Auditor, GRC Manager | Board-ready and audit-ready output without manual reconstruction | Assessment Lifecycle, Audit |
| AI Governance | Accelerate drafting without ceding authoritative control | SME, GRC Admin | Speed of AI with human-approved integrity | Question Generation, Harmonization |
| Integrations | Automate evidence collection and continuous testing | Security Manager, Platform Admin | Moves compliance from periodic to continuous | Continuous Monitoring, Evidence Lifecycle |
| Privacy Module | Operationalize privacy law as workflows, not documents | Privacy Officer | Defensible, SLA-tracked privacy operations | Privacy workflows across DPIA, rights, incidents |
| Audit Module | Give auditors independent, evidence-linked access | Auditor | Efficient, well-evidenced testing without a fire drill | Audit Workflow |
| Vendor Management | Extend harmonized-control discipline to third parties | GRC Manager, Vendor Owner | Reduces third-party risk blind spots | Risk Workflow, Evidence Reuse |
| Policy Management | Version and track policy attestation against mapped controls | Compliance Manager | Policies become active, traceable artifacts | Enterprise GRC, Reporting |
| Continuous Monitoring | Detect drift and staleness between formal cycles | Security Manager | Keeps posture current, not just point-in-time | Integrations, Risk Workflow |
| Trust Center | Reduce repeated customer security-questionnaire burden | Executive, Sales/Trust teams | Faster customer assurance cycles | Reporting, Vendor/Questionnaire workflows |
| Framework Updates | Manage regulatory change as a tracked workflow | Legal Reviewer, GRC Manager | Regulatory change stops being a surprise | Framework Content Lifecycle |

---

## 22. Complete Product Narrative

An enterprise arrives at Cybernara because the spreadsheet-and-email approach to compliance has stopped scaling: too many frameworks, too much duplicated evidence, too little confidence that anyone could defend the organization's posture to a regulator or auditor tomorrow if asked. On day zero, a private-cloud tenant is stood up, identity is connected through the customer's own SSO, and a tenant administrator begins shaping the platform around how the business actually operates — business units, systems, jurisdictions, and the people who will own the work. The organization enables the frameworks that actually apply to it, and because Cybernara treats regulatory content as versioned, citable, signed publications rather than something baked into the software, adding a framework is a configuration decision, not an engineering project. Underneath every enabled framework sits a harmonized control library, built once and reused everywhere a mapped obligation appears, so that implementing encryption or access control or incident response satisfies a dozen legal citations at once instead of a dozen separate, redundant efforts — while anything genuinely unique to one framework stays visible and is never quietly flattened away. A GRC manager scopes the organization's first assessment against real business units and systems, and the moment that scope is approved it is frozen: the exact framework version, the exact mapping version, the exact question set in play from that point forward, so that whatever conclusion is eventually reached can be reproduced, defended, and re-derived months or years later even after the underlying framework content has moved on. Control owners then take up a task queue that already knows what's expected of them, upload evidence once, and watch that same evidence get reused wherever it legitimately satisfies another mapped obligation elsewhere in the same assessment or a different framework entirely — with the system itself refusing reuse where scope, period, or freshness don't actually line up, rather than letting anyone overstate coverage. A reviewer distinct from the preparer checks each submission for sufficiency; anything short of that standard goes back with a reason rather than silently passing. Where a control genuinely fails — a legacy admin console missing multi-factor enrollment for two privileged accounts, say — the system doesn't let that sit quietly: it becomes a finding, gets risk-rated given the privileged-access exposure, and lands with an owner and a deadline, escalating automatically if it's ignored. Where the organization chooses to accept residual risk rather than remediate immediately, that acceptance itself is a governed decision — named approver, documented rationale, an expiry date after which it must be revisited, never an implicit shrug. Throughout all of this, AI is quietly present but never in charge: it drafts assessment questions from approved controls, suggests where evidence might apply, and summarizes gaps into plain language for an executive audience, but every one of those outputs sits in a review queue until a named human approves it, and if the AI service goes dark entirely, the organization keeps working from a curated fallback rather than being blocked. When the assessment reaches completion, every required item closed or its residual risk formally accepted, an authorized reviewer signs off, and that sign-off freezes a snapshot from which board-ready PDF summaries and detailed Excel working registers are generated — the same snapshot an external auditor will later see when they're granted scoped, time-limited access to test the organization's own conclusions independently, working the same request list and evidence trail the internal team already built rather than starting an entirely parallel exercise. None of this stops the moment the report is signed: connected systems keep feeding automated tests and drift detection month over month, evidence quietly expires and gets flagged for refresh before anyone has to notice its staleness by accident, and when a regulator publishes a new version of a framework the organization relies on, the platform doesn't wait to be asked — it diffs the change, works out exactly which controls, evidence, and open assessments are affected, and routes that impact to the people accountable for it, while every assessment already closed under the old version stays exactly as it was, untouched and still fully reproducible. A year in, the organization's next audit cycle doesn't start from zero: the controls are already implemented, most of the evidence is already current and reusable, the mappings and their legal rationale are already reviewed and approved, and what's left is genuinely just what changed — which is, in the end, the entire point of building a harmonized, evidence-first, continuously assured compliance operating system instead of maintaining thirteen separate spreadsheets that nobody fully trusts.
