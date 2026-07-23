# Cybernara Manual Testing Guide

This guide is written for a human tester using the browser UI. It assumes the database has been reset to a clean first-run state: shared framework/catalog content is present, client tenant data is empty, and exactly one Cybernara platform super-admin account exists.

Do not store the platform super-admin password in this file. Get the current platform super-admin email and password from the session owner. Use the application URL provided by the operator; for a local run this is usually `http://127.0.0.1:3100`.

## Smoke Test Fast Path

Use this 15-20 minute path when you only need a quick sanity check.

### Log In As Platform Super-Admin
1. Open the application URL.
2. If you are not already on the sign-in screen, go to `/login`.
3. Enter the platform super-admin email and password.
4. Click **Sign in**.

**Expected result:** The Cybernara console opens to **Client Onboarding**. The left sidebar shows **Client Onboarding** only.

**If something's wrong:** If you stay on `/login`, the credentials may be wrong or the session metadata may be invalid.

### Create One Client Tenant
1. In **Create client tenant**, enter `Manual Smoke Client <date>`.
2. Keep Default classification as `confidential`.
3. Click **Create tenant**.

**Expected result:** A success message appears and the new tenant appears in **Tenant onboarding list**.

**If something's wrong:** A red or inline error means the tenant was not created. Check that the name has at least two characters.

### Create The Client's First Admin
1. In **Provision tenant admin**, choose the tenant you just created.
2. Enter `manual.client.admin+<date>@example.com`.
3. Enter display name `Manual Client Admin`.
4. Keep Clearance as `restricted`.
5. Click **Create first admin**.
6. Record the temporary password outside this guide.
7. Click **Sign out**.

**Expected result:** A success message appears with a temporary password for the tenant-scoped admin.

**If something's wrong:** If no temporary password appears, record it as an onboarding defect.

### Log In As Client Admin
1. Go to `/login?next=/admin/users`.
2. Enter the first client admin email and temporary password.
3. Click **Sign in**.

**Expected result:** The **User & Role Admin** console opens. The sidebar now shows tenant operations such as Audit Log, User Admin, My Tasks, Framework Library, Assessments, Privacy Operations, and Enterprise GRC.

**If something's wrong:** If the client admin lands on **Client Onboarding**, the account was created with platform metadata by mistake.

### Invite One Tenant User
1. In **Invite user**, enter `manual.smoke+<date>@example.com`.
2. Enter display name `Manual Smoke Tester`.
3. Choose **Viewer** for Initial role and **internal** for Clearance.
4. Click **Invite user**.

**Expected result:** A success message appears with a temporary password, and the user appears in **Active assignments**.

**If something's wrong:** A red or inline error means the invite did not complete. Check that the email is unique.

### Create One Assessment
1. Click **Assessments** in the left sidebar.
2. In **Create assessment scope**, keep the default values or enter `Smoke SOC 2`.
3. Click **Create assessment**.

**Expected result:** The page reloads with an `assessmentId` in the URL and shows at least one assessment item.

**If something's wrong:** If no item appears, check that the framework catalog was preserved during reset.

### Upload One Evidence File
1. In the assessment page, find **Upload evidence file**.
2. Choose a small `.txt` or `.pdf` file.
3. Keep Classification, Period start, Period end, and Scope tags filled.
4. Click **Upload evidence file**.

**Expected result:** A progress indicator appears, then the page reloads with the uploaded evidence selected and a **Live scan status** panel.

**If something's wrong:** A file-type or file-size message is expected for blocked files. A generic server error is a bug to record.

### Check One Task
1. Click **My Tasks**.
2. Use **Pending**, **In progress**, and **Completed** filters.
3. If a task exists, change its status and click **Update**.

**Expected result:** The selected filter applies, and task status updates without leaving the console.

**If something's wrong:** A missing task is acceptable in a clean reset unless you already created a flow that should generate one.

### Sign Out
1. Click **Sign out** in the lower-left user panel.

