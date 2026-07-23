# Cybernara End-to-End Workflow — Corrected

*This corrects the version you provided against the Master PRD, GRC/Privacy PRD, Engineering Requirements, Architecture, and Schema Specification. Corrections from the original are marked **[FIXED]**.*

```
Customer Purchases Platform
        │
        ▼
Tenant Setup
        │
        ▼
Organization Configuration
        │
        ▼
Framework Enablement
        │
        ▼
Framework Harmonization
        │
        ▼
Assessment Creation
        │
        ▼
Question Generation
        │
        ▼
Control Assessment
        │
        ▼
Evidence Collection  [FIXED: now shows quarantine/scan gate]
        │
        ▼
Review & Approval  [FIXED: now states preparer ≠ reviewer]
        │
        ▼
Gap Analysis
        │
        ▼
Risk & Remediation  [FIXED: acceptance is policy-based, not "Executive-only"]
        │
        ▼
Audit-Ready Report  [FIXED: now states frozen/signed snapshot]
        │
        ▼
Continuous Monitoring
        │
        ▼
Framework Updates
        │
        ▼
Next Assessment Cycle
```

---

## Phase 1 — Customer Onboarding

**Goal:** Prepare the organization.

User logs in for the first time and configures:

- Organization
- Business units
- Departments
- Systems / applications
- Cloud accounts
- Assets
- Users
- Roles
- Jurisdictions
- Frameworks (selected here, enabled in Phase 2)

**Result:** Tenant becomes operational.

---

## Phase 2 — Framework Library

The company enables frameworks. **[FIXED]** The Master PRD's actual initial scope is **11 frameworks**, not the list originally given (which incorrectly included PCI DSS and omitted two real ones):

- GDPR
- DPDP Act and Rules
- CCPA/CPRA
- **Saudi PDPL** *(missing from original list)*
- HIPAA
- SOC 2
- ISO 27001
- NIST SP 800-53
- Essential Eight
- CMMI
- **ISO 9001** *(missing from original list)*

*PCI DSS is not part of Cybernara's initial framework scope; the architecture is designed so it — or any future framework — could be added later as a content pack, but it isn't in the current library.*

Each framework contains:

- Requirements
- Controls / sub-controls
- Clauses / articles
- Categories
- Applicability rules

Nothing is editable. Everything is versioned (e.g. ISO 27001 v2022, SOC 2 v2026).

---

## Phase 3 — Control Harmonization

The heart of the platform. Instead of asking "what does GDPR require, what does SOC 2 require, what does HIPAA require" separately, the platform asks: **"what common control satisfies all three?"**

```
GDPR Art. 32
        │
HIPAA §164.312
        │
SOC 2 CC6
        │
ISO 27001 A.8
        │
──────────────
   mapped to
──────────────
Encryption at rest
```

One implementation → one evidence artifact → coverage across multiple frameworks.

**[FIXED — added, missing from original]** Every mapping carries a **coverage** rating (full/partial/none) and a **confidence** rating, and is reviewed under a four-eyes rule: the person who proposes a mapping cannot be the person who approves it. Low-confidence or conflicting mappings route to SME/legal review before they can be published.

---

## Phase 4 — Assessment Creation

User clicks **Create Assessment** and selects:

- Assessment name
- Frameworks
- Business units / applications / cloud accounts / systems
- Time period
- Owners

The platform then freezes:

- Framework version
- Mapping version
- Question version

Nothing changes during the life of this assessment — this is **version pinning**, a core architectural principle that guarantees the assessment's conclusions remain reproducible even after the underlying framework, mapping, or questions are later updated.

---

## Phase 5 — Control Resolution

The platform calculates, for the selected frameworks:

```
Selected frameworks
        │
        ▼
Mapped requirements  (covered by a shared harmonized control)
        │
        ▼
Unique requirements  (no reuse possible — framework-specific obligation)
        │
        ▼
Applicability decision  (included / excluded, with rationale + approver)
        │
        ▼
Actual harmonized controls to implement
```

