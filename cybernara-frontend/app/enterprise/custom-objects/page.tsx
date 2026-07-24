import Link from "next/link";
import { AppShell } from "../../../src/components/app-shell";
import { ErrorState } from "../../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../../src/lib/api/server";
import { textParam, type SearchParamsRecord } from "../../../src/lib/listing";
import { requireSession } from "../../../src/lib/protected-session";
import type { CustomObjectDefinition, CustomFieldDefinition, CustomRecord, CustomValue } from "../../../src/lib/api/generated";

type CustomObjectsPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const actionsPath = "/enterprise/custom-objects/actions";

export default async function CustomObjectsPage({ searchParams }: CustomObjectsPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedDefId = textParam(params, "definitionId");
  const selectedRecordId = textParam(params, "recordId");
  const session = await requireSession(`/enterprise/custom-objects`);
  const api = createServerApiClient(session);

  let definitions: CustomObjectDefinition[] = [];
  let fields: CustomFieldDefinition[] = [];
  let records: CustomRecord[] = [];
  let values: CustomValue[] = [];
  let apiError: string | null = null;

  try {
    definitions = await api.listEnterpriseCustomObjectDefinitions({ limit: 50, offset: 0 });
    
    if (selectedDefId) {
      [fields, records] = await Promise.all([
        api.listEnterpriseCustomFieldDefinitions(selectedDefId, { limit: 50, offset: 0 }),
        api.listEnterpriseCustomRecords(selectedDefId, { limit: 50, offset: 0 })
      ]);
    }

    if (selectedRecordId) {
      values = await api.listEnterpriseCustomValues(selectedRecordId, { limit: 50, offset: 0 });
    }
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  const selectedDef = definitions.find(d => d.id === selectedDefId);
  const selectedRecord = records.find(r => r.id === selectedRecordId);

  return (
    <AppShell session={session} title="Custom Platform Extensions">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <Link href="/enterprise" className="badge internal" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
          Back to Enterprise GRC
        </Link>
      </div>

      {apiError ? <ErrorState title="Custom objects could not be loaded" detail={apiError} /> : null}

      {!apiError && (
        <div style={{ display: "grid", gap: "24px" }}>
          
          {/* Custom Object Definitions & Creation */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            
            {/* Create Custom Object Definition */}
            <section className="workspace" aria-labelledby="create-def-heading">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Builder</p>
                  <h2 id="create-def-heading">Create Custom Object Definition</h2>
                </div>
              </div>
              <form action={actionsPath} method="post" className="miniForm" style={{ border: "none", background: "transparent" }}>
                <input type="hidden" name="intent" value="createDefinition" />
                <label>
                  Object Key (Unique Identifier)
                  <input name="objectKey" required placeholder="e.g. regulator_action" />
                </label>
                <label>
                  Workflow States (Comma-separated)
                  <input name="workflowStates" required placeholder="e.g. open, in_progress, resolved" />
                </label>
                <label>
                  Initial Field Key
                  <input name="initialFieldKey" required placeholder="e.g. request_id" />
                </label>
                <label>
                  Initial Field Type
                  <select name="initialFieldType" required>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </label>
                <label>
                  Permission Role ID
                  <input name="permissionRoleId" required placeholder="00000000-0000-0000-0000-000000000000" />
                </label>
                <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px", textTransform: "none", letterSpacing: "normal", fontWeight: "normal" }}>
                  <input name="connectorSdkEnabled" type="checkbox" style={{ width: "auto", minHeight: "auto" }} />
                  Enable Connector SDK integration
                </label>
                <button type="submit" style={{ marginTop: "12px" }}>Create Definition</button>
              </form>
            </section>

            {/* List Custom Object Definitions */}
            <section className="workspace" aria-labelledby="defs-heading">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Definitions registry</p>
                  <h2 id="defs-heading">Available custom objects</h2>
                </div>
                <span className="badge internal">{definitions.length} Definitions</span>
              </div>
              <div className="tableScroller" style={{ maxHeight: "300px" }}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Object Key</th>
                      <th scope="col">SDK</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {definitions.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", color: "#8a8686" }}>
                          No custom objects defined.
                        </td>
                      </tr>
                    ) : (
                      definitions.map((d) => (
                        <tr key={d.id} style={selectedDefId === d.id ? { background: "var(--surface-strong)" } : {}}>
                          <td><strong>{d.objectKey}</strong></td>
                          <td>
                            <span className={`badge ${d.connectorSdkEnabled ? "internal" : "confidential"}`}>
                              {d.connectorSdkEnabled ? "Enabled" : "Disabled"}
                            </span>
                          </td>
                          <td><Link className="reviewLink" href={`/enterprise/custom-objects?definitionId=${d.id}`}>
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Selected Definition Fields & Records */}
          {selectedDef && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "24px" }}>
              
              {/* Fields and Add Field Panel */}
              <div style={{ display: "grid", gap: "24px" }}>
                {/* Fields List */}
                <section className="workspace" aria-labelledby="fields-heading">
                  <div className="sectionHeader">
                    <div>
                      <p className="eyebrow">Fields schema</p>
                      <h2 id="fields-heading">Fields for {selectedDef.objectKey}</h2>
                    </div>
                  </div>
                  <div className="tableScroller" style={{ maxHeight: "250px" }}>
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Field Key</th>
                          <th scope="col">Type</th>
                          <th scope="col">Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ textAlign: "center", color: "#8a8686" }}>
                              No custom fields defined yet.
                            </td>
                          </tr>
                        ) : (
                          fields.map((f) => (
                            <tr key={f.id}>
                              <td><code>{f.fieldKey}</code></td>
                              <td><span className="badge internal">{f.dataType}</span></td>
                              <td>
                                <span className={`badge ${f.required ? "restricted" : "confidential"}`}>
                                  {f.required ? "Required" : "Optional"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Add Field Form */}
                <section className="workspace" aria-labelledby="add-field-heading">
                  <div className="sectionHeader">
                    <div>
                      <p className="eyebrow">Extensibility</p>
                      <h2 id="add-field-heading">Add Field</h2>
                    </div>
                  </div>
                  <form action={actionsPath} method="post" className="miniForm" style={{ border: "none", background: "transparent" }}>
                    <input type="hidden" name="intent" value="createField" />
                    <input type="hidden" name="definitionId" value={selectedDef.id} />
                    <label>
                      Field Key
                      <input name="fieldKey" required placeholder="e.g. due_date" />
                    </label>
                    <label>
                      Data Type
                      <select name="dataType" required>
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="date">Date</option>
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px", textTransform: "none", letterSpacing: "normal", fontWeight: "normal" }}>
                      <input name="required" type="checkbox" style={{ width: "auto", minHeight: "auto" }} />
                      Field is required
                    </label>
                    <button type="submit">Add Field Definition</button>
                  </form>
                </section>
              </div>

              {/* Records List and Add Record Panel */}
              <div style={{ display: "grid", gap: "24px" }}>
                {/* Records List */}
                <section className="workspace" aria-labelledby="records-heading">
                  <div className="sectionHeader">
                    <div>
                      <p className="eyebrow">Records</p>
                      <h2 id="records-heading">Records for {selectedDef.objectKey}</h2>
                    </div>
                  </div>
                  <div className="tableScroller" style={{ maxHeight: "300px" }}>
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Record Key</th>
                          <th scope="col">Status</th>
                          <th scope="col">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ textAlign: "center", color: "#8a8686" }}>
                              No records created yet.
                            </td>
                          </tr>
                        ) : (
                          records.map((r) => (
                            <tr key={r.id} style={selectedRecordId === r.id ? { background: "var(--surface-strong)" } : {}}>
                              <td><strong>{r.recordKey}</strong></td>
                              <td><span className="badge internal">{r.status}</span></td>
                              <td><Link className="reviewLink" href={`/enterprise/custom-objects?definitionId=${selectedDef.id}&recordId=${r.id}`}>
                                  Manage Values
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Create Record Form */}
                <section className="workspace" aria-labelledby="add-record-heading">
                  <div className="sectionHeader">
                    <div>
                      <p className="eyebrow">Data Entry</p>
                      <h2 id="add-record-heading">Create Record</h2>
                    </div>
                  </div>
                  <form action={actionsPath} method="post" className="miniForm" style={{ border: "none", background: "transparent" }}>
                    <input type="hidden" name="intent" value="createRecord" />
                    <input type="hidden" name="definitionId" value={selectedDef.id} />
                    <label>
                      Record Key / Title
                      <input name="recordKey" required placeholder="e.g. Action Item #1" />
                    </label>
                    <button type="submit">Create Record</button>
                  </form>
                </section>
              </div>

            </div>
          )}

          {/* Selected Record Values & Edit Value Panel */}
          {selectedRecord && (
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "24px" }}>
              
              {/* Values List */}
              <section className="workspace" aria-labelledby="values-heading">
                <div className="sectionHeader">
                  <div>
                    <p className="eyebrow">Field values</p>
                    <h2 id="values-heading">Field values for: {selectedRecord.recordKey}</h2>
                  </div>
                </div>
                <div className="tableScroller" style={{ maxHeight: "300px" }}>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Field ID</th>
                        <th scope="col">Value Payload</th>
                        <th scope="col">Search text</th>
                      </tr>
                    </thead>
                    <tbody>
                      {values.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: "center", color: "#8a8686" }}>
                            No field values set for this record.
                          </td>
                        </tr>
                      ) : (
                        values.map((v) => (
                          <tr key={v.id}>
                            <td>
                              <small style={{ fontFamily: "monospace" }}>{v.fieldDefinitionId.slice(0, 8)}</small>
                            </td>
                            <td>
                              <code>{JSON.stringify(v.valueJson)}</code>
                            </td>
                            <td>
                              <span>{v.searchText || "N/A"}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Set Value Form */}
              <section className="workspace" aria-labelledby="add-value-heading">
                <div className="sectionHeader">
                  <div>
                    <p className="eyebrow">Set value</p>
                    <h2 id="add-value-heading">Assign Field Value</h2>
                  </div>
                </div>
                <form action={actionsPath} method="post" className="miniForm" style={{ border: "none", background: "transparent" }}>
                  <input type="hidden" name="intent" value="createValue" />
                  <input type="hidden" name="definitionId" value={selectedDefId || ""} />
                  <input type="hidden" name="recordId" value={selectedRecord.id} />
                  <label>
                    Select Field
                    <select name="fieldDefinitionId" required>
                      {fields.map((f) => (
                        <option key={f.id} value={f.id}>{f.fieldKey} ({f.dataType})</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Value JSON string
                    <input name="valueJson" required placeholder='{"val": "your_value"}' defaultValue='{"val": ""}' />
                  </label>
                  <label>
                    Search text representation
                    <input name="searchText" placeholder="e.g. deadline_date_value" />
                  </label>
                  <button type="submit" style={{ marginTop: "12px" }}>Set Value</button>
                </form>
              </section>

            </div>
          )}

        </div>
      )}
    </AppShell>
  );
}