**Expected result:** You return to the sign-in page.

**If something's wrong:** If you can still open protected pages after signing out, record it as a session-handling defect.

## 1. Getting Started

### Understand The Two Admin Layers
1. Confirm the tester has two different account types available during manual testing: the Cybernara platform super-admin and a tenant-scoped client admin created by that platform super-admin.
2. Use the platform super-admin only for **Client Onboarding**.
3. Use the client admin for all tenant operations such as user management, assessments, evidence, risks, tasks, privacy, audit, and reporting.

**Expected result:** The platform super-admin is not inside any client tenant, and client admins cannot open `/platform/tenants`.

**If something's wrong:** If a tenant admin can see **Client Onboarding**, or the platform super-admin can open **User Admin**, record it as an authorization defect.

### Open The Console
1. Open the application URL in a browser.
2. Confirm the page title or sign-in page says Cybernara.
3. Sign in as the platform super-admin.

**Expected result:** You land on **Client Onboarding**, with the signed-in platform user shown in the lower-left user panel.

**If something's wrong:** A blank page, 404, or raw JSON error means the frontend or backend is not running correctly.

### Review The Top-Level Navigation
1. While signed in as the platform super-admin, confirm the sidebar shows **Client Onboarding** only.
2. Create a client tenant and first client admin if one does not already exist for this manual test run.
3. Sign out, then sign in as the client admin.
4. Confirm the tenant sidebar entries are present: Audit Log, User Admin, My Tasks, Framework Library, Framework Updates, Harmonization, Assessments, AI Review, Integrations, Privacy Operations, Enterprise GRC.
5. Click each tenant entry once.

**Expected result:** The platform page is isolated to the platform account, and each tenant page opens without a 404 and without **Feature access unavailable** for the client admin.

**If something's wrong:** Missing Privacy Operations or Enterprise GRC usually means the session lacks required scopes.

## 2. Admin: Onboarding Your Team

### Invite A User
1. Click **User Admin**.
2. In **Invite user**, enter a unique email.
3. Enter a display name.
4. Select an Initial role: Platform admin, Compliance manager, Auditor, or Viewer.
5. Select Clearance: public, internal, confidential, or restricted.
6. Click **Invite user**.

**Expected result:** The user appears in **Active assignments**, and a temporary password is shown once on the page.

**If something's wrong:** Duplicate emails or missing required fields should show a clear error, not a crash.

### Verify A Lower-Access User
1. Save the temporary password through an approved secure channel.
2. Sign out.
3. Sign in as the invited user.
4. Confirm the sidebar has fewer items than the client admin if you invited a Viewer or Auditor.
5. Try opening `/admin/users` directly in the address bar.

**Expected result:** A non-admin user cannot use User Admin. They should be redirected or shown an access error.

**If something's wrong:** If a Viewer can invite users or change roles, record this as a critical authorization defect.

### Change Role Or Clearance
1. Sign back in as the client admin.
2. Open **User Admin**.
3. Find the invited user row.
4. Change **Role** or **Clearance**.
5. Click **Save assignment**.

**Expected result:** The row updates, and the success message says the user was updated.

**If something's wrong:** If the row updates visually but the user still has old access after signing out/in, record it as a stale-session or metadata-sync defect.

### Deactivate And Reactivate
1. In **User Admin**, find the invited user.
2. Click **Deactivate**.
3. Sign out and try to sign in as the deactivated user.
4. Sign back in as the client admin.
5. Click **Reactivate** for that user.

**Expected result:** Deactivated login is rejected. Reactivated users can sign in again with current credentials.

**If something's wrong:** If deactivated users can still sign in, record it as a blocking identity defect.

## 3. Frameworks & Harmonization

### Browse The Framework Catalog
1. Click **Framework Library**.
2. In **Framework requirement filters**, enter `SOC2` for Framework key.
3. Click **Apply server filter**.
4. Select a listed content pack if available.

