# Cybernara Manual Test Plan

A printable/checkable walkthrough of the real running app in a browser, covering F0–F7 and every
fix in `integration-fix-report.md`. All personas referenced by name are in
`manual-qa-credentials.md` (gitignored, not in this repo's history — ask whoever ran the
provisioning step for it).

## Setup

- [ ] From `cybernara-backend/`, run `npm run dev` (or let Playwright's `webServer` config start it
      — but for manual testing, run it yourself so it doesn't get torn down between sections).
      Confirm `http://localhost:3000/v1/health` responds before continuing.
- [ ] From `cybernara-frontend/`, run `npm run dev -- --hostname 127.0.0.1 --port 3100`.
- [ ] Open `http://127.0.0.1:3100` in a browser. Use a fresh Incognito/Private window per section
      if you're switching personas often — it's the easiest way to avoid stale session cookies
      from the previous persona bleeding into the next check.
- [ ] Keep `manual-qa-credentials.md` open in another window for copy-pasting emails/passwords.

---

## F0 — Auth

- [ ] **Protected route while logged out.** In a fresh/incognito window, go directly to
      `http://127.0.0.1:3100/audit`. **Expected:** immediate redirect to
      `/login?next=%2Faudit`, landing on the "Sign in to Cybernara" screen — you never see any
      audit data.
- [ ] **Real login.** On the login screen, enter `qa-platform-admin`'s email and password from the
      credentials file into the Email/Password fields and click **Sign in**. **Expected:**
      redirected to `/` (or wherever `next` pointed), "Cybernara Operations Console" heading
      visible, your email shown in the top-right user panel.
- [ ] **Session persists across navigation.** Click through a couple of nav links (Framework
      Library, Assessments). **Expected:** no re-prompt for login; each page loads normally.
- [ ] **Logout actually ends the session.** Click **Sign out** in the top-right panel.
      **Expected:** redirected to `/login`.
- [ ] **Logout blocks re-entry without a fresh login.** After signing out, go directly to
      `http://127.0.0.1:3100/` again (don't log back in). **Expected:** redirected straight back
      to `/login` — the old session cookie is genuinely gone, not just hidden.

---

## F1 — Framework & harmonization browsing

Log in as **`qa-platform-admin`**.

- [ ] Go to **Framework Library** (`/frameworks`). **Expected:** "Published content packs" and
      "Canonical requirements" sections both show real rows (not empty), given the seeded tenant
      has 83,790+ real framework requirements.
- [ ] Note the **first row's Control ID** in the "Canonical requirements" table (the bold text in
      the Control column, e.g. `CC6.1`).
- [ ] Click **Next** under the requirements table. **Expected:** URL now contains
      `requirementsOffset=25`; the first row's Control ID is **different** from what you noted —
      this is the manual equivalent of the automated pagination-network test added in the fix
      pass (proof the server actually re-queried with a new offset, not just re-showing the same
      25 rows).
  - *To see it directly:* open browser dev tools → Network tab before clicking Next, then click
    Next. You'll see a new request to `/frameworks?...requirementsOffset=25...` appear — that's
    the page's own navigation re-firing with the new offset. The underlying database query itself
    happens inside the Next.js server process, so you won't see a separate "API call" entry for
    it in the Network tab — the changed row data after the navigation completes is the real proof
    it worked, same reasoning the automated test uses.
- [ ] Click **Previous**. **Expected:** back to the original first page, first row matches what you
      noted originally.
- [ ] Go to **Harmonization** (`/harmonization`). **Expected:** "Harmonized control library" table
      populated (4,624+ real rows).
- [ ] Note the first row's **Harmonized ID**, click **Next** under that table, confirm the first
      row's Harmonized ID changes, same reasoning as above.
- [ ] Enter `SOC2` in the "Framework key" filter on either page and submit. **Expected:** results
      narrow to SOC2-only rows; the constraint note on the page explicitly says free-text search
      isn't offered — only exact filters and offset pagination are.

---

## F2 — Assessment core

Log in as **`qa-platform-admin`**.

### Happy path

- [ ] Go to **Assessments** (`/assessments`). Fill in the "Create assessment scope" form (defaults
      are fine) and click **Create assessment**. **Expected:** URL gains `assessmentId=...`; the
      new assessment's scope name appears as a heading below.
- [ ] Click **Initiate evidence upload** (defaults are fine). **Expected:** URL gains
      `evidenceId=...`; the evidence table shows one row with state **pending**.
- [ ] Click **Quarantine evidence**. **Expected:** state badge changes to **quarantined**.
- [ ] Click **Commit clean evidence**. **Expected:** state badge changes to **committed**; a
      "Committed hash" value appears.
- [ ] **Live evidence scan status (new in this fix pass).** In the evidence detail panel, find the
      **"Live scan status"** field. **Expected:** it reads **committed** (matching the state badge
      above) with an "Updated ..." timestamp — this field didn't exist before the fix pass; it's a
      real live call to `GET /v1/evidence/objects/:id/scan-status`, not a re-display of the table
      row you already had.
- [ ] Click **Check reuse**. **Expected:** "Reuse check result: Reusable" message appears.
- [ ] Click **Approve applicability**. **Expected:** item status badge changes to **in_progress**.
- [ ] Click **Submit answer**. **Expected:** status changes to **submitted**.
- [ ] Click **Approve item**. **Expected:** status changes to **approved**.
- [ ] **Reopen item (new in this fix pass).** Click **Reopen item** (fill in a reason if you want;
      the default text is fine). **Expected:** status changes to **needs_changes** — this button
      and the whole reopen workflow didn't exist before the fix pass.
- [ ] Click **Submit answer** again. **Expected:** status back to **submitted**.
- [ ] Click **Approve item** again. **Expected:** status back to **approved**.
- [ ] Click **Close assessment**. **Expected:** assessment status changes to **closed**.
- [ ] Click **Create finding** (default severity/description are fine). **Expected:** a finding
      appears with a `findingId` in the URL; "1 findings" shown.
- [ ] **Update finding (new in this fix pass).** In the "Update finding" form, change **Severity**
      to `Critical` and change the **Description** text to something new (e.g. "Escalated during
      manual QA"). Click **Update finding**. **Expected:** the findings summary now shows your new
      description text — this form and the underlying `PATCH` call didn't exist before the fix
      pass.
- [ ] Click **Create remediation task** (default due date is fine). **Expected:** a task appears
      with a `taskId` in the URL.
- [ ] Click **Mark task in progress**. **Expected:** task status changes to **in_progress**.
- [ ] Click **Accept risk** (default reason is fine). **Expected:** task status changes to
      **risk_accepted**. Note the "Risk acceptance note" text explaining the reason isn't
      re-displayed here by design — it's stored in the audit/outbox trail, not on the task record
      (matches §4.2 of the original audit report).
- [ ] Click **Request report export** (default template/format are fine). **Expected:** a row
      appears in "Report exports" with a **Download** link.
- [ ] Click **Download**. **Expected:** the browser downloads/opens a real PDF (or Excel, if you
      picked xlsx) — this is generated fresh on each download from the pinned snapshot, not a
      pre-stored file. Downloading it twice in a row should feel the same each time (a brief
      real render, not an instant cached response and not a fake delay).

### F2 — Idempotency (manual double-submit)

- [ ] Go back to `/assessments` (fresh page, no `assessmentId` in the URL) and fill in the "Create
      assessment scope" form with a distinctive scope name you'll recognize, e.g.
      `Manual QA idempotency check`.
- [ ] **Before submitting**, open dev tools → Network tab so you can watch what happens, then click
      **Create assessment** once.
- [ ] Immediately click your browser's **Back** button, then click **Create assessment** again
      *without changing any field* — you're resubmitting the exact same form state (same hidden
      idempotency key, since it's baked into the page you navigated back to, not regenerated).
      **Expected:** it still redirects successfully (no error), landing on an `assessmentId=...`
      URL.
- [ ] Go to the assessment list (reload `/assessments` with no query params, or just look at
      "Recent assessments") and search/scan for `Manual QA idempotency check`. **Expected:** it
      appears **exactly once**, not twice — confirms no duplicate was created, the manual
      equivalent of `e2e/f2-idempotency.spec.ts`.

---

## F3 — AI governance

Log in as **`qa-platform-admin`**.

- [ ] Go to **AI Review** (`/ai`). **Expected:** page copy explicitly states "AI output is
      advisory. Generated questions cannot be published until a human reviewer explicitly
      approves the generation run."
- [ ] Click **Generate governed question** (default text is fine). **Expected:** a new row appears
      in "Pending human review" with state **pending_review**.
- [ ] Click **Review** on that row, then click **Approve as human reviewer**. **Expected:**
      "Human review recorded" message; the question's "Human approval" field now reads "Approved
      by human reviewer".
- [ ] **Before** you approve, check the **Publish approved question** button on a not-yet-approved
      question: it should be visibly **disabled** (greyed out, not clickable). **Expected:** you
      cannot click it or trigger a publish while state isn't `approved`.
- [ ] **After** approving, the same button becomes enabled. Click **Publish approved question**.
      **Expected:** "Question published after human approval" message.
- [ ] Click **Trigger fallback generation**. **Expected:** a new pending question appears tagged
      "Fallback path active: AI unavailable, using curated baseline generation."
- [ ] **Confirm no general-purpose AI surface exists anywhere else.** Check every other page you
      visit in this plan (Assessments, Privacy, Enterprise, etc.) — none of them should have any
      "ask AI" / "generate with AI" button or field outside this one `/ai` page. This is a
      negative check: the absence of such a control anywhere else is the pass condition.

---

## F4 — Integrations

Log in as **`qa-platform-admin`**.

- [ ] Go to **Integrations** (`/integrations`). **Expected:** "Registered connectors" table and
      "Control tests and alerts" sections both show data.
- [ ] Click **Register connector** (defaults are fine — note the field for a secret reference,
      e.g. `secret://...`). **Expected:** a new connector row appears.
- [ ] Select the new connector, click **Record sync status**. **Expected:** a sync run row appears
      under "Delivery log" / sync history for that connector.
- [ ] Click **Record connector object**. **Expected:** enabled once a sync run exists; a new
      connector object row appears.
- [ ] Click **Register webhook contract** (defaults fine). **Expected:** a new webhook row appears.
- [ ] Select it, click **Record delivery**. **Expected:** a delivery row appears in the delivery
      log.
- [ ] Click **Record failing control test** (enabled once a connector is selected). **Expected:** a
      new automated control test row appears, and — since it's recorded as failing — a
      corresponding row should appear under assurance alerts.

---

## F5 — Privacy & Enterprise GRC

Log in as **`qa-platform-admin`**.

- [ ] Go to **Privacy Operations** (`/privacy`). **Expected:** page loads with summary cards for
      Inventory, RoPA, DPIA, Rights, Consent, Incidents, Retention.
- [ ] Click **Create processing activity**. **Expected:** a new RoPA row appears.
- [ ] Select it, click **Create inventory record**, then **Create DPIA assessment**. **Expected:**
      both succeed and update the relevant summary counts.
- [ ] Click **Create rights request**, then (with it selected) **Verify identity**, **Add search
      task**, **Complete rights request** in sequence. **Expected:** each step succeeds and the
      rights request's status/fields update accordingly.
- [ ] Click **Grant consent**, then **Withdraw consent**. **Expected:** consent status changes.
- [ ] Click **Create privacy incident** and **Create retention schedule**. **Expected:** both
      succeed; the retention "Evaluation at 48 months" card shows a real decision, not a
      placeholder.
- [ ] **Sub-resources are counts, never separate edit pages (§4.4 of the audit report).** Confirm
      nowhere on this page is there a link, button, or route to an "edit questionnaire",
      "edit monitoring finding", or similar standalone sub-resource screen — everything you see
      is either a top-level record (inventory/RoPA/DPIA/rights/consent/incident/retention) or a
      plain count/summary derived from an ID array or JSON field.
- [ ] Go to **Enterprise GRC** (`/enterprise`). Click **Draft policy**, then with it selected click
      **Publish selected policy** and **Add policy exception**. **Expected:** policy status
      changes to `published`; an exception count appears.
- [ ] Click **Create access review**, **Create vendor record**, **Create audit engagement**.
      **Expected:** each succeeds, summary cards update.
- [ ] Click **Publish trust artifact**, then (selected) **Record trust download**. **Expected:**
      a download-events count increments.
- [ ] Click **Create workspace** and **Create custom object definition**. **Expected:** both
      succeed.
- [ ] **Sub-resources here too are counts only.** Confirm "Exceptions", "contract refs",
      "remediation refs", "delegated admins" etc. are shown only as numbers/summaries (e.g.
      "3 contract refs") on the vendor/workspace/policy cards — never as a separate page you can
      navigate into and edit individually.

---

## F6 — RBAC and clearance (highest-value section — do this one carefully)

### Role-based nav gating

- [ ] Log in as **`qa-viewer`**. **Expected nav items visible:** Framework Library, Harmonization,
      Assessments only. Audit Log, AI Review, Integrations, Privacy Operations, Enterprise GRC
      must **not** appear in the nav at all.
- [ ] Log in as **`qa-auditor`**. **Expected nav items visible:** Audit Log, Framework Library,
      Harmonization, Assessments, Enterprise GRC. AI Review, Integrations, Privacy Operations must
      **not** appear.
- [ ] Still as `qa-auditor`, open **Enterprise GRC**. **Expected:** you can see policies, vendors,
      access reviews, etc., but every mutating button (**Draft policy**, **Create vendor record**,
      **Record trust download**, etc.) is simply **absent from the page**, not just disabled —
      `qa-auditor` was provisioned with read-only scopes.

### No dangling nav links (the fix from §1.3 of the fix report)

- [ ] Log in as **`qa-platform-admin`**. Look at every item in the primary nav. **Expected:**
      Audit Log, Framework Library, Harmonization, Assessments, AI Review, Integrations, Privacy
      Operations, Enterprise GRC — click every single one. **None should 404.** (Before the fix,
      "Evidence Vault" and "Administration" were in this nav and both led to a 404 — confirm
      neither of those labels appears anywhere in the nav now at all.)

### Clearance bug reproduction (the fix from §1.1 of the fix report)

This is the manual proof of the exact bug that was fixed: `PolicyGuard` used to hardcode every
resource's classification to `restricted`, wrongly denying anyone whose clearance was below
`restricted` even with perfectly correct scopes.

- [ ] Log in as **`qa-clearance-confidential`** (clearance = `confidential`, every scope granted).
      Go to **Assessments** and attempt to **Create assessment**. **Expected: it succeeds.**
      Assessments are a `confidential`-tier resource — before the fix, this exact
      persona/action combination would have been wrongly rejected with a 403, because the guard
      required `restricted` for every resource regardless of its real sensitivity.
- [ ] Still as `qa-clearance-confidential`, go to **Framework Library** and try to change the page
      size or apply a filter (any action that triggers a fresh `GET /v1/framework-content/*`
      call — reloading the page counts). **Expected: it fails** — you should see the page's
      `ErrorState` ("Framework content could not be loaded") rather than data. Framework content
      is a `restricted`-tier resource, and `confidential` clearance is genuinely one tier below
      that — this is *correct*, expected denial, not a bug. (If Assessments also failed here, that
      would mean the fix regressed; if Framework Library succeeded, that would mean clearance
      enforcement was accidentally disabled entirely — neither should happen.)
- [ ] Log in as **`qa-clearance-internal`** (clearance = `internal`, every scope granted). Attempt
      **Create assessment** again. **Expected: it fails** (`internal` ranks below `confidential`,
      so this must still be denied) — proves the fix restored *tiered* enforcement, not just
      turned the check off.
- [ ] Log in as **`qa-platform-admin`** (clearance = `restricted`, the maximum tier) and repeat
      **Create assessment**. **Expected: it succeeds**, same as it always did — confirms no
      regression for the previously-working case.

### Two distinct negative-test failure modes

- [ ] Log in as **`qa-scope-insufficient-else-full`** (clearance = `restricted`, the maximum —
      *not* the limiting factor — but only `audit_event:read` granted). **Expected:** only
      **Audit Log** appears in the nav. Every other feature is invisible. This persona's clearance
      is fine; it's purely missing scope.
- [ ] Log in as **`qa-clearance-internal`** again and compare: this persona has *every* scope but
      insufficient clearance. **Expected:** you'll see far more of the nav (clearance doesn't gate
      nav visibility at all — only role+scope do) but confidential+/restricted-tier *actions* fail
      server-side when attempted. Side-by-side, these two personas demonstrate the two distinct
      failure modes named in the fix report: a scope failure blocks you from even seeing the
      feature; a clearance failure lets you see and attempt the action, but the backend rejects it.

### Single-feature scope isolation

- [ ] Log in as **`qa-scope-limited-assessment-only`**. **Expected:** only **Assessments** appears
      in the nav — not Framework Library, Harmonization, or anything else, even though this
      persona's role is `platform_admin` (the same role as `qa-platform-admin`, who sees
      everything). Proves nav gating genuinely checks scope per feature, not just role.