**[FIXED — the original's arithmetic example was misleading.]** The original said "SOC 2 (120) + ISO (150) + GDPR (80) = 350 requirements; overlap = 180; unique = 170; therefore 170 + 180 = 350, but 180 only answered once." This conflates *requirement count* with *harmonized control count* and doesn't actually show where the savings come from. A more accurate framing:

> 350 total requirements across the three frameworks map down to a much smaller set of distinct **harmonized controls** — for example, 90 harmonized controls might satisfy all 350 requirements between them, because many requirements from different frameworks map to the same control (encryption, access control, incident response, etc.), while some requirements remain unique and get their own dedicated control. The organization implements and evidences ~90 controls instead of separately satisfying 350 requirements — that's the actual reduction in work, and it's driven by the mapping's coverage/confidence data, not by a simple overlap count.

**[FIXED — added, missing from original]** Every inclusion or exclusion decision at this stage requires a documented rationale and an approver — applicability is never a silent default.

---

## Phase 6 — Question Generation

Every harmonized control in scope becomes an assessment question set.

**Example — control: Password Policy**
- Do employees use MFA?
- Upload password policy.
- How often is it reviewed?
- What evidence supports this?

Questions may be manual, AI-generated, or previously approved/reused, and can carry framework-specific variants. **AI cannot publish a question directly — every AI-generated question requires human review and approval before it becomes part of an active assessment.** Once approved, the question version is immutable and reproducible.

---

## Phase 7 — Assessment Workspace

Control Owner opens their dashboard and sees assigned controls, pending items, due dates, priority, and required evidence.

```
Open control
        │
        ▼
Answer questions
        │
        ▼
Upload evidence
        │
        ▼
Submit  →  status becomes "Submitted"
```

---

## Phase 8 — Evidence Management

Evidence is stored centrally (password policy PDF, IAM screenshot, firewall config, risk register export, training record, etc.).

**[FIXED — added, missing from original]** Before anything else happens, uploaded evidence is **quarantined and scanned**; it is not visible or usable by anyone until integrity/malware validation completes.

Once cleared, the platform checks:

- Is it expired?
- Correct owner?
- Correct system/scope?
- Applicable to this control?
- Has it already been used elsewhere and does it still match scope, period, and freshness?

If all checks pass, the evidence is **reused** rather than re-collected:

```
One evidence item
        │
        ▼
Many controls
        │
        ▼
Many frameworks
```

The platform will *not* allow reuse where scope, period, or freshness don't genuinely match — it warns rather than silently overstating coverage.

---

## Phase 9 — Reviewer Workflow

```
Pending evidence
        │
        ▼
Review
        │
        ▼
Approve  /  Needs changes
```

If rejected, the owner is notified, uploads better evidence, and the reviewer approves.

**[FIXED — added, missing from original]** The reviewer must be a different person from whoever submitted the evidence or answer — separation of duties is enforced, not optional.

---

## Phase 10 — Findings

If evidence is missing or a control fails, the platform creates a **finding**, including:

- Severity
- Impact
- Likelihood
- Owner
- Due date

---

## Phase 11 — Risk

Some findings escalate into enterprise risks.

```
Finding
        │
        ▼
Risk
        │
        ▼
Mitigation plan
        │
        ▼
Residual risk
        │
        ▼
Approval
```

**[FIXED]** The original said "Executive can accept risk." The platform doesn't restrict risk acceptance to executives specifically — it requires a **named, authorized approver per the organization's risk policy** (commonly a CISO, GRC Manager, or designated risk owner, sometimes an executive for high severity). Critically, any acceptance is **time-bounded**: it carries an expiry date and must be formally reviewed and renewed or resolved before it lapses — it is never an implicit, indefinite "we've decided not to fix this."

Otherwise, remediation begins.

---

## Phase 12 — Task Management

Every action becomes a task: upload evidence, fix MFA, review policy, approve risk, perform audit.

```
Task
        │
        ▼
Owner
        │
        ▼
Due date
        │
        ▼
Escalation
        │
        ▼
Completion
```

---

## Phase 13 — Reporting

The platform generates:

- Executive dashboard (compliance %, risk summary, framework status, evidence coverage)
- Gap report
- Audit package

Output formats: PDF, Excel, dashboard, and snapshots.

**[FIXED — added, missing from original]** Every generated report is rendered from a **frozen, signed assessment snapshot**. Regenerating the same report later — even after frameworks, mappings, or templates have since changed — must produce a materially identical result. This reproducibility guarantee is what actually makes the output "audit-ready," not just the formatting.

---

## Phase 14 — Audit

Auditor joins and sees the assessment, evidence, controls, mappings, history, and approvals directly — they don't start by asking "send me your documents," because the evidence trail already exists.

```
Review
        │
        ▼
Test
        │
        ▼
Finding
        │
        ▼
Remediation
        │
        ▼
Closure
```

Auditor findings enter the same shared findings/risk model used internally — there isn't a separate audit-only tracking system.

---

## Phase 15 — Continuous Compliance

The assessment doesn't truly end at closure. The platform continuously checks connected systems — cloud, identity, EDR, SIEM, ticketing, HR — plus policy status and evidence expiry.

```
Change detected
        │
        ▼
Alert
        │
        ▼
Finding
        │
        ▼
Task
        │
        ▼
Remediation
```

---

## Phase 16 — Framework Update

Example: ISO 27001 publishes a 2027 edition.

```
Import
        │
        ▼
Diff against prior version
        │
        ▼
Changed controls / questions identified
        │
        ▼
Affected assessments identified
        │
        ▼
Notify accountable owners
        │
        ▼
Reassessment queued
```

No manual comparison is required — and, per the architecture's immutability guarantee, **assessments already closed under the prior version are never retroactively altered.** Only newly created or explicitly reopened assessments pick up the new version.

---

## Complete Corrected User Journey

```
Purchase platform
        │
        ▼
Create tenant
        │
        ▼
Configure organization
        │
        ▼
Enable frameworks (11 initial: GDPR, DPDP, CCPA/CPRA, PDPL,
        │            HIPAA, SOC 2, ISO 27001, NIST 800-53,
        │            Essential Eight, CMMI, ISO 9001)
        ▼
Import framework content (versioned, signed, immutable)
        │
        ▼
Harmonize controls (mapped, four-eyes reviewed, coverage/confidence rated)
        │
        ▼
Create assessment (scope approved)
        │
        ▼
Freeze framework / mapping / question versions
        │
        ▼
Generate assessment questions (AI draft → human approval)
        │
        ▼
Assign control owners
        │
        ▼
Answer questions
        │
        ▼
Upload evidence (quarantine → scan → reuse checks)
        │
        ▼
Evidence review (reviewer ≠ preparer)
        │
        ▼
Approve / needs changes
        │
        ▼
Findings
        │
        ▼
Risk register (rated, treated, or formally + time-boundedly accepted)
        │
        ▼
Remediation tasks
        │
        ▼
Revalidation
        │
        ▼
Assessment approval (sign-off distinct from preparer)
        │
        ▼
Signed, frozen audit report
        │
        ▼
Continuous monitoring (drift, expiry, connector alerts)
        │
        ▼
Framework updates (diff → impact analysis → routed reassessment)
        │
        ▼
Repeat assessment cycle ↻ (prior assessments remain untouched and reproducible)
```