**Expected result:** Published content packs and canonical requirements appear. The clean reset should still contain shared catalog rows.

**If something's wrong:** Empty framework content after reset means catalog rows may have been wiped.

### Inspect Harmonized Controls
1. Click **Harmonization**.
2. Leave the filters blank or enter `SOC2` in Framework key.
3. Click **Apply server filter**.
4. Click **Inspect mappings** on a harmonized control.

**Expected result:** The selected control, mappings, and unique framework entries are displayed.

**If something's wrong:** A blank mapping table is acceptable only if the selected filter is too narrow.

### Run Framework Update Diff
1. Click **Framework Updates**.
2. In **Calculate version differences**, enter a Framework key shown in the Available content packs table.
3. Enter a From version and To version from that same framework.
4. Click **Run version comparison**.

**Expected result:** A calculated comparison appears. If an assessment exists that uses the changed content, the impact queue can show affected items.

**If something's wrong:** If the version pair is invalid, the UI should show a clear error rather than raw API JSON.

### Resolve An Impact
1. In **Active assessment impact queue**, find an impact row.
2. Choose a status.
3. Enter a short resolution rationale.
4. Click **Resolve**.
5. Click **My Tasks** and filter by status.

**Expected result:** The impact status updates, and related impact tasks appear in the task inbox when generated.

**If something's wrong:** If an impact updates but no task ever appears for a generated impact, record it as a task-link defect.

## 4. Running An Assessment

### Create An Assessment
1. Click **Assessments**.
2. In **Create assessment scope**, enter a Scope name such as `Manual SOC 2`.
3. Confirm Period start and Period end are filled.
4. Leave framework fields at defaults unless testing a specific framework.
5. Click **Create assessment**.

**Expected result:** The URL contains `assessmentId`, and the assessment shows pinned framework, mapping, control, and question version details.

**If something's wrong:** If period end before period start is accepted, record it as a validation defect.

### Approve Applicability
1. In the selected item workflow, click **Approve applicability**.
2. Use the default rationale or enter your own.

**Expected result:** The item applicability changes to applicable.

**If something's wrong:** If no status changes or a raw stack trace appears, record it.

### Submit An Answer
1. In **Submit assessment answer**, enter a short answer.
2. If you have uploaded evidence, include its evidence ID in Evidence IDs.
3. Click **Submit answer**.

**Expected result:** The answer appears in item history.

**If something's wrong:** Empty required answers should be rejected with a clear message.

### Review And Reopen
1. In **Review assessment item**, choose approved or needs changes.
2. Enter a reason.
3. Click **Approve item**.
4. In **Reopen assessment item**, enter a reason.
5. Click **Reopen item**.

**Expected result:** Review state changes, then the item returns to a reopened state.

**If something's wrong:** Reopening without a reason should be blocked.

### AI-Assisted Question Flow
1. Click **AI Review** in the left sidebar.
2. In **Request AI question generation**, keep the default question or enter your own.
3. Click **Generate governed question**.
4. Review **Generation lineage** and confirm citations or source references are shown.
5. In **Review and publish**, choose approved and enter a rationale.
6. Click **Approve as human reviewer**.
7. Click **Publish approved question**.

**Expected result:** A generation run appears with model/prompt provenance, citations, safety information, and a published AI-origin question version.

**If something's wrong:** A malformed output or policy failure should show a clear error. A raw stack trace or silent no-op is a defect.

### AI Fallback Path
1. Click **AI Review**.
2. Click **Trigger fallback generation**.

**Expected result:** A fallback generation run appears and is labeled as a fallback/model-unavailable path.

**If something's wrong:** Fallback should not look identical to a normal successful model run without explaining why it happened.

## 5. Integration Command Center

### Register A Connector
1. Click **Integrations** in the left sidebar.
2. In **Register connector**, enter a Connector key such as `okta-manual`.
3. Enter Provider `Okta`.
4. Keep Secret ref as a `secret://...` reference.
5. Click **Register connector**.