---

## F7 — Final integration spot-check

Log in as **`qa-platform-admin`**. This is a fast confirmation pass, not a repeat of everything
above.

- [ ] Land on `/` after login — "Cybernara Operations Console" heading, contract SHA and
      "Generated Operations" count both render (not blank/error).
- [ ] Visit each of the 8 nav items once each; confirm every page renders without an uncaught
      error or blank screen.
- [ ] Sign out, confirm redirect to `/login`.

---

## Correlation ID spot-check

The frontend now generates and forwards a real `x-correlation-id` on every backend call (fix
§1.2). Because most pages fetch their data from the Next.js *server* directly (not from your
browser), you can't see that header on a normal page-load request in the Network tab — that
particular hop never touches your browser. The one place a `correlationId` value *is* serialized
into something your browser actually receives is the JSON body of an error response, since every
backend error response includes a `correlationId` field.

- [ ] Log out completely (or open a fresh incognito window with no session). With dev tools open,
      navigate directly to `http://127.0.0.1:3100/api/backend/v1/audit/events`.
- [ ] **Expected:** a JSON response with `"status": 401` and a `"correlationId"` field. **Check
      that value is a real UUID** (looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`), **not** the
      literal string `"missing-correlation-id"` — before the fix, it was always that literal
      string.
- [ ] For a second confirmation from an *authenticated* error: log in as
      `qa-clearance-public` and attempt any action (e.g. try to open Framework Library, which will
      fail since `public` clearance can't reach a `restricted`-tier resource). Use dev tools
      Network tab to find the failing request/response and inspect its JSON body — same check:
      real UUID `correlationId`, not the placeholder string.

---

## Accessibility spot-check (login screen)

No special tooling required — just your keyboard.

- [ ] Load `/login`. Press **Tab** repeatedly from the top of the page. **Expected:** focus moves
      in a sensible order — Email field, then Password field, then Sign in button — and you can
      **see** a visible focus outline/highlight on whichever element is focused at every step (not
      an invisible focus you have to guess at).
- [ ] With the Email field focused, type your email using only the keyboard, press **Tab** to move
      to Password, type the password, then press **Enter** (not click) while focused on the Sign
      in button. **Expected:** the form submits and you're logged in — the whole login flow works
      without ever touching the mouse.
- [ ] Check that clicking directly on the word "Email" or "Password" (the label text, not the
      input box itself) focuses the corresponding input. **Expected:** it does — confirms the
      `<label>` elements are properly associated with their inputs, not just visually adjacent.
