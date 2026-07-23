import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "../../../../src/lib/auth";
import { createServerApiClient } from "../../../../src/lib/api/server";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../../src/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return redirectTo(request, loginPath("/enterprise/custom-objects"));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");
  const currentDefId = text(formData, "definitionId");
  const currentRecordId = text(formData, "recordId");

  if (intent === "createDefinition") {
    const objectKey = text(formData, "objectKey");
    const workflowStatesStr = text(formData, "workflowStates");
    const workflowStates = workflowStatesStr.split(",").map(s => s.trim()).filter(Boolean);
    const initialFieldKey = text(formData, "initialFieldKey");
    const initialFieldType = text(formData, "initialFieldType") as "text" | "number" | "date" | "boolean";
    const permissionRoleId = text(formData, "permissionRoleId");
    const connectorSdkEnabled = formData.get("connectorSdkEnabled") === "on";

    try {
      const def = await api.createEnterpriseCustomObjectDefinition({
        objectKey,
        fields: [
          {
            key: initialFieldKey,
            type: initialFieldType,
            required: true
          }
        ],
        workflowStates,
        permissionRoleIds: [permissionRoleId],
        upgradeSafe: true,
        connectorSdkEnabled
      }, { idempotencyKey: randomUUID() });
      return redirectTo(request, `/enterprise/custom-objects?definitionId=${def.id}`);
    } catch (error) {
      console.error("Failed to create custom object definition:", error);
      return redirectTo(request, `/enterprise/custom-objects`);
    }
  }

  if (intent === "createField") {
    const fieldKey = text(formData, "fieldKey");
    const dataType = text(formData, "dataType");
    const required = formData.get("required") === "on";

    try {
      await api.createEnterpriseCustomFieldDefinition(currentDefId, {
        fieldKey,
        dataType: dataType as "text" | "number" | "date" | "boolean" | "datetime" | "uuid" | "json" | "enum",
        required,
        validationJson: {}
      }, { idempotencyKey: randomUUID() });
      return redirectTo(request, `/enterprise/custom-objects?definitionId=${currentDefId}`);
    } catch (error) {
      console.error("Failed to create custom field definition:", error);
      return redirectTo(request, `/enterprise/custom-objects?definitionId=${currentDefId}`);
    }
  }

  if (intent === "createRecord") {
    const recordKey = text(formData, "recordKey");

    try {
      const record = await api.createEnterpriseCustomRecord(currentDefId, {
        recordKey
      }, { idempotencyKey: randomUUID() });
      return redirectTo(request, `/enterprise/custom-objects?definitionId=${currentDefId}&recordId=${record.id}`);
    } catch (error) {
      console.error("Failed to create custom record:", error);
      return redirectTo(request, `/enterprise/custom-objects?definitionId=${currentDefId}`);
    }
  }

  if (intent === "createValue") {
    const fieldDefinitionId = text(formData, "fieldDefinitionId");
    const valueJsonStr = text(formData, "valueJson");
    const searchText = text(formData, "searchText");

    let valueJson: Record<string, unknown> = {};
    try {
      valueJson = JSON.parse(valueJsonStr);
    } catch {
      valueJson = { val: valueJsonStr };
    }

    try {
      await api.createEnterpriseCustomValue(currentRecordId, {
        fieldDefinitionId,
        valueJson,
        searchText
      }, { idempotencyKey: randomUUID() });
      return redirectTo(request, `/enterprise/custom-objects?definitionId=${currentDefId}&recordId=${currentRecordId}`);
    } catch (error) {
      console.error("Failed to create custom value:", error);
      return redirectTo(request, `/enterprise/custom-objects?definitionId=${currentDefId}&recordId=${currentRecordId}`);
    }
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

function redirectTo(request: NextRequest, href: string) {
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