**Expected result:** The connector appears in **Registered connectors**.

**If something's wrong:** Real secrets should never be entered directly. A non-`secret://` value should be rejected or clearly discouraged.

### Record Sync And Object
1. Select the connector.
2. In **Record sync run**, choose a status and enter a cursor value.
3. Click **Record sync status**.
4. In **Record connector object**, enter an external ID.
5. Click **Record connector object**.

**Expected result:** Sync runs and connector objects update for the selected connector.

**If something's wrong:** Connector object creation should be disabled until a connector/sync run is selected.

### Webhook And Control Test
1. In **Delivery log**, click **Register webhook contract**.
2. Select the latest webhook.
3. Click **Record delivery**.
4. In **Control tests and alerts**, click **Record failing control test**.

**Expected result:** Webhook deliveries and assurance alerts appear.

**If something's wrong:** A failing control test should create a visible alert, not disappear.

## 6. Evidence

Current implementation note: browser upload is real and sends bytes through the Next.js upload route to the backend evidence lifecycle. Malware scanning is represented by the backend scan path used in the app, not by a separate external antivirus console.

### Upload Valid Evidence
1. Open an assessment with a selected item.
2. In **Upload evidence file**, choose a small allowed file such as `.txt`, `.pdf`, `.csv`, `.png`, or `.jpg`.
3. Choose Classification.
4. Confirm Period start, Period end, and Scope tags.
5. Click **Upload evidence file**.

**Expected result:** The progress indicator moves, the file is uploaded, scanned, committed, linked, and selected on the assessment page.

**If something's wrong:** Network failure should show a retry message. Server rejection should show a clear inline message.

### Refresh Scan Status
1. Select uploaded evidence.
2. Find **Live scan status**.
3. Click **Refresh scan status** or **Refresh status**.

**Expected result:** Status stays clean for accepted files or shows the current quarantine/rejection state.

**If something's wrong:** A clean file should not remain permanently inaccessible after the accepted scan path completes.

### Check Evidence Reuse
1. In **Check evidence reuse**, enter scope tags matching the uploaded file, such as `soc2,access`.
2. Click **Check reuse**.

**Expected result:** Matching evidence appears as reusable when scope, period, and freshness match.

**If something's wrong:** Evidence with mismatched period or scope should not be marked reusable.

### Edge-Case: Blocked File Type
1. In **Upload evidence file**, choose a disallowed file such as `.exe`.
2. Click **Upload evidence file**.

**Expected result:** The UI shows that the MIME type is not allowed and does not crash.

**If something's wrong:** A disallowed file should not create a committed evidence record.

## 7. Findings & Reopening

### Create A Finding
1. Open **Assessments** and select an assessment item.
2. In **Findings and remediation**, choose a severity.
3. Enter a description.
4. Click **Create finding**.

**Expected result:** The finding appears in the findings panel.

**If something's wrong:** A finding without an assessment item or test result should be rejected.

### Patch A Finding
1. Select the latest finding.
2. Update the finding description or severity.
3. Click **Update finding**.

**Expected result:** The finding row updates with the new values.

**If something's wrong:** Updates should not create duplicate unrelated findings.

### Create And Update Remediation
1. In **Create remediation task**, enter a due date.
2. Click **Create remediation task**.
3. Select the latest remediation task.
4. Click **Mark task in progress**.

**Expected result:** A remediation task is created and status changes to in progress.

**If something's wrong:** The task should also be visible from **My Tasks**.

## 8. Risk Management

### Create A Risk Model
1. Click **Enterprise GRC**.
2. In **Risks and risk modeling**, fill Model key and Model version.
3. Click **Create risk model**.

**Expected result:** The risk model appears in the Risk models table.

**If something's wrong:** Duplicate model keys should produce a clear conflict or update behavior.

### Register A Risk
1. Stay on **Enterprise GRC**.
2. In **Register risk**, enter Risk key, Title, and Inherent score.
3. Click **Register risk**.

**Expected result:** The risk appears under Top risk or the risk register area.

**If something's wrong:** Invalid scores should be rejected.

### Accept Remediation Risk
1. Open **Assessments** and select a remediation task.
2. In **Accept remediation risk**, enter expiry, next review date, and compensating controls.
3. Click **Accept risk**.

**Expected result:** The risk acceptance note appears.

**If something's wrong:** Risk acceptance without an approver or rationale should be blocked.

## 9. Universal Tasks

### View And Filter Tasks
1. Click **My Tasks**.
2. Click **All**, **Pending**, **In progress**, and **Completed**.

**Expected result:** The list filters by status.

**If something's wrong:** Changing filters should not produce a 404.

### Update Task Status
1. Find a task row.
2. Use the status dropdown.
3. Click **Update**.

**Expected result:** The status changes and completed tasks show completion metadata.

**If something's wrong:** A completed task should not look pending after refresh.

### Confirm Multiple Task Sources
1. Create a remediation task from an assessment.
2. Generate a framework update impact if catalog versions allow it.
3. Create a rights request task from Privacy Operations.
4. Return to **My Tasks**.

**Expected result:** Tasks from different target types appear and can be filtered by status.

**If something's wrong:** Missing target types indicate a source-to-inbox sync issue.

## 10. Framework Update Impact

### Trigger Or View A Diff
1. Click **Framework Updates**.
2. Use the Available content packs table to pick a valid framework and versions.
3. Click **Run version comparison**.

**Expected result:** The comparison appears in Calculated comparisons.

**If something's wrong:** Invalid versions should show a controlled error.

### Confirm Impact Queue And Task Link
1. Create or select an assessment using the affected framework.
2. Return to **Framework Updates**.
3. Run the comparison again if needed.
4. Review **Active assessment impact queue**.
5. Open **My Tasks**.

**Expected result:** Impact rows are visible, and generated impact work appears in the task inbox.

**If something's wrong:** An impact with no task is a defect unless the app explicitly says no task was generated.

## 11. Privacy Operations

### Create Processing Activity
1. Click **Privacy Operations**.
2. In **Processing activity foundation**, click **Create processing activity**.

**Expected result:** RoPA totals increase and a processing activity appears.

**If something's wrong:** Missing permission messages for the client admin indicate scope metadata problems.

### Create Inventory And DPIA
1. Select or use the latest processing activity.
2. Click **Create inventory record**.
3. Click **Create DPIA assessment**.

**Expected result:** Latest inventory system and Latest DPIA risk panels update.

**If something's wrong:** These actions should be disabled until a processing activity is selected.

### Rights Request And Consent
1. In **Data-subject workflow**, click **Create rights request**.
2. Click **Verify identity**.
3. Click **Add search task**.
4. Click **Complete rights request**.
5. Click **Grant consent**.
6. Click **Withdraw consent**.

**Expected result:** Rights request and consent panels show updated status/history.

**If something's wrong:** Completing a request before identity verification should be blocked.

### Retention And Legal Hold
1. Click **Privacy Operations** or **Retention & Deletion Console** if linked by the operator.
2. On `/privacy/retention`, fill **Define retention schedule**.
3. Toggle legal hold if testing the hold path.
4. Click **Save schedule**.
5. In **Initialize Deletion Job**, enter a deletion trigger.
6. Click **Initialize erasure execution**.

**Expected result:** Active schedules and deletion jobs appear. Legal hold should block disposition where applicable.

**If something's wrong:** A legal hold should not allow final deletion proof to be treated as ordinary disposal.

## 12. Enterprise And Custom Objects

### Policy, Vendor, Audit, And Trust Records
1. Click **Enterprise GRC**.
2. Click **Draft policy**.
3. Select the latest policy, then click **Publish selected policy**.
4. Click **Create access review**.
5. Click **Create vendor record**.
6. Click **Create audit engagement**.
7. Click **Publish trust artifact**.

**Expected result:** Enterprise totals update across Policies, Access reviews, Vendors, Audits, and Trust artifacts.

**If something's wrong:** The client admin should not see feature-access-denied messages.

### Create A Workspace
1. On **Enterprise GRC**, click **Create workspace**.

**Expected result:** Latest workspace updates.

**If something's wrong:** Workspace creation should not depend on test fixture data.

### Custom Object Round Trip
1. Click **Enterprise GRC**.
2. Click **Create custom object definition**, or open `/enterprise/custom-objects`.
3. In **Create Custom Object Definition**, enter Object key `manual_asset`.
4. Enter Workflow states `draft,active,retired`.
5. Enter Initial field key `owner`.
6. Choose Initial field type `text`.
7. Click **Create Definition**.
8. In **Fields**, enter Field key `criticality`, choose data type `text`, and click **Add Field Definition**.
9. In **Records**, enter Record key `asset-001` and click **Create Record**.
10. In **Field values**, choose the new field, enter value JSON `"high"`, enter Search text `high`, and click **Set Value**.

**Expected result:** The record and field value appear on refresh, confirming definition -> field -> record -> value round trip.

**If something's wrong:** Invalid JSON should be rejected with a clear error.

## 13. Audit Trail

### View Audit Events
1. Click **Audit Log**.
2. Use **Audit event filters** to filter by event type, target type, actor, classification, or date.
3. Click **Apply filters**.

**Expected result:** Matching audit events appear, or an empty state explains no matches.

**If something's wrong:** Raw database errors in the filter result are defects.

### Trigger And Verify A Checkpoint
1. Open `/audit/verify` or use the audit verification link if available.
2. Click **Trigger Next Checkpoint**.
3. In **Audit Trail Checkpoints**, click **Verify Integrity**.

**Expected result:** A checkpoint appears and a verification result is recorded as pass or fail.

**If something's wrong:** Verification should never silently do nothing.

## 14. Reporting

### Request Report Export
1. Open **Assessments** and select an assessment.
2. Scroll to **Frozen snapshot exports**.
3. Choose a template version and format.
4. Click **Request report export**.

**Expected result:** A report export appears in the table.

**If something's wrong:** Export creation should not mutate old exports.

### Download Report Export
1. In the report export table, click **Download**.
2. Save or open the downloaded file.

**Expected result:** The artifact downloads from `/api/backend/v1/report-exports/<id>/download` and reflects the selected assessment snapshot.

**If something's wrong:** A download that returns JSON error text instead of an artifact should be recorded.

## 15. Navigation And Edge Cases

### Full Navigation Crawl
1. Sign in as the client admin.
2. Click every left-sidebar item.
3. Watch for browser console errors if your test setup exposes them.

**Expected result:** No route returns 404 and no page shows an unhandled exception.

**If something's wrong:** Record the route, exact click, and visible error.

### Session Expiry Or Sign-Out
1. Click **Sign out**.
2. Try to open `/assessments` directly.

**Expected result:** You are redirected to `/login?next=%2Fassessments`.

**If something's wrong:** Protected pages should not display tenant data after sign-out.

### Non-Admin Direct URL
1. Sign in as a Viewer.
2. Type `/admin/users` in the address bar.

**Expected result:** Access is blocked or redirected.

**If something's wrong:** If User Admin opens for a Viewer, record it as a critical authorization issue.

### Required Field Validation
1. Choose any create form.
2. Clear a required field.
3. Submit.

**Expected result:** The browser or app blocks the submit with a clear message.

**If something's wrong:** The app should not create partial records with missing required values.

### Oversized Evidence Upload
1. Open an assessment item.
2. Choose a file larger than the displayed Max upload size.
3. Try to upload.

**Expected result:** The client blocks the upload and displays the size limit.

**If something's wrong:** Oversized files should not reach committed evidence state.
