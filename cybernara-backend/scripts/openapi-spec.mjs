export function buildOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Cybernara Backend API",
    version: "0.1.0-m7",
      description: "M0 contract for health, IdentityTenant, AuditSecurity, and Outbox foundations."
    },
    servers: [{ url: "http://localhost:3000" }],
    paths: {
      "/": {
        get: {
          operationId: "getRootStatus",
          tags: ["Root"],
          responses: {
            "200": {
              description: "Backend landing status with live route metadata.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RootStatusResponse" }
                }
              }
            }
          }
        }
      },
      "/v1/health": {
        get: {
          operationId: "getHealth",
          tags: ["Health"],
          responses: {
            "200": {
              description: "Service health.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" }
                }
              }
            }
          }
        }
      },
      "/v1/identity/tenants": {
        post: {
          operationId: "registerTenant",
          tags: ["IdentityTenant"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterTenantRequest" }
              }
            }
          },
          responses: {
            "201": {
              description: "Tenant registered.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Tenant" }
                }
              }
            }
          }
        }
      },
      "/v1/identity/tenants/{tenantId}": {
        get: {
          operationId: "getTenant",
          tags: ["IdentityTenant"],
          parameters: [
            {
              name: "tenantId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ],
          responses: {
            "200": {
              description: "Tenant.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Tenant" }
                }
              }
            },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/admin/roles": {
        get: {
          operationId: "listAdminRoles",
          tags: ["Admin"],
          summary: "List tenant admin roles and clearance levels.",
          parameters: [...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Admin role catalog.", "AdminRoleListResponse"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/admin/users": {
        get: {
          operationId: "listAdminUsers",
          tags: ["Admin"],
          summary: "List users in the current tenant.",
          parameters: [...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Tenant users.", "AdminUser"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/admin/users/assignable": {
        get: {
          operationId: "listAssignableUsers",
          tags: ["Admin"],
          summary: "Minimal user list (id/email/display name/roles) for assigning ownership of new work - no admin_user:read required.",
          parameters: [...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Assignable tenant users.", "AssignableUser"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/admin/users/invite": {
        post: {
          operationId: "inviteAdminUser",
          tags: ["Admin"],
          summary: "Invite a tenant user and seed Cybernara role metadata.",
          parameters: [...requestContextHeaders()],
          requestBody: jsonRequest("InviteAdminUserRequest"),
          responses: {
            "201": jsonResponse("Tenant user invited.", "InviteAdminUserResponse"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/admin/users/{id}": {
        patch: {
          operationId: "updateAdminUser",
          tags: ["Admin"],
          summary: "Update a tenant user's active status, role, or clearance.",
          parameters: [pathParameter("id", "uuid"), ...requestContextHeaders()],
          requestBody: jsonRequest("UpdateAdminUserRequest"),
          responses: {
            "200": jsonResponse("Tenant user updated.", "AdminUser"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/tenants": {
        get: {
          operationId: "listPlatformTenants",
          tags: ["Platform"],
          summary: "List client tenants for platform onboarding oversight.",
          parameters: [...platformContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Client tenants.", "PlatformTenant"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        post: {
          operationId: "createPlatformTenant",
          tags: ["Platform"],
          summary: "Create a new client tenant.",
          parameters: [...platformContextHeaders()],
          requestBody: jsonRequest("CreatePlatformTenantRequest"),
          responses: {
            "201": jsonResponse("Client tenant created.", "PlatformTenant"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/dashboard": {
        get: {
          operationId: "getPlatformDashboard",
          tags: ["Platform"],
          summary: "Platform super-admin dashboard across all client tenants.",
          parameters: [...platformContextHeaders()],
          responses: {
            "200": jsonResponse("Platform dashboard aggregate.", "PlatformDashboardResponse"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/tenants/{tenantId}/deactivate": {
        post: {
          operationId: "deactivatePlatformTenant",
          tags: ["Platform"],
          summary: "Suspend a client tenant and revoke tenant-user login access.",
          parameters: [pathParameter("tenantId", "uuid"), ...platformContextHeaders()],
          responses: {
            "200": jsonResponse("Client tenant suspended.", "PlatformTenant"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/tenants/{tenantId}/activate": {
        post: {
          operationId: "activatePlatformTenant",
          tags: ["Platform"],
          summary: "Reactivate a suspended client tenant and restore tenant-user login access.",
          parameters: [pathParameter("tenantId", "uuid"), ...platformContextHeaders()],
          responses: {
            "200": jsonResponse("Client tenant activated.", "PlatformTenant"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/tenants/{tenantId}/admin-invite": {
        post: {
          operationId: "invitePlatformTenantAdmin",
          tags: ["Platform"],
          summary: "Create the first tenant-scoped admin for a client tenant.",
          parameters: [pathParameter("tenantId", "uuid"), ...platformContextHeaders()],
          requestBody: jsonRequest("InvitePlatformTenantAdminRequest"),
          responses: {
            "201": jsonResponse("Tenant admin invited.", "InviteAdminUserResponse"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/question-repository/questions": {
        get: {
          operationId: "listQuestionRepositoryEntries",
          tags: ["PlatformQuestionRepository"],
          summary: "Browse the global governed question repository.",
          parameters: [
            ...paginationParameters(),
            { name: "search", in: "query", required: false, schema: { type: "string" } },
            { name: "status", in: "query", required: false, schema: { $ref: "#/components/schemas/QuestionRepositoryStatus" } },
            { name: "harmonizedControlId", in: "query", required: false, schema: { type: "string" } },
            { name: "frameworkKey", in: "query", required: false, schema: { type: "string" } },
            ...platformContextHeaders()
          ],
          responses: {
            "200": jsonArrayResponse("Question repository entries.", "QuestionRepositoryEntry"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        post: {
          operationId: "createQuestionRepositoryDraft",
          tags: ["PlatformQuestionRepository"],
          summary: "Create a manually authored draft question.",
          parameters: [...platformContextHeaders()],
          requestBody: jsonRequest("CreateQuestionRepositoryDraftRequest"),
          responses: {
            "201": jsonResponse("Draft question created.", "QuestionRepositoryEntry"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/question-repository/controls": {
        get: {
          operationId: "listQuestionRepositoryControls",
          tags: ["PlatformQuestionRepository"],
          summary: "List harmonized controls with source-control overlap for repository authoring.",
          parameters: [
            ...paginationParameters(),
            { name: "search", in: "query", required: false, schema: { type: "string" } },
            ...platformContextHeaders()
          ],
          responses: {
            "200": jsonArrayResponse("Harmonized control contexts.", "QuestionRepositoryControlContext"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/question-repository/question-assist": {
        post: {
          operationId: "assistQuestionRepositoryDraft",
          tags: ["PlatformQuestionRepository"],
          summary: "Use the governed OpenAI question generator to suggest repository draft metadata.",
          parameters: [...platformContextHeaders()],
          requestBody: jsonRequest("AssistQuestionRepositoryDraftRequest"),
          responses: {
            "200": jsonResponse("AI-assisted repository draft suggestion.", "QuestionRepositoryAssistResult"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/question-repository/questions/{questionVersionId}/approve": {
        post: {
          operationId: "approveQuestionRepositoryEntry",
          tags: ["PlatformQuestionRepository"],
          summary: "Approve a draft or pending question version.",
          parameters: [pathParameter("questionVersionId", "uuid"), ...platformContextHeaders()],
          responses: {
            "200": jsonResponse("Question version approved.", "QuestionRepositoryEntry"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/question-repository/questions/{questionVersionId}/revisions": {
        post: {
          operationId: "createQuestionRepositoryRevision",
          tags: ["PlatformQuestionRepository"],
          summary: "Create a new draft version from an existing question version.",
          parameters: [pathParameter("questionVersionId", "uuid"), ...platformContextHeaders()],
          requestBody: jsonRequest("CreateQuestionRepositoryDraftRequest"),
          responses: {
            "201": jsonResponse("Draft revision created.", "QuestionRepositoryEntry"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/question-repository/questions/{questionVersionId}/status": {
        post: {
          operationId: "updateQuestionRepositoryStatus",
          tags: ["PlatformQuestionRepository"],
          summary: "Change lifecycle status without mutating approved question payload.",
          parameters: [pathParameter("questionVersionId", "uuid"), ...platformContextHeaders()],
          requestBody: jsonRequest("UpdateQuestionRepositoryStatusRequest"),
          responses: {
            "200": jsonResponse("Question version status updated.", "QuestionRepositoryEntry"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/question-repository/questions/{questionVersionId}/consumers": {
        get: {
          operationId: "getQuestionRepositoryConsumers",
          tags: ["PlatformQuestionRepository"],
          summary: "List frameworks and assessments that consume a question version.",
          parameters: [pathParameter("questionVersionId", "uuid"), ...platformContextHeaders()],
          responses: {
            "200": jsonResponse("Question consumers.", "QuestionRepositoryConsumers"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/question-repository/question-sets/{questionSetId}/versions": {
        get: {
          operationId: "compareQuestionRepositoryVersions",
          tags: ["PlatformQuestionRepository"],
          summary: "Compare every version for a question set.",
          parameters: [pathParameter("questionSetId", "uuid"), ...platformContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Question set version history.", "QuestionRepositoryEntry"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/question-repository/baseline-generation": {
        post: {
          operationId: "populateQuestionRepositoryBaseline",
          tags: ["PlatformQuestionRepository"],
          summary: "Idempotently seed approved curated baseline questions from the global catalog.",
          parameters: [...platformContextHeaders()],
          requestBody: jsonRequest("PopulateQuestionRepositoryBaselineRequest"),
          responses: {
            "200": jsonResponse("Baseline generation result.", "QuestionRepositoryPopulateResult"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/framework-content/source-packages": {
        get: {
          operationId: "listPlatformFrameworkSourcePackages",
          tags: ["PlatformFrameworkContent"],
          summary: "List global source workbook packages for platform content governance.",
          parameters: [...paginationParameters(), ...platformContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Global source packages.", "SourcePackage"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/framework-content/content-packs": {
        get: {
          operationId: "listPlatformFrameworkContentPacks",
          tags: ["PlatformFrameworkContent"],
          summary: "List global published framework content packs for platform content governance.",
          parameters: [...paginationParameters(), ...platformContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Global content packs.", "FrameworkContentPack"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/framework-content/requirements": {
        get: {
          operationId: "listPlatformFrameworkRequirements",
          tags: ["PlatformFrameworkContent"],
          summary: "List global canonical framework requirements, optionally filtered by framework.",
          parameters: [
            ...paginationParameters(),
            { name: "frameworkKey", in: "query", required: false, schema: { type: "string" } },
            ...platformContextHeaders()
          ],
          responses: {
            "200": jsonArrayResponse("Global framework requirements.", "FrameworkRequirement"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/framework-content/rejected-records": {
        get: {
          operationId: "listPlatformFrameworkRejectedRecords",
          tags: ["PlatformFrameworkContent"],
          summary: "List global rejected workbook records and diagnostics.",
          parameters: [...paginationParameters(), ...platformContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Global rejected workbook records.", "RejectedContentRecord"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/harmonization/controls": {
        get: {
          operationId: "listPlatformHarmonizedControls",
          tags: ["PlatformHarmonization"],
          summary: "List global published harmonized controls for platform content governance.",
          parameters: [...paginationParameters(), ...platformContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Global harmonized controls.", "HarmonizedControl"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/harmonization/controls/{harmonizedId}": {
        get: {
          operationId: "getPlatformHarmonizedControl",
          tags: ["PlatformHarmonization"],
          summary: "Fetch one global harmonized control by harmonized ID.",
          parameters: [pathParameter("harmonizedId"), ...platformContextHeaders()],
          responses: {
            "200": jsonResponse("Global harmonized control.", "HarmonizedControl"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/harmonization/controls/{harmonizedId}/mappings": {
        get: {
          operationId: "listPlatformHarmonizationMappingsByControl",
          tags: ["PlatformHarmonization"],
          summary: "List global mappings by harmonized control.",
          parameters: [pathParameter("harmonizedId"), ...paginationParameters(), ...platformContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Global mappings for the harmonized control.", "ControlMapping"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/harmonization/frameworks/{frameworkKey}/mappings": {
        get: {
          operationId: "listPlatformHarmonizationMappingsByFramework",
          tags: ["PlatformHarmonization"],
          summary: "List global mappings for a source framework.",
          parameters: [pathParameter("frameworkKey"), ...paginationParameters(), ...platformContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Global framework mappings.", "ControlMapping"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/harmonization/frameworks/{frameworkKey}/unique-controls": {
        get: {
          operationId: "listPlatformHarmonizationUniqueControlsByFramework",
          tags: ["PlatformHarmonization"],
          summary: "List global controls unique to a source framework.",
          parameters: [pathParameter("frameworkKey"), ...paginationParameters(), ...platformContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Global framework-unique controls.", "ControlMapping"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/frameworks/diffs": {
        get: {
          operationId: "listPlatformDiffs",
          tags: ["PlatformFrameworkUpdates"],
          summary: "List global framework version diffs for platform content governance.",
          parameters: [...paginationParameters(), ...platformContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Global framework diffs.", "FrameworkDiff"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/platform/frameworks/diffs/{id}/items": {
        get: {
          operationId: "listPlatformDiffItems",
          tags: ["PlatformFrameworkUpdates"],
          summary: "List global requirement changes for a framework diff.",
          parameters: [pathParameter("id", "uuid"), ...paginationParameters(), ...platformContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Global framework diff items.", "FrameworkDiffItem"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/audit/events": {
        get: {
          operationId: "listAuditEvents",
          tags: ["AuditSecurity"],
          summary: "List audit events with optional filters.",
          parameters: [
            ...paginationParameters(),
            { name: "eventType", in: "query", required: false, schema: { type: "string", maxLength: 200 } },
            { name: "targetType", in: "query", required: false, schema: { type: "string", maxLength: 200 } },
            { name: "targetId", in: "query", required: false, schema: { type: "string", maxLength: 200 } },
            { name: "actorId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
            {
              name: "classification",
              in: "query",
              required: false,
              schema: { enum: ["internal", "confidential", "restricted"] }
            },
            { name: "from", in: "query", required: false, schema: { type: "string", format: "date-time" } },
            { name: "to", in: "query", required: false, schema: { type: "string", format: "date-time" } },
            ...requestContextHeaders()
          ],
          responses: {
            "200": jsonArrayResponse("Audit events.", "AuditEvent"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        post: {
          operationId: "appendAuditEvent",
          tags: ["AuditSecurity"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuditEventInput" }
              }
            }
          },
          responses: {
            "201": {
              description: "Audit event appended.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuditEvent" }
                }
              }
            }
          }
        }
      },
      "/v1/audit/events/{eventId}": {
        get: {
          operationId: "getAuditEvent",
          tags: ["AuditSecurity"],
          parameters: [
            {
              name: "eventId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" }
            }
          ],
          responses: {
            "200": {
              description: "Audit event.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuditEvent" }
                }
              }
            },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/outbox/events": {
        post: {
          operationId: "publishOutboxEvent",
          tags: ["Outbox"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublishOutboxEventRequest" }
              }
            }
          },
          responses: {
            "201": {
              description: "Outbox event enqueued idempotently.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OutboxEvent" }
                }
              }
            }
          }
        }
      },
      "/v1/framework-content/ingestion-runs": {
        post: {
          operationId: "publishFrameworkContentIngestion",
          tags: ["FrameworkContent"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublishContentIngestionRequest" }
              }
            }
          },
          responses: {
            "201": jsonResponse("Source content persisted.", "ContentIngestionPublishResult"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/framework-content/source-packages": {
        get: {
          operationId: "listFrameworkSourcePackages",
          tags: ["FrameworkContent"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Source workbook packages.", "SourcePackage"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/framework-content/content-packs": {
        get: {
          operationId: "listFrameworkContentPacks",
          tags: ["FrameworkContent"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Published framework content packs.", "FrameworkContentPack"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/framework-content/enabled-frameworks": {
        get: {
          operationId: "listEnabledFrameworks",
          tags: ["FrameworkContent"],
          summary: "List framework versions enabled for the current tenant.",
          parameters: [...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Enabled framework versions.", "FrameworkEnablement"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        post: {
          operationId: "enableFramework",
          tags: ["FrameworkContent"],
          summary: "Enable a published framework version for the current tenant.",
          parameters: [...requestContextHeaders()],
          requestBody: jsonRequest("EnableFrameworkRequest"),
          responses: {
            "201": jsonResponse("Framework version enabled.", "FrameworkEnablement"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/framework-content/enabled-frameworks/disable": {
        post: {
          operationId: "disableFramework",
          tags: ["FrameworkContent"],
          summary: "Disable an enabled framework version for the current tenant.",
          parameters: [...requestContextHeaders()],
          requestBody: jsonRequest("EnableFrameworkRequest"),
          responses: {
            "200": jsonResponse("Framework version disabled.", "FrameworkEnablement"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/framework-content/question-options": {
        get: {
          operationId: "listAssessmentQuestionOptions",
          tags: ["FrameworkContent"],
          summary: "List active approved question versions selectable for assessment creation.",
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Assessment question options.", "AssessmentQuestionOption"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/framework-content/content-packs/{packId}": {
        get: {
          operationId: "getFrameworkContentPack",
          tags: ["FrameworkContent"],
          parameters: [pathParameter("packId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Published framework content pack.", "FrameworkContentPack"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/framework-content/content-packs/{packId}/requirements": {
        get: {
          operationId: "listFrameworkContentPackRequirements",
          tags: ["FrameworkContent"],
          parameters: [pathParameter("packId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Canonical requirements for a content pack.", "FrameworkRequirement"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/framework-content/requirements": {
        get: {
          operationId: "listFrameworkRequirements",
          tags: ["FrameworkContent"],
          parameters: [
            {
              name: "frameworkKey",
              in: "query",
              required: false,
              schema: { type: "string" }
            },
            ...paginationParameters(),
            ...requestContextHeaders()
          ],
          responses: {
            "200": jsonArrayResponse("Canonical framework requirements.", "FrameworkRequirement"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/framework-content/rejected-records": {
        get: {
          operationId: "listFrameworkRejectedRecords",
          tags: ["FrameworkContent"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Rejected source records.", "RejectedContentRecord"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/harmonization/controls": {
        get: {
          operationId: "listHarmonizedControls",
          tags: ["Harmonization"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Published harmonized controls.", "HarmonizedControl"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/harmonization/controls/{harmonizedId}": {
        get: {
          operationId: "getHarmonizedControl",
          tags: ["Harmonization"],
          parameters: [pathParameter("harmonizedId"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Published harmonized control.", "HarmonizedControl"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/harmonization/controls/{harmonizedId}/mappings": {
        get: {
          operationId: "listHarmonizationMappingsByControl",
          tags: ["Harmonization"],
          parameters: [pathParameter("harmonizedId"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Mappings for a harmonized control.", "ControlMapping"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/harmonization/frameworks/{frameworkKey}/mappings": {
        get: {
          operationId: "listHarmonizationMappingsByFramework",
          tags: ["Harmonization"],
          parameters: [pathParameter("frameworkKey"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Mappings for a source framework.", "ControlMapping"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/harmonization/frameworks/{frameworkKey}/unique-controls": {
        get: {
          operationId: "listHarmonizationUniqueControlsByFramework",
          tags: ["Harmonization"],
          parameters: [pathParameter("frameworkKey"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Controls unique to a source framework.", "ControlMapping"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/tenant-questions": {
        get: {
          operationId: "listTenantQuestions",
          tags: ["TenantQuestions"],
          parameters: [...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Tenant custom questions.", "TenantQuestion"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        post: {
          operationId: "createTenantQuestion",
          tags: ["TenantQuestions"],
          parameters: [...requestContextHeaders()],
          requestBody: jsonRequest("CreateTenantQuestionRequest"),
          responses: {
            "201": jsonResponse("Custom question created.", "TenantQuestion"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/tenant-questions/{questionId}": {
        get: {
          operationId: "getTenantQuestion",
          tags: ["TenantQuestions"],
          parameters: [pathParameter("questionId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Custom question.", "TenantQuestion"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/tenant-questions/{questionId}/create-assessment": {
        post: {
          operationId: "createAssessmentForCustomQuestion",
          tags: ["TenantQuestions"],
          parameters: [pathParameter("questionId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateAssessmentFromQuestionRequest"),
          responses: {
            "201": jsonResponse("Assessment created from custom question.", "Assessment"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/questions-dashboard/questions": {
        get: {
          operationId: "listDashboardQuestions",
          tags: ["QuestionsDashboard"],
          parameters: [...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Unified canonical + custom question list with completion status.", "UnifiedQuestion"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/questions-dashboard/summary": {
        get: {
          operationId: "getQuestionsDashboardSummary",
          tags: ["QuestionsDashboard"],
          parameters: [...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Overall + per-framework compliance summary.", "DashboardSummary"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments": {
        post: {
          operationId: "createAssessment",
          tags: ["Assessment"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateAssessmentRequest" }
              }
            }
          },
          responses: {
            "201": jsonResponse("Assessment created.", "Assessment"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listAssessments",
          tags: ["Assessment"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Assessments.", "Assessment"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}": {
        patch: {
          operationId: "updateDraftAssessment",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateAssessmentRequest"),
          responses: {
            "200": jsonResponse("Draft assessment updated.", "Assessment"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "getAssessment",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Assessment.", "Assessment"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/items": {
        get: {
          operationId: "listAssessmentItems",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Assessment items.", "AssessmentItem"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/items/{itemId}": {
        get: {
          operationId: "getAssessmentItem",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), pathParameter("itemId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Assessment item.", "AssessmentItem"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/items/{itemId}/applicability": {
        post: {
          operationId: "approveAssessmentApplicability",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), pathParameter("itemId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("AssessmentApplicabilityRequest"),
          responses: {
            "200": jsonResponse("Updated assessment.", "Assessment"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/items/{itemId}/answers": {
        post: {
          operationId: "submitAssessmentAnswer",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), pathParameter("itemId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("AssessmentAnswerRequest"),
          responses: {
            "200": jsonResponse("Updated assessment.", "Assessment"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/items/{itemId}/reviews": {
        post: {
          operationId: "reviewAssessmentItem",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), pathParameter("itemId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("AssessmentReviewRequest"),
          responses: {
            "200": jsonResponse("Updated assessment.", "Assessment"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/items/{itemId}/reopen": {
        post: {
          operationId: "reopenAssessmentItem",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), pathParameter("itemId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("AssessmentReopenRequest"),
          responses: {
            "200": jsonResponse("Updated assessment.", "Assessment"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/close": {
        post: {
          operationId: "closeAssessment",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Closed assessment.", "Assessment"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/items/{itemId}/answers/history": {
        get: {
          operationId: "listAssessmentAnswerHistory",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), pathParameter("itemId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Answer revision history.", "AnswerRevision"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/items/{itemId}/applicability/history": {
        get: {
          operationId: "listAssessmentApplicabilityHistory",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), pathParameter("itemId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Applicability decision history.", "ApplicabilityDecision"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/items/{itemId}/reviews/history": {
        get: {
          operationId: "listAssessmentReviewHistory",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), pathParameter("itemId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Review decision history.", "ReviewDecision"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/signoffs": {
        get: {
          operationId: "listAssessmentSignoffs",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Assessment sign-offs.", "AssessmentSignoff"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/items/{itemId}/test-procedures": {
        post: {
          operationId: "createAssessmentTestProcedure",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), pathParameter("itemId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateTestProcedureRequest"),
          responses: {
            "201": jsonResponse("Test procedure created.", "TestProcedure"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listAssessmentTestProcedures",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), pathParameter("itemId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Test procedures.", "TestProcedure"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/assessments/{assessmentId}/items/{itemId}/test-results": {
        post: {
          operationId: "recordAssessmentControlTestResult",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), pathParameter("itemId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("RecordManualControlTestResultRequest"),
          responses: {
            "201": jsonResponse("Control test result recorded.", "ManualControlTestResult"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listAssessmentControlTestResults",
          tags: ["Assessment"],
          parameters: [pathParameter("assessmentId", "uuid"), pathParameter("itemId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Control test results.", "ManualControlTestResult"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/objects": {
        post: {
          operationId: "initiateEvidenceUpload",
          tags: ["EvidenceAssurance"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("InitiateEvidenceUploadRequest"),
          responses: {
            "201": jsonResponse("Evidence upload initiated.", "EvidenceObject"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listEvidenceObjects",
          tags: ["EvidenceAssurance"],
          parameters: [
            {
              name: "state",
              in: "query",
              required: false,
              schema: { $ref: "#/components/schemas/EvidenceState" }
            },
            ...paginationParameters(),
            ...requestContextHeaders()
          ],
          responses: {
            "200": jsonArrayResponse("Evidence objects.", "EvidenceObject"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/objects/upload-policy": {
        get: {
          operationId: "getEvidenceUploadPolicy",
          tags: ["EvidenceAssurance"],
          parameters: [...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Evidence upload policy.", "EvidenceUploadPolicy"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/objects/{evidenceId}": {
        get: {
          operationId: "getEvidenceObject",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Evidence object.", "EvidenceObject"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/objects/{evidenceId}/scan-status": {
        get: {
          operationId: "getEvidenceScanStatus",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Evidence scan status.", "EvidenceScanStatus"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/objects/{evidenceId}/download": {
        get: {
          operationId: "downloadEvidenceObject",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": {
              description: "Evidence file content.",
              content: {
                "application/octet-stream": {
                  schema: { type: "string", format: "binary" }
                }
              }
            },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" },
            "409": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/objects/{evidenceId}/quarantine": {
        post: {
          operationId: "quarantineEvidenceObject",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("QuarantineEvidenceRequest"),
          responses: {
            "200": jsonResponse("Quarantined evidence object.", "EvidenceObject"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/objects/{evidenceId}/commit": {
        post: {
          operationId: "commitEvidenceObject",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CommitEvidenceRequest"),
          responses: {
            "200": jsonResponse("Committed or rejected evidence object.", "EvidenceObject"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/objects/{evidenceId}/upload": {
        post: {
          operationId: "uploadEvidenceObject",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("UploadEvidenceBytesRequest"),
          responses: {
            "200": jsonResponse("Uploaded, scanned, and committed/rejected evidence object.", "EvidenceObject"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/objects/{evidenceId}/reuse-check": {
        post: {
          operationId: "checkEvidenceReuse",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceId", "uuid"), ...requestContextHeaders()],
          requestBody: jsonRequest("EvidenceReuseCheckRequest"),
          responses: {
            "200": jsonResponse("Evidence reuse decision.", "EvidenceReuseDecision"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/objects/{evidenceId}/versions": {
        get: {
          operationId: "listEvidenceVersions",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Evidence versions.", "EvidenceVersion"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/objects/{evidenceId}/expiry-events": {
        post: {
          operationId: "createEvidenceExpiryEvent",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateEvidenceExpiryEventRequest"),
          responses: {
            "201": jsonResponse("Evidence expiry event recorded.", "EvidenceExpiryEvent"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listEvidenceExpiryEvents",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Evidence expiry events.", "EvidenceExpiryEvent"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/versions/{evidenceVersionId}/links": {
        post: {
          operationId: "createEvidenceLink",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceVersionId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateEvidenceLinkRequest"),
          responses: {
            "201": jsonResponse("Evidence link created.", "EvidenceLink"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listEvidenceLinks",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceVersionId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Evidence links.", "EvidenceLink"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/versions/{evidenceVersionId}/malware-scans": {
        get: {
          operationId: "listMalwareScanResults",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceVersionId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Malware scan results.", "MalwareScanResult"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/versions/{evidenceVersionId}/custody-events": {
        get: {
          operationId: "listEvidenceCustodyEvents",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceVersionId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Evidence custody events.", "EvidenceCustodyEvent"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/versions/{evidenceVersionId}/reviews": {
        post: {
          operationId: "createEvidenceReview",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceVersionId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateEvidenceReviewRequest"),
          responses: {
            "201": jsonResponse("Evidence review created.", "EvidenceReview"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listEvidenceReviews",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("evidenceVersionId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Evidence reviews.", "EvidenceReview"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/requests": {
        post: {
          operationId: "createEvidenceRequest",
          tags: ["EvidenceAssurance"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateEvidenceRequestRequest"),
          responses: {
            "201": jsonResponse("Evidence request created.", "EvidenceRequest"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listEvidenceRequests",
          tags: ["EvidenceAssurance"],
          parameters: [
            { name: "assessmentId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
            ...paginationParameters(),
            ...requestContextHeaders()
          ],
          responses: {
            "200": jsonArrayResponse("Evidence requests.", "EvidenceRequest"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/automated-tests": {
        post: {
          operationId: "createAutomatedTest",
          tags: ["EvidenceAssurance"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateAutomatedTestRequest"),
          responses: {
            "201": jsonResponse("Automated test created.", "AutomatedTest"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listAutomatedTests",
          tags: ["EvidenceAssurance"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Automated tests.", "AutomatedTest"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/automated-tests/{automatedTestId}": {
        get: {
          operationId: "getAutomatedTest",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("automatedTestId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Automated test.", "AutomatedTest"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/automated-tests/{automatedTestId}/runs": {
        post: {
          operationId: "createAutomatedTestRun",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("automatedTestId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateAutomatedTestRunRequest"),
          responses: {
            "201": jsonResponse("Automated test run created.", "AutomatedTestRun"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listAutomatedTestRuns",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("automatedTestId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Automated test runs.", "AutomatedTestRun"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/evidence/test-results/{testResultId}/samples": {
        post: {
          operationId: "createEvidenceSample",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("testResultId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateEvidenceSampleRequest"),
          responses: {
            "201": jsonResponse("Evidence sample created.", "EvidenceSample"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listEvidenceSamples",
          tags: ["EvidenceAssurance"],
          parameters: [pathParameter("testResultId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Evidence samples.", "EvidenceSample"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/findings": {
        post: {
          operationId: "createRiskFinding",
          tags: ["RiskWorkflow"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateFindingRequest"),
          responses: {
            "201": jsonResponse("Finding created.", "Finding"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listRiskFindings",
          tags: ["RiskWorkflow"],
          parameters: [
            {
              name: "assessmentItemId",
              in: "query",
              required: false,
              schema: { type: "string", format: "uuid" }
            },
            {
              name: "testResultId",
              in: "query",
              required: false,
              schema: { type: "string", format: "uuid" }
            },
            ...paginationParameters(),
            ...requestContextHeaders()
          ],
          responses: {
            "200": jsonArrayResponse("Findings.", "Finding"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/findings/assist": {
        post: {
          operationId: "assistRiskFinding",
          tags: ["RiskWorkflow"],
          parameters: [...requestContextHeaders()],
          requestBody: jsonRequest("FindingAssistRequest"),
          responses: {
            "200": jsonResponse("AI-assisted finding recommendation.", "FindingAssistRecommendation"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "502": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/findings/{findingId}": {
        get: {
          operationId: "getRiskFinding",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("findingId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Finding.", "Finding"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        patch: {
          operationId: "updateRiskFinding",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("findingId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("UpdateFindingRequest"),
          responses: {
            "200": jsonResponse("Updated finding.", "Finding"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/tasks": {
        get: {
          operationId: "listUniversalTasks",
          tags: ["Tasks"],
          parameters: [
            ...paginationParameters(),
            { name: "ownerId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
            { name: "status", in: "query", required: false, schema: { $ref: "#/components/schemas/UniversalTaskStatus" } },
            { name: "priority", in: "query", required: false, schema: { $ref: "#/components/schemas/UniversalTaskPriority" } },
            ...requestContextHeaders()
          ],
          responses: {
            "200": {
              description: "Universal tasks listed.",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/UniversalTask" }
                  }
                }
              }
            },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/tasks/{id}": {
        get: {
          operationId: "getUniversalTask",
          tags: ["Tasks"],
          parameters: [
            pathParameter("id", "uuid"),
            ...requestContextHeaders()
          ],
          responses: {
            "200": jsonResponse("Universal task.", "UniversalTask"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        patch: {
          operationId: "updateUniversalTask",
          tags: ["Tasks"],
          parameters: [
            pathParameter("id", "uuid"),
            ...requestContextHeaders()
          ],
          requestBody: jsonRequest("UpdateUniversalTaskRequest"),
          responses: {
            "200": jsonResponse("Updated universal task.", "UniversalTask"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/frameworks/diffs": {
        post: {
          operationId: "calculateDiff",
          tags: ["FrameworkUpdates"],
          summary: "Calculate and apply diff between two framework versions",
          parameters: [
            ...requestContextHeaders()
          ],
          requestBody: jsonRequest("CalculateDiffRequest"),
          responses: {
            "201": jsonResponse("Calculated version diff.", "FrameworkDiff"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listDiffs",
          tags: ["FrameworkUpdates"],
          summary: "List calculated version diffs",
          parameters: [
            ...paginationParameters(),
            ...requestContextHeaders()
          ],
          responses: {
            "200": {
              description: "Calculated diffs.",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/FrameworkDiff" }
                  }
                }
              }
            },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/frameworks/diffs/{id}/items": {
        get: {
          operationId: "listDiffItems",
          tags: ["FrameworkUpdates"],
          summary: "List diff items for a calculated diff",
          parameters: [
            pathParameter("id", "uuid"),
            ...paginationParameters(),
            ...requestContextHeaders()
          ],
          responses: {
            "200": {
              description: "Diff items.",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/FrameworkDiffItem" }
                  }
                }
              }
            },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/frameworks/updates/impacts": {
        get: {
          operationId: "listImpacts",
          tags: ["FrameworkUpdates"],
          summary: "List framework update impact items",
          parameters: [
            ...paginationParameters(),
            ...requestContextHeaders()
          ],
          responses: {
            "200": {
              description: "Framework update impacts.",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/FrameworkUpdateImpact" }
                  }
                }
              }
            },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/frameworks/updates/impacts/{id}": {
        patch: {
          operationId: "resolveImpact",
          tags: ["FrameworkUpdates"],
          summary: "Resolve a framework update impact item",
          parameters: [
            pathParameter("id", "uuid"),
            ...requestContextHeaders()
          ],
          requestBody: jsonRequest("ResolveImpactRequest"),
          responses: {
            "200": jsonResponse("Resolved framework update impact.", "FrameworkUpdateImpact"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/remediation-tasks": {
        post: {
          operationId: "createRemediationTask",
          tags: ["RiskWorkflow"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateRemediationTaskRequest"),
          responses: {
            "201": jsonResponse("Remediation task created.", "RemediationTask"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listRemediationTasks",
          tags: ["RiskWorkflow"],
          parameters: [
            {
              name: "findingId",
              in: "query",
              required: false,
              schema: { type: "string", format: "uuid" }
            },
            ...paginationParameters(),
            ...requestContextHeaders()
          ],
          responses: {
            "200": jsonArrayResponse("Remediation tasks.", "RemediationTask"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/remediation-tasks/{taskId}": {
        get: {
          operationId: "getRemediationTask",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("taskId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Remediation task.", "RemediationTask"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        patch: {
          operationId: "updateRemediationTask",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("taskId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("UpdateRemediationTaskRequest"),
          responses: {
            "200": jsonResponse("Updated remediation task.", "RemediationTask"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/remediation-tasks/{taskId}/reviews": {
        get: {
          operationId: "listRemediationTaskReviews",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("taskId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Remediation task reviews.", "RemediationTaskReview"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        post: {
          operationId: "reviewRemediationTask",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("taskId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("RemediationTaskReviewRequest"),
          responses: {
            "201": jsonResponse("Remediation task review recorded.", "RemediationTaskReview"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/remediation-tasks/{taskId}/risk-acceptance": {
        post: {
          operationId: "acceptRemediationTaskRisk",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("taskId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("RiskAcceptanceRequest"),
          responses: {
            "200": jsonResponse("Risk accepted remediation task.", "RemediationTask"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "getRemediationTaskRiskAcceptance",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("taskId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Risk acceptance.", "RiskAcceptance"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/remediation-tasks/{taskId}/risk-acceptance/reviews": {
        post: {
          operationId: "reviewRemediationTaskRiskAcceptance",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("taskId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("RiskAcceptanceReviewRequest"),
          responses: {
            "201": jsonResponse("Recorded review.", "RiskAcceptanceReview"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" },
            "409": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/risk-models": {
        post: {
          operationId: "createRiskModel",
          tags: ["RiskWorkflow"],
          parameters: [...requestContextHeaders()],
          requestBody: jsonRequest("CreateRiskModelRequest"),
          responses: {
            "201": jsonResponse("Risk model created.", "RiskModel"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listRiskModels",
          tags: ["RiskWorkflow"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Risk models.", "RiskModel"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/risks": {
        post: {
          operationId: "createRisk",
          tags: ["RiskWorkflow"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateRiskRequest"),
          responses: {
            "201": jsonResponse("Risk created.", "Risk"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listRisks",
          tags: ["RiskWorkflow"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Risks.", "Risk"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/risks/assist": {
        post: {
          operationId: "assistRiskProposal",
          tags: ["RiskWorkflow"],
          parameters: [...requestContextHeaders()],
          requestBody: jsonRequest("RiskAssistRequest"),
          responses: {
            "200": jsonResponse("AI-assisted risk proposal.", "RiskAssistRecommendation"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "502": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/risks/{riskId}": {
        get: {
          operationId: "getRisk",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("riskId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Risk.", "Risk"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/risks/{riskId}/links": {
        post: {
          operationId: "createRiskLink",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("riskId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateRiskLinkRequest"),
          responses: {
            "201": jsonResponse("Risk link created.", "RiskLink"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listRiskLinks",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("riskId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Risk links.", "RiskLink"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/risk-workflow/risks/{riskId}/treatments": {
        post: {
          operationId: "createRiskTreatment",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("riskId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateRiskTreatmentRequest"),
          responses: {
            "201": jsonResponse("Risk treatment created.", "RiskTreatment"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listRiskTreatments",
          tags: ["RiskWorkflow"],
          parameters: [pathParameter("riskId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Risk treatments.", "RiskTreatment"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/report-exports": {
        post: {
          operationId: "requestReportExport",
          tags: ["ReportingAnalytics"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("RequestReportExportRequest"),
          responses: {
            "201": jsonResponse("Report export requested.", "ReportExport"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listReportExports",
          tags: ["ReportingAnalytics"],
          parameters: [
            {
              name: "assessmentId",
              in: "query",
              required: false,
              schema: { type: "string", format: "uuid" }
            },
            ...paginationParameters(),
            ...requestContextHeaders()
          ],
          responses: {
            "200": jsonArrayResponse("Report exports.", "ReportExport"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/report-exports/{exportId}": {
        get: {
          operationId: "getReportExport",
          tags: ["ReportingAnalytics"],
          parameters: [pathParameter("exportId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Report export.", "ReportExport"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/report-exports/{exportId}/download": {
        get: {
          operationId: "downloadReportExport",
          tags: ["ReportingAnalytics"],
          parameters: [pathParameter("exportId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": {
              description: "Report export artifact.",
              content: {
                "application/octet-stream": {
                  schema: { type: "string", format: "binary" }
                }
              }
            },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" },
            "409": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/notifications": {
        get: {
          operationId: "listNotifications",
          tags: ["Notifications"],
          parameters: [...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Live, role-aware notification feed. Nothing is stored - a notification exists only while its underlying condition is true.", "NotificationFeed"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/audit-reports/closed-assessments": {
        get: {
          operationId: "listClosedAssessmentsForAudit",
          tags: ["AuditReports"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Closed assessments with report status.", "ClosedAssessmentSummary"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/audit-reports/assessments/{assessmentId}": {
        get: {
          operationId: "listAuditReportsForAssessment",
          tags: ["AuditReports"],
          parameters: [pathParameter("assessmentId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Audit reports for this assessment.", "AuditReport"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/audit-reports/assessments/{assessmentId}/generate": {
        post: {
          operationId: "generateAuditReport",
          tags: ["AuditReports"],
          parameters: [pathParameter("assessmentId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          responses: {
            "201": jsonResponse("Audit report generated from this assessment's live data. No AI call is made.", "AuditReport"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/audit-reports/{reportId}": {
        get: {
          operationId: "getAuditReport",
          tags: ["AuditReports"],
          parameters: [pathParameter("reportId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Audit report.", "AuditReport"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/audit-reports/{reportId}/download": {
        get: {
          operationId: "downloadAuditReport",
          tags: ["AuditReports"],
          parameters: [pathParameter("reportId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": {
              description: "Audit report PDF artifact.",
              content: {
                "application/pdf": {
                  schema: { type: "string", format: "binary" }
                }
              }
            },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/question-generations": {
        post: {
          operationId: "requestAiQuestionGeneration",
          tags: ["AIOrchestration"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("AiQuestionGenerationRequest"),
          responses: {
            "201": jsonResponse("AI question generation requested.", "AiGenerationRun"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/question-generations/fallback": {
        post: {
          operationId: "triggerAiQuestionFallback",
          tags: ["AIOrchestration"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("AiFallbackGenerationRequest"),
          responses: {
            "201": jsonResponse("Fallback generation created.", "AiGenerationRun"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/questions/pending-review": {
        get: {
          operationId: "listPendingAiQuestions",
          tags: ["AIOrchestration"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Pending AI question versions.", "AiQuestionVersion"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/questions/approved": {
        get: {
          operationId: "listApprovedAiQuestions",
          tags: ["AIOrchestration"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Approved AI question versions.", "AiQuestionVersion"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/question-generations/{generationRunId}/provenance": {
        get: {
          operationId: "getAiGenerationProvenance",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("generationRunId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("AI generation provenance.", "AiGenerationProvenance"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/question-generations/{generationRunId}/reviews": {
        post: {
          operationId: "reviewAiGeneration",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("generationRunId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("AiGenerationReviewRequest"),
          responses: {
            "201": jsonResponse("Reviewed AI generation.", "AiGenerationRun"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/question-generations/{generationRunId}/publish": {
        post: {
          operationId: "publishAiGenerationQuestions",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("generationRunId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          responses: {
            "201": jsonResponse("Published approved AI question generation.", "AiGenerationRun"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" },
            "409": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/questions/{questionId}/publish": {
        post: {
          operationId: "publishAiQuestion",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("questionId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          responses: {
            "201": jsonResponse("Published AI question.", "AiQuestionVersion"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" },
            "409": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/questions/{questionId}/publication-events": {
        get: {
          operationId: "listAiQuestionPublicationEvents",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("questionId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("AI publication events.", "AiPublicationEvent"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/knowledge-chunks": {
        post: {
          operationId: "createKnowledgeChunk",
          tags: ["AIOrchestration"],
          parameters: [...requestContextHeaders()],
          requestBody: jsonRequest("CreateKnowledgeChunkRequest"),
          responses: {
            "201": jsonResponse("Knowledge chunk created.", "KnowledgeChunk"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listKnowledgeChunks",
          tags: ["AIOrchestration"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Knowledge chunks.", "KnowledgeChunk"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/retrieval-runs": {
        post: {
          operationId: "createRetrievalRun",
          tags: ["AIOrchestration"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateRetrievalRunRequest"),
          responses: {
            "201": jsonResponse("Retrieval run created.", "RetrievalRun"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listRetrievalRuns",
          tags: ["AIOrchestration"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Retrieval runs.", "RetrievalRun"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/retrieval-runs/{runId}/chunks": {
        post: {
          operationId: "createRetrievedChunk",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("runId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateRetrievedChunkRequest"),
          responses: {
            "201": jsonResponse("Retrieved chunk recorded.", "RetrievedChunk"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listRetrievedChunks",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("runId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Retrieved chunks.", "RetrievedChunk"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/question-generations/{generationRunId}/citations": {
        post: {
          operationId: "createGenerationCitation",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("generationRunId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateGenerationCitationRequest"),
          responses: {
            "201": jsonResponse("Generation citation recorded.", "GenerationCitation"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listGenerationCitations",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("generationRunId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Generation citations.", "GenerationCitation"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/question-generations/{generationRunId}/safety-checks": {
        post: {
          operationId: "createSafetyCheck",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("generationRunId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateSafetyCheckRequest"),
          responses: {
            "201": jsonResponse("Safety check recorded.", "SafetyCheck"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listSafetyChecks",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("generationRunId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Safety checks.", "SafetyCheck"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/evaluation-suites": {
        post: {
          operationId: "createEvaluationSuite",
          tags: ["AIOrchestration"],
          parameters: [...requestContextHeaders()],
          requestBody: jsonRequest("CreateEvaluationSuiteRequest"),
          responses: {
            "201": jsonResponse("Evaluation suite created.", "EvaluationSuite"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listEvaluationSuites",
          tags: ["AIOrchestration"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Evaluation suites.", "EvaluationSuite"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/evaluation-suites/{suiteId}": {
        get: {
          operationId: "getEvaluationSuite",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("suiteId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Evaluation suite.", "EvaluationSuite"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/evaluation-suites/{suiteId}/cases": {
        post: {
          operationId: "createEvaluationCase",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("suiteId", "uuid"), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateEvaluationCaseRequest"),
          responses: {
            "201": jsonResponse("Evaluation case created.", "EvaluationCase"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listEvaluationCases",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("suiteId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Evaluation cases.", "EvaluationCase"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/ai-orchestration/evaluation-suites/{suiteId}/results": {
        post: {
          operationId: "createEvaluationResult",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("suiteId", "uuid"), ...requestContextHeaders()],
          requestBody: jsonRequest("CreateEvaluationResultRequest"),
          responses: {
            "201": jsonResponse("Evaluation result created.", "EvaluationResult"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listEvaluationResults",
          tags: ["AIOrchestration"],
          parameters: [pathParameter("suiteId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Evaluation results.", "EvaluationResult"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/integration-platform/connectors": {
        post: {
          operationId: "registerIntegrationConnector",
          tags: ["IntegrationPlatform"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("RegisterIntegrationConnectorRequest"),
          responses: {
            "201": jsonResponse("Connector registered.", "IntegrationConnector"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listIntegrationConnectors",
          tags: ["IntegrationPlatform"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Connectors.", "IntegrationConnector"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/integration-platform/connectors/{connectorId}": {
        get: {
          operationId: "getIntegrationConnector",
          tags: ["IntegrationPlatform"],
          parameters: [pathParameter("connectorId", "uuid"), ...requestContextHeaders()],
          responses: {
            "200": jsonResponse("Connector.", "IntegrationConnector"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/integration-platform/connectors/{connectorId}/sync-runs": {
        post: {
          operationId: "recordConnectorSyncRun",
          tags: ["IntegrationPlatform"],
          parameters: [pathParameter("connectorId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("RecordConnectorSyncRunRequest"),
          responses: {
            "201": jsonResponse("Connector sync run recorded.", "ConnectorSyncRunResult"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listConnectorSyncRuns",
          tags: ["IntegrationPlatform"],
          parameters: [pathParameter("connectorId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Connector sync runs.", "ConnectorSyncRun"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/integration-platform/connectors/{connectorId}/objects": {
        post: {
          operationId: "recordConnectorObject",
          tags: ["IntegrationPlatform"],
          parameters: [pathParameter("connectorId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("RecordConnectorObjectRequest"),
          responses: {
            "201": jsonResponse("Connector object recorded.", "ConnectorObject"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listConnectorObjects",
          tags: ["IntegrationPlatform"],
          parameters: [pathParameter("connectorId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Connector objects.", "ConnectorObject"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/integration-platform/webhook-contracts": {
        post: {
          operationId: "registerWebhookContract",
          tags: ["IntegrationPlatform"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("RegisterWebhookContractRequest"),
          responses: {
            "201": jsonResponse("Webhook contract registered.", "WebhookContract"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listWebhookContracts",
          tags: ["IntegrationPlatform"],
          parameters: [...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Webhook contracts.", "WebhookContract"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/integration-platform/webhook-contracts/{webhookId}/deliveries": {
        post: {
          operationId: "recordWebhookDelivery",
          tags: ["IntegrationPlatform"],
          parameters: [pathParameter("webhookId", "uuid"), idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("RecordWebhookDeliveryRequest"),
          responses: {
            "201": jsonResponse("Webhook delivery recorded.", "WebhookDelivery"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listWebhookDeliveries",
          tags: ["IntegrationPlatform"],
          parameters: [pathParameter("webhookId", "uuid"), ...paginationParameters(), ...requestContextHeaders()],
          responses: {
            "200": jsonArrayResponse("Webhook delivery log.", "WebhookDelivery"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/integration-platform/control-tests": {
        post: {
          operationId: "recordAutomatedControlTest",
          tags: ["IntegrationPlatform"],
          parameters: [idempotencyHeader(), ...requestContextHeaders()],
          requestBody: jsonRequest("RecordAutomatedControlTestRequest"),
          responses: {
            "201": jsonResponse("Automated control-test result recorded.", "AutomatedControlTestResultResponse"),
            "400": { $ref: "#/components/responses/Problem" },
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" },
            "404": { $ref: "#/components/responses/Problem" }
          }
        },
        get: {
          operationId: "listAutomatedControlTests",
          tags: ["IntegrationPlatform"],
          parameters: [
            { name: "connectorId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
            { name: "controlRef", in: "query", required: false, schema: { type: "string" } },
            ...paginationParameters(),
            ...requestContextHeaders()
          ],
          responses: {
            "200": jsonArrayResponse("Automated control-test results.", "AutomatedControlTest"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      "/v1/integration-platform/assurance-alerts": {
        get: {
          operationId: "listAssuranceAlerts",
          tags: ["IntegrationPlatform"],
          parameters: [
            { name: "status", in: "query", required: false, schema: { $ref: "#/components/schemas/AssuranceAlertStatus" } },
            ...paginationParameters(),
            ...requestContextHeaders()
          ],
          responses: {
            "200": jsonArrayResponse("Assurance alerts.", "AssuranceAlert"),
            "401": { $ref: "#/components/responses/Problem" },
            "403": { $ref: "#/components/responses/Problem" }
          }
        }
      },
      ...privacyOperationsPaths(),
      ...privacyGraphPaths(),
      ...enterpriseGrcPaths(),
      ...auditChainPaths()
    },
    components: {
      responses: {
        Problem: {
          description: "RFC 9457-style problem response.",
          content: {
            "application/problem+json": {
              schema: { $ref: "#/components/schemas/Problem" }
            }
          }
        }
      },
      schemas: {
        RootStatusResponse: {
          type: "object",
          required: ["service", "status", "apiVersion", "openapiSpecPath", "routeCount", "modules", "documentation"],
          properties: {
            service: { type: "string", const: "cybernara-backend" },
            status: { type: "string", const: "ok" },
            apiVersion: { type: "string" },
            openapiSpecPath: { type: ["string", "null"] },
            routeCount: { type: "integer", minimum: 1 },
            modules: { type: "array", minItems: 1, items: { type: "string" } },
            documentation: { type: "string" }
          }
        },
        HealthResponse: {
          type: "object",
          required: ["status", "service", "apiVersion"],
          properties: {
            status: { type: "string", const: "ok" },
            service: { type: "string" },
            apiVersion: { type: "string" }
          }
        },
        Classification: {
          enum: ["public", "internal", "confidential", "restricted"]
        },
        RegisterTenantRequest: {
          type: "object",
          required: ["id", "name", "createdBy"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", minLength: 2 },
            createdBy: { type: "string", format: "uuid" },
            classification: { $ref: "#/components/schemas/Classification" }
          }
        },
        Tenant: {
          type: "object",
          required: [
            "id",
            "name",
            "status",
            "classification",
            "version",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            status: { enum: ["active", "suspended", "archived"] },
            classification: { $ref: "#/components/schemas/Classification" },
            version: { type: "integer", minimum: 1 },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        PlatformTenant: {
          type: "object",
          required: ["id", "name", "status", "classification", "version", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            status: { enum: ["active", "suspended", "archived"] },
            classification: { $ref: "#/components/schemas/Classification" },
            version: { type: "integer", minimum: 1 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        PlatformDashboardCount: {
          type: "object",
          required: ["key", "label", "count"],
          properties: {
            key: { type: "string" },
            label: { type: "string" },
            count: { type: "integer" }
          }
        },
        PlatformDashboardFrameworkSummary: {
          type: "object",
          required: ["frameworkKey", "totalQuestions", "completedQuestions", "remainingQuestions", "compliancePercent"],
          properties: {
            frameworkKey: { type: "string" },
            totalQuestions: { type: "integer" },
            completedQuestions: { type: "integer" },
            remainingQuestions: { type: "integer" },
            compliancePercent: { type: "number" }
          }
        },
        PlatformDashboardRecentAssessment: {
          type: "object",
          required: ["id", "scopeName", "status", "itemCount", "createdAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            scopeName: { type: "string" },
            status: { type: "string" },
            itemCount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        PlatformDashboardTenant: {
          type: "object",
          required: [
            "id",
            "name",
            "status",
            "classification",
            "version",
            "createdAt",
            "updatedAt",
            "userCount",
            "activeUserCount",
            "invitedUserCount",
            "disabledUserCount",
            "roleCounts",
            "userStatusCounts",
            "enabledFrameworkCount",
            "totalQuestions",
            "completedQuestions",
            "remainingQuestions",
            "compliancePercent",
            "frameworks",
            "assessmentCount",
            "openAssessmentCount",
            "closedAssessmentCount",
            "assessmentStatusCounts",
            "assessmentItemCount",
            "evidenceObjectCount",
            "committedEvidenceObjectCount",
            "findingCount",
            "openFindingCount",
            "riskCount",
            "openRiskCount",
            "taskCount",
            "pendingTaskCount",
            "recentAssessments"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            status: { enum: ["active", "suspended", "archived"] },
            classification: { $ref: "#/components/schemas/Classification" },
            version: { type: "integer", minimum: 1 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            userCount: { type: "integer" },
            activeUserCount: { type: "integer" },
            invitedUserCount: { type: "integer" },
            disabledUserCount: { type: "integer" },
            roleCounts: { type: "array", items: { $ref: "#/components/schemas/PlatformDashboardCount" } },
            userStatusCounts: { type: "array", items: { $ref: "#/components/schemas/PlatformDashboardCount" } },
            enabledFrameworkCount: { type: "integer" },
            totalQuestions: { type: "integer" },
            completedQuestions: { type: "integer" },
            remainingQuestions: { type: "integer" },
            compliancePercent: { type: "number" },
            frameworks: { type: "array", items: { $ref: "#/components/schemas/PlatformDashboardFrameworkSummary" } },
            assessmentCount: { type: "integer" },
            openAssessmentCount: { type: "integer" },
            closedAssessmentCount: { type: "integer" },
            assessmentStatusCounts: { type: "array", items: { $ref: "#/components/schemas/PlatformDashboardCount" } },
            assessmentItemCount: { type: "integer" },
            evidenceObjectCount: { type: "integer" },
            committedEvidenceObjectCount: { type: "integer" },
            findingCount: { type: "integer" },
            openFindingCount: { type: "integer" },
            riskCount: { type: "integer" },
            openRiskCount: { type: "integer" },
            taskCount: { type: "integer" },
            pendingTaskCount: { type: "integer" },
            recentAssessments: { type: "array", items: { $ref: "#/components/schemas/PlatformDashboardRecentAssessment" } }
          }
        },
        PlatformDashboardTotals: {
          type: "object",
          required: [
            "tenantCount",
            "activeTenantCount",
            "userCount",
            "activeUserCount",
            "enabledFrameworkCount",
            "totalQuestions",
            "completedQuestions",
            "remainingQuestions",
            "compliancePercent",
            "assessmentCount",
            "openAssessmentCount",
            "closedAssessmentCount",
            "evidenceObjectCount",
            "committedEvidenceObjectCount",
            "findingCount",
            "openFindingCount",
            "riskCount",
            "openRiskCount",
            "taskCount",
            "pendingTaskCount"
          ],
          properties: {
            tenantCount: { type: "integer" },
            activeTenantCount: { type: "integer" },
            userCount: { type: "integer" },
            activeUserCount: { type: "integer" },
            enabledFrameworkCount: { type: "integer" },
            totalQuestions: { type: "integer" },
            completedQuestions: { type: "integer" },
            remainingQuestions: { type: "integer" },
            compliancePercent: { type: "number" },
            assessmentCount: { type: "integer" },
            openAssessmentCount: { type: "integer" },
            closedAssessmentCount: { type: "integer" },
            evidenceObjectCount: { type: "integer" },
            committedEvidenceObjectCount: { type: "integer" },
            findingCount: { type: "integer" },
            openFindingCount: { type: "integer" },
            riskCount: { type: "integer" },
            openRiskCount: { type: "integer" },
            taskCount: { type: "integer" },
            pendingTaskCount: { type: "integer" }
          }
        },
        PlatformDashboardResponse: {
          type: "object",
          required: ["generatedAt", "totals", "tenants"],
          properties: {
            generatedAt: { type: "string", format: "date-time" },
            totals: { $ref: "#/components/schemas/PlatformDashboardTotals" },
            tenants: { type: "array", items: { $ref: "#/components/schemas/PlatformDashboardTenant" } }
          }
        },
        CreatePlatformTenantRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 2 },
            classification: { $ref: "#/components/schemas/Classification" }
          }
        },
        InvitePlatformTenantAdminRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email" },
            displayName: { type: "string" },
            roleKey: { enum: ["platform_admin", "compliance_manager", "auditor", "viewer"] },
            clearance: { $ref: "#/components/schemas/Classification" }
          }
        },
        AdminUserStatus: {
          enum: ["active", "invited", "disabled"]
        },
        AdminRole: {
          type: "object",
          required: ["roleKey", "displayName", "description", "defaultClearance", "scopes"],
          properties: {
            roleKey: { enum: ["platform_admin", "compliance_manager", "auditor", "viewer"] },
            displayName: { type: "string" },
            description: { type: "string" },
            defaultClearance: { $ref: "#/components/schemas/Classification" },
            scopes: { type: "array", items: { type: "string" } }
          }
        },
        AdminRoleListResponse: {
          type: "object",
          required: ["roles", "clearanceLevels"],
          properties: {
            roles: { type: "array", items: { $ref: "#/components/schemas/AdminRole" } },
            clearanceLevels: { type: "array", items: { $ref: "#/components/schemas/Classification" } }
          }
        },
        InviteAdminUserRequest: {
          type: "object",
          required: ["email", "roleKey", "clearance"],
          properties: {
            email: { type: "string", format: "email" },
            displayName: { type: "string" },
            roleKey: { enum: ["platform_admin", "compliance_manager", "auditor", "viewer"] },
            clearance: { $ref: "#/components/schemas/Classification" }
          }
        },
        UpdateAdminUserRequest: {
          type: "object",
          properties: {
            status: { $ref: "#/components/schemas/AdminUserStatus" },
            roleKey: { enum: ["platform_admin", "compliance_manager", "auditor", "viewer"] },
            clearance: { $ref: "#/components/schemas/Classification" }
          }
        },
        AssignableUser: {
          type: "object",
          required: ["id", "supabaseUserId", "email", "roleKeys"],
          properties: {
            id: { type: "string", format: "uuid" },
            supabaseUserId: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            displayName: { type: "string" },
            roleKeys: { type: "array", items: { type: "string" } }
          }
        },
        AdminUser: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "supabaseUserId",
            "email",
            "status",
            "clearance",
            "roleKeys",
            "scopes",
            "version",
            "createdAt",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            supabaseUserId: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            displayName: { type: "string" },
            status: { $ref: "#/components/schemas/AdminUserStatus" },
            clearance: { $ref: "#/components/schemas/Classification" },
            roleKeys: { type: "array", items: { type: "string" } },
            scopes: { type: "array", items: { type: "string" } },
            version: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        InviteAdminUserResponse: {
          allOf: [
            { $ref: "#/components/schemas/AdminUser" },
            {
              type: "object",
              required: ["temporaryPassword"],
              properties: {
                temporaryPassword: { type: "string" }
              }
            }
          ]
        },
        AuditEventInput: {
          type: "object",
          required: [
            "tenantId",
            "eventType",
            "actorId",
            "targetType",
            "targetId",
            "traceId",
            "classification",
            "body"
          ],
          properties: {
            tenantId: { type: "string", format: "uuid" },
            eventType: { type: "string" },
            actorId: { type: "string", format: "uuid" },
            targetType: { type: "string" },
            targetId: { type: "string" },
            traceId: { type: "string" },
            classification: { enum: ["internal", "confidential", "restricted"] },
            body: { type: "object", additionalProperties: true },
            occurredAt: { type: "string", format: "date-time" }
          }
        },
        AuditEvent: {
          allOf: [
            { $ref: "#/components/schemas/AuditEventInput" },
            {
              type: "object",
              required: ["id", "sequence", "previousHash", "eventHash", "occurredAt"],
              properties: {
                id: { type: "string", format: "uuid" },
                sequence: { type: "string" },
                previousHash: { type: "string" },
                eventHash: { type: "string" }
              }
            }
          ]
        },
        PublishOutboxEventRequest: {
          type: "object",
          required: [
            "tenantId",
            "eventType",
            "aggregateType",
            "aggregateId",
            "payload",
            "idempotencyKey",
            "createdBy"
          ],
          properties: {
            tenantId: { type: "string", format: "uuid" },
            eventType: { type: "string" },
            aggregateType: { type: "string" },
            aggregateId: { type: "string" },
            payload: { type: "object", additionalProperties: true },
            idempotencyKey: { type: "string" },
            createdBy: { type: "string", format: "uuid" }
          }
        },
        OutboxEvent: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "eventType",
            "aggregateType",
            "aggregateId",
            "schemaVersion",
            "payload",
            "idempotencyKey",
            "status",
            "attempts",
            "availableAt",
            "createdBy",
            "createdAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            eventType: { type: "string" },
            aggregateType: { type: "string" },
            aggregateId: { type: "string" },
            schemaVersion: { type: "integer" },
            payload: { type: "object", additionalProperties: true },
            idempotencyKey: { type: "string" },
            status: { enum: ["pending", "processing", "processed", "dead_letter"] },
            attempts: { type: "integer" },
            availableAt: { type: "string", format: "date-time" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        PublishContentIngestionRequest: {
          type: "object",
          properties: {
            sourcesDir: { type: "string" }
          }
        },
        ContentRowCounts: {
          type: "object",
          required: [
            "contentSourcePackages",
            "frameworkContentPacks",
            "frameworkRequirements",
            "harmonizedControls",
            "controlMappings",
            "contentRejectedRecords"
          ],
          properties: {
            contentSourcePackages: { type: "integer" },
            frameworkContentPacks: { type: "integer" },
            frameworkRequirements: { type: "integer" },
            harmonizedControls: { type: "integer" },
            controlMappings: { type: "integer" },
            contentRejectedRecords: { type: "integer" }
          }
        },
        PublishedContentIngestion: {
          type: "object",
          required: [
            "sourcePackageCount",
            "contentPackCount",
            "requirementCount",
            "harmonizedControlCount",
            "mappingCount",
            "rejectedRecordCount",
            "sourcePackageIds",
            "contentPackIds"
          ],
          properties: {
            sourcePackageCount: { type: "integer" },
            contentPackCount: { type: "integer" },
            requirementCount: { type: "integer" },
            harmonizedControlCount: { type: "integer" },
            mappingCount: { type: "integer" },
            rejectedRecordCount: { type: "integer" },
            sourcePackageIds: { type: "array", items: { type: "string", format: "uuid" } },
            contentPackIds: { type: "array", items: { type: "string", format: "uuid" } }
          }
        },
        ContentIngestionPublishResult: {
          type: "object",
          required: ["published", "rowCounts", "outboxEventId", "auditEventId"],
          properties: {
            published: { $ref: "#/components/schemas/PublishedContentIngestion" },
            rowCounts: { $ref: "#/components/schemas/ContentRowCounts" },
            outboxEventId: { type: ["string", "null"], format: "uuid" },
            auditEventId: { type: ["string", "null"], format: "uuid" },
            parsed: { type: "object", additionalProperties: true }
          }
        },
        SourcePackage: {
          type: "object",
          required: ["id", "tenantId", "sourceFileName", "sourceSha256", "status", "diagnosticSummary"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            sourceFileName: { type: "string" },
            sourceSha256: { type: "string" },
            status: { type: "string" },
            diagnosticSummary: { type: "object", additionalProperties: true },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        FrameworkContentPack: {
          type: "object",
          required: ["id", "tenantId", "frameworkKey", "packVersion", "sourcePackageId", "sourceSha256", "signature", "status"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            frameworkKey: { type: "string" },
            packVersion: { type: "string" },
            sourcePackageId: { type: "string", format: "uuid" },
            sourceSha256: { type: "string" },
            signature: { type: "string" },
            status: { type: "string" },
            publishedAt: { type: ["string", "null"], format: "date-time" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        EnableFrameworkRequest: {
          type: "object",
          required: ["frameworkVersionId"],
          properties: {
            frameworkVersionId: { type: "string", format: "uuid" }
          }
        },
        FrameworkEnablement: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "frameworkId",
            "frameworkVersionId",
            "sourcePackageId",
            "frameworkKey",
            "frameworkName",
            "versionKey",
            "status",
            "subscribedAt",
            "classification"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            frameworkId: { type: "string", format: "uuid" },
            frameworkVersionId: { type: "string", format: "uuid" },
            sourcePackageId: { type: "string", format: "uuid" },
            frameworkKey: { type: "string" },
            frameworkName: { type: "string" },
            versionKey: { type: "string" },
            status: { type: "string" },
            subscribedAt: { type: "string", format: "date-time" },
            classification: { $ref: "#/components/schemas/Classification" }
          }
        },
        QuestionRepositoryStatus: {
          enum: ["draft", "pending_review", "approved", "rejected", "deprecated", "inactive", "retired"]
        },
        QuestionRepositoryResponseType: {
          enum: ["boolean", "text", "maturity", "multi_select"]
        },
        AssessmentQuestionOption: {
          type: "object",
          required: [
            "frameworkId",
            "frameworkVersionId",
            "frameworkKey",
            "frameworkName",
            "frameworkVersion",
            "frameworkKeys",
            "sourcePackageId",
            "controlId",
            "controlTitle",
            "harmonizedControlId",
            "harmonizedControlName",
            "mappingVersion",
            "questionVersionId",
            "questionSetId",
            "questionSetKey",
            "questionVersion",
            "questionText",
            "responseType",
            "evidenceExpectationIds",
            "citations",
            "confidence",
            "sourceType",
            "sourceAiQuestionVersionId",
            "generationRunId",
            "promptVersionId",
            "modelDeploymentId",
            "retrievalIndexId",
            "status",
            "approvedBy",
            "approvedAt",
            "classification",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt",
            "previousVersionCount",
            "isCurrentVersion"
          ],
          properties: {
            frameworkId: { type: "string", format: "uuid" },
            frameworkVersionId: { type: "string", format: "uuid" },
            frameworkKey: { type: "string" },
            frameworkName: { type: "string" },
            frameworkVersion: { type: "string" },
            frameworkKeys: { type: "array", items: { type: "string" } },
            sourcePackageId: { type: "string", format: "uuid" },
            controlId: { type: "string" },
            controlTitle: { type: "string" },
            harmonizedControlId: { type: "string" },
            harmonizedControlName: { type: "string" },
            mappingVersion: { type: "string" },
            questionVersionId: { type: "string", format: "uuid" },
            questionSetId: { type: "string", format: "uuid" },
            questionSetKey: { type: "string" },
            questionVersion: { type: "integer" },
            questionText: { type: "string" },
            responseType: { $ref: "#/components/schemas/QuestionRepositoryResponseType" },
            evidenceExpectationIds: { type: "array", items: { type: "string" } },
            citations: { type: "array", items: { type: "object", additionalProperties: true } },
            confidence: { type: "number" },
            sourceType: { type: "string" },
            sourceAiQuestionVersionId: { type: ["string", "null"], format: "uuid" },
            generationRunId: { type: ["string", "null"], format: "uuid" },
            promptVersionId: { type: ["string", "null"], format: "uuid" },
            modelDeploymentId: { type: ["string", "null"], format: "uuid" },
            retrievalIndexId: { type: ["string", "null"], format: "uuid" },
            status: { $ref: "#/components/schemas/QuestionRepositoryStatus" },
            approvedBy: { type: ["string", "null"], format: "uuid" },
            approvedAt: { type: ["string", "null"], format: "date-time" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" },
            previousVersionCount: { type: "integer" },
            isCurrentVersion: { type: "boolean" }
          }
        },
        QuestionRepositorySourceControl: {
          type: "object",
          required: [
            "frameworkKey",
            "sourceControlId",
            "mappingClassification",
            "coverage",
            "controlId",
            "controlTitle",
            "subcontrolId",
            "subcontrolTitle"
          ],
          properties: {
            frameworkKey: { type: "string" },
            sourceControlId: { type: "string" },
            mappingClassification: { type: "string" },
            coverage: { type: ["string", "null"] },
            controlId: { type: ["string", "null"] },
            controlTitle: { type: ["string", "null"] },
            subcontrolId: { type: ["string", "null"] },
            subcontrolTitle: { type: ["string", "null"] }
          }
        },
        QuestionRepositoryEntry: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "questionSetId",
            "harmonizedControlId",
            "harmonizedControlName",
            "harmonizedControlDescription",
            "harmonizedDomain",
            "questionSetKey",
            "sourceType",
            "questionVersion",
            "status",
            "questionText",
            "responseType",
            "evidenceExpectationIds",
            "citations",
            "confidence",
            "sourceAiQuestionVersionId",
            "generationRunId",
            "promptVersionId",
            "modelDeploymentId",
            "retrievalIndexId",
            "frameworkKeys",
            "sourceControls",
            "approvedBy",
            "approvedAt",
            "classification",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            questionSetId: { type: "string", format: "uuid" },
            harmonizedControlId: { type: "string" },
            harmonizedControlName: { type: ["string", "null"] },
            harmonizedControlDescription: { type: ["string", "null"] },
            harmonizedDomain: { type: ["string", "null"] },
            questionSetKey: { type: "string" },
            sourceType: { type: "string" },
            questionVersion: { type: "integer" },
            status: { $ref: "#/components/schemas/QuestionRepositoryStatus" },
            questionText: { type: "string" },
            responseType: { $ref: "#/components/schemas/QuestionRepositoryResponseType" },
            evidenceExpectationIds: { type: "array", items: { type: "string" } },
            citations: { type: "array", items: { type: "object", additionalProperties: true } },
            confidence: { type: "number" },
            sourceAiQuestionVersionId: { type: ["string", "null"], format: "uuid" },
            generationRunId: { type: ["string", "null"], format: "uuid" },
            promptVersionId: { type: ["string", "null"], format: "uuid" },
            modelDeploymentId: { type: ["string", "null"], format: "uuid" },
            retrievalIndexId: { type: ["string", "null"], format: "uuid" },
            frameworkKeys: { type: "array", items: { type: "string" } },
            sourceControls: { type: "array", items: { $ref: "#/components/schemas/QuestionRepositorySourceControl" } },
            approvedBy: { type: ["string", "null"], format: "uuid" },
            approvedAt: { type: ["string", "null"], format: "date-time" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        QuestionRepositoryControlContext: {
          type: "object",
          required: [
            "harmonizedControlId",
            "harmonizedControlName",
            "harmonizedControlDescription",
            "harmonizedDomain",
            "frameworkKeys",
            "sourceControls",
            "evidenceExpectationIds",
            "citations"
          ],
          properties: {
            harmonizedControlId: { type: "string" },
            harmonizedControlName: { type: "string" },
            harmonizedControlDescription: { type: "string" },
            harmonizedDomain: { type: "string" },
            frameworkKeys: { type: "array", items: { type: "string" } },
            sourceControls: { type: "array", items: { $ref: "#/components/schemas/QuestionRepositorySourceControl" } },
            evidenceExpectationIds: { type: "array", items: { type: "string" } },
            citations: { type: "array", items: { type: "object", additionalProperties: true } }
          }
        },
        AssistQuestionRepositoryDraftRequest: {
          type: "object",
          required: ["harmonizedControlId", "questionText", "responseType"],
          properties: {
            harmonizedControlId: { type: "string" },
            questionText: { type: "string" },
            responseType: { $ref: "#/components/schemas/QuestionRepositoryResponseType" }
          }
        },
        QuestionRepositoryAssistResult: {
          type: "object",
          required: [
            "harmonizedControlId",
            "responseType",
            "suggestedQuestionText",
            "evidenceExpectationIds",
            "citations",
            "confidence",
            "controlContext"
          ],
          properties: {
            harmonizedControlId: { type: "string" },
            responseType: { $ref: "#/components/schemas/QuestionRepositoryResponseType" },
            suggestedQuestionText: { type: "string" },
            evidenceExpectationIds: { type: "array", items: { type: "string" } },
            citations: { type: "array", items: { type: "object", additionalProperties: true } },
            confidence: { type: "number" },
            controlContext: { $ref: "#/components/schemas/QuestionRepositoryControlContext" }
          }
        },
        CreateQuestionRepositoryDraftRequest: {
          type: "object",
          required: ["harmonizedControlId", "questionText", "responseType", "evidenceExpectationIds"],
          properties: {
            harmonizedControlId: { type: "string" },
            questionText: { type: "string", minLength: 10 },
            responseType: { $ref: "#/components/schemas/QuestionRepositoryResponseType" },
            evidenceExpectationIds: { type: "array", items: { type: "string" } },
            citations: { type: "array", items: { type: "object", additionalProperties: true } },
            confidence: { type: "number", minimum: 0, maximum: 1 }
          }
        },
        UpdateQuestionRepositoryStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: { enum: ["approved", "inactive", "retired", "deprecated"] }
          }
        },
        QuestionRepositoryConsumers: {
          type: "object",
          required: ["frameworks", "assessments"],
          properties: {
            frameworks: {
              type: "array",
              items: {
                type: "object",
                required: ["frameworkKey", "sourceControlId", "harmonizedControlId", "mappingStatus"],
                properties: {
                  frameworkKey: { type: "string" },
                  sourceControlId: { type: "string" },
                  harmonizedControlId: { type: "string" },
                  mappingStatus: { type: "string" }
                }
              }
            },
            assessments: {
              type: "array",
              items: {
                type: "object",
                required: ["tenantId", "assessmentId", "assessmentName", "assessmentItemId", "status"],
                properties: {
                  tenantId: { type: "string", format: "uuid" },
                  assessmentId: { type: "string", format: "uuid" },
                  assessmentName: { type: "string" },
                  assessmentItemId: { type: "string", format: "uuid" },
                  status: { type: "string" }
                }
              }
            }
          }
        },
        PopulateQuestionRepositoryBaselineRequest: {
          type: "object",
          properties: {
            frameworkVersionId: { type: "string", format: "uuid" },
            limit: { type: "integer", minimum: 1, maximum: 1000 }
          }
        },
        QuestionRepositoryPopulateResult: {
          type: "object",
          required: ["examined", "created"],
          properties: {
            examined: { type: "integer" },
            created: { type: "integer" }
          }
        },
        FrameworkRequirement: {
          type: "object",
          required: ["id", "tenantId", "frameworkPackId", "frameworkKey", "controlId", "controlTitle", "requirementText"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            frameworkPackId: { type: "string", format: "uuid" },
            frameworkKey: { type: "string" },
            controlId: { type: "string" },
            controlTitle: { type: "string" },
            subControlId: { type: ["string", "null"] },
            subControlTitle: { type: ["string", "null"] },
            requirementText: { type: "string" },
            citation: { type: ["string", "null"] },
            category: { type: ["string", "null"] },
            sourceWorkbook: { type: "string" },
            sourceSheet: { type: "string" },
            sourceRowNumber: { type: "integer" },
            sourceSha256: { type: "string" },
            rawRecord: { type: "object", additionalProperties: true },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        RejectedContentRecord: {
          type: "object",
          required: ["id", "tenantId", "sourceWorkbook", "sourceSheet", "sourceRowNumber", "reason", "remediationStatus"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            sourceWorkbook: { type: "string" },
            sourceSheet: { type: "string" },
            sourceRowNumber: { type: "integer" },
            reason: { type: "string" },
            remediationStatus: { type: "string" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        HarmonizedControl: {
          type: "object",
          required: ["id", "tenantId", "harmonizedId", "domain", "controlName", "controlDescription", "status"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            harmonizedId: { type: "string" },
            domain: { type: "string" },
            controlName: { type: "string" },
            controlDescription: { type: "string" },
            sourceWorkbook: { type: "string" },
            sourceSheet: { type: "string" },
            sourceRowNumber: { type: "integer" },
            status: { type: "string" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        ControlMapping: {
          type: "object",
          required: ["id", "tenantId", "frameworkKey", "sourceControlId", "harmonizedControlId", "mappingClassification", "status"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            frameworkKey: { type: "string" },
            sourceControlId: { type: "string" },
            harmonizedControlId: { type: "string" },
            mappingClassification: { enum: ["mapped", "partial", "conflicting", "unique"] },
            coverage: { type: ["string", "null"] },
            confidence: { type: ["string", "null"] },
            rationale: { type: ["string", "null"] },
            reviewer: { type: ["string", "null"] },
            sourceWorkbook: { type: "string" },
            sourceSheet: { type: "string" },
            sourceRowNumber: { type: "integer" },
            status: { type: "string" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        PinnedControlRef: {
          type: "object",
          required: ["questionVersionId"],
          properties: {
            frameworkKey: { type: "string" },
            frameworkVersion: { type: "string" },
            frameworkVersionId: { type: "string", format: "uuid" },
            mappingVersion: { type: "string" },
            controlId: { type: "string" },
            harmonizedControlId: { type: "string" },
            questionVersion: { type: "string" },
            questionVersionId: { type: "string", format: "uuid" }
          }
        },
        CreateAssessmentRequest: {
          type: "object",
          required: ["scopeName", "ownerId", "periodStart", "periodEnd", "controls"],
          properties: {
            scopeName: { type: "string" },
            ownerId: { type: "string", format: "uuid" },
            periodStart: { type: "string", format: "date" },
            periodEnd: { type: "string", format: "date" },
            controls: { type: "array", items: { $ref: "#/components/schemas/PinnedControlRef" } }
          }
        },
        AssessmentApplicabilityRequest: {
          type: "object",
          required: ["applicable", "rationale"],
          properties: {
            applicable: { type: "boolean" },
            rationale: { type: "string" }
          }
        },
        AssessmentAnswerRequest: {
          type: "object",
          required: ["answerText", "evidenceIds"],
          properties: {
            answerText: { type: "string" },
            evidenceIds: { type: "array", items: { type: "string", format: "uuid" } }
          }
        },
        AssessmentReviewRequest: {
          type: "object",
          required: ["approved"],
          properties: {
            approved: { type: "boolean" },
            reason: { type: "string" }
          }
        },
        AssessmentReopenRequest: {
          type: "object",
          required: ["reason"],
          properties: {
            reason: { type: "string" }
          }
        },
        AssessmentItem: {
          type: "object",
          required: ["id", "controlRef", "status", "ownerId", "evidenceIds", "applicability"],
          properties: {
            id: { type: "string", format: "uuid" },
            controlRef: { $ref: "#/components/schemas/PinnedControlRef" },
            status: { enum: ["not_started", "in_progress", "submitted", "needs_changes", "approved", "closed"] },
            ownerId: { type: "string", format: "uuid" },
            answerText: { type: "string" },
            evidenceIds: { type: "array", items: { type: "string", format: "uuid" } },
            applicability: { type: "object", additionalProperties: true, nullable: true }
          }
        },
        Assessment: {
          type: "object",
          required: ["id", "tenantId", "scopeName", "status", "controlSnapshotVersion", "items", "periodStart", "periodEnd", "version"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            scopeName: { type: "string" },
            status: { enum: ["not_started", "in_progress", "submitted", "needs_changes", "approved", "closed"] },
            controlSnapshotVersion: { type: "string" },
            periodStart: { type: "string", format: "date-time" },
            periodEnd: { type: "string", format: "date-time" },
            items: { type: "array", items: { $ref: "#/components/schemas/AssessmentItem" } },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        AnswerRevision: {
          type: "object",
          required: ["id", "assessmentItemId", "revision", "responseJson", "submittedBy", "submittedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            assessmentItemId: { type: "string", format: "uuid" },
            revision: { type: "integer" },
            responseJson: { type: "object", additionalProperties: true },
            submittedBy: { type: "string", format: "uuid" },
            submittedAt: { type: "string", format: "date-time" },
            supersedesId: { type: "string", format: "uuid", nullable: true }
          }
        },
        ApplicabilityDecision: {
          type: "object",
          required: ["id", "controlInstanceId", "decision", "rationale", "decidedBy", "decidedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            controlInstanceId: { type: "string", format: "uuid" },
            decision: { enum: ["applicable", "not_applicable"] },
            rationale: { type: "string" },
            decidedBy: { type: "string", format: "uuid" },
            approvedBy: { type: "string", format: "uuid", nullable: true },
            decidedAt: { type: "string", format: "date-time" }
          }
        },
        ReviewDecision: {
          type: "object",
          required: ["id", "assessmentItemId", "answerRevisionId", "reviewerId", "decision", "decidedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            assessmentItemId: { type: "string", format: "uuid" },
            answerRevisionId: { type: "string", format: "uuid" },
            reviewerId: { type: "string", format: "uuid" },
            decision: { enum: ["approved", "needs_changes"] },
            rationale: { type: "string", nullable: true },
            decidedAt: { type: "string", format: "date-time" }
          }
        },
        AssessmentSignoff: {
          type: "object",
          required: ["id", "assessmentId", "scopeType", "scopeId", "signerId", "decision", "signedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            assessmentId: { type: "string", format: "uuid" },
            scopeType: { enum: ["section", "final"] },
            scopeId: { type: "string", format: "uuid" },
            signerId: { type: "string", format: "uuid" },
            decision: { enum: ["approved", "rejected"] },
            signedAt: { type: "string", format: "date-time" }
          }
        },
        TestProcedure: {
          type: "object",
          required: ["id", "tenantId", "controlId", "procedureKey", "method", "expectedResult", "status"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            controlId: { type: "string" },
            procedureKey: { type: "string" },
            method: { type: "string" },
            expectedResult: { type: "string" },
            status: { enum: ["active", "deprecated"] }
          }
        },
        CreateTestProcedureRequest: {
          type: "object",
          required: ["procedureKey", "method", "expectedResult"],
          properties: {
            procedureKey: { type: "string" },
            method: { type: "string" },
            expectedResult: { type: "string" }
          }
        },
        ManualControlTestResult: {
          type: "object",
          required: ["id", "tenantId", "controlInstanceId", "testProcedureId", "runId", "result", "testedBy", "testedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            controlInstanceId: { type: "string", format: "uuid" },
            testProcedureId: { type: "string", format: "uuid" },
            runId: { type: "string", format: "uuid" },
            population: { type: "string", nullable: true },
            sampleJson: { type: "object", additionalProperties: true },
            result: { enum: ["pass", "fail", "not_tested"] },
            testedBy: { type: "string", format: "uuid" },
            testedAt: { type: "string", format: "date-time" }
          }
        },
        RecordManualControlTestResultRequest: {
          type: "object",
          required: ["testProcedureId", "result"],
          properties: {
            testProcedureId: { type: "string", format: "uuid" },
            result: { enum: ["pass", "fail", "not_tested"] },
            population: { type: "string" }
          }
        },
        EvidenceState: {
          enum: ["pending", "quarantined", "committed", "rejected"]
        },
        InitiateEvidenceUploadRequest: {
          type: "object",
          required: ["ownerId", "fileName", "classification", "periodStart", "periodEnd", "scopeTags"],
          properties: {
            ownerId: { type: "string", format: "uuid" },
            fileName: { type: "string" },
            classification: { enum: ["internal", "confidential", "restricted"] },
            periodStart: { type: "string", format: "date" },
            periodEnd: { type: "string", format: "date" },
            scopeTags: { type: "array", items: { type: "string" } }
          }
        },
        QuarantineEvidenceRequest: {
          type: "object",
          properties: {
            storageUri: { type: "string" }
          }
        },
        CommitEvidenceRequest: {
          type: "object",
          required: ["scannerVerdict", "bytesBase64"],
          properties: {
            scannerVerdict: { enum: ["clean", "malicious"] },
            bytesBase64: { type: "string" },
            storageUri: { type: "string" },
            mimeType: { type: "string" }
          }
        },
        EvidenceUploadPolicy: {
          type: "object",
          required: ["maxBytes", "allowedMimeTypes"],
          properties: {
            maxBytes: { type: "integer", minimum: 1 },
            allowedMimeTypes: { type: "array", items: { type: "string" } }
          }
        },
        UploadEvidenceBytesRequest: {
          type: "object",
          required: ["bytesBase64", "mimeType"],
          properties: {
            bytesBase64: { type: "string" },
            mimeType: { type: "string" },
            storageUri: { type: "string" },
            scannerVerdict: { enum: ["clean", "malicious"] }
          }
        },
        EvidenceReuseCheckRequest: {
          type: "object",
          required: ["periodStart", "periodEnd", "scopeTags"],
          properties: {
            periodStart: { type: "string", format: "date" },
            periodEnd: { type: "string", format: "date" },
            scopeTags: { type: "array", items: { type: "string" } }
          }
        },
        EvidenceObject: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "ownerId",
            "fileName",
            "classification",
            "state",
            "periodStart",
            "periodEnd",
            "scopeTags",
            "version",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            ownerId: { type: "string", format: "uuid" },
            fileName: { type: "string" },
            storageUri: { type: "string" },
            state: { $ref: "#/components/schemas/EvidenceState" },
            sha256: { type: "string" },
            periodStart: { type: "string", format: "date-time" },
            periodEnd: { type: "string", format: "date-time" },
            scopeTags: { type: "array", items: { type: "string" } },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" },
            committedAt: { type: "string", format: "date-time" }
          }
        },
        EvidenceScanStatus: {
          type: "object",
          required: ["evidenceId", "state", "updatedAt"],
          properties: {
            evidenceId: { type: "string", format: "uuid" },
            state: { $ref: "#/components/schemas/EvidenceState" },
            sha256: { type: ["string", "null"] },
            storageUri: { type: ["string", "null"] },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        EvidenceReuseDecision: {
          type: "object",
          required: ["evidenceId", "reusable"],
          properties: {
            evidenceId: { type: "string", format: "uuid" },
            reusable: { type: "boolean" },
            reason: { type: "string" }
          }
        },
        EvidenceVersion: {
          type: "object",
          required: [
            "id", "tenantId", "evidenceId", "evidenceVersionNo", "objectUri", "sha256", "sizeBytes",
            "mimeType", "observedAt", "periodStart", "periodEnd", "uploadedBy", "contentAvailable",
            "classification", "createdBy", "createdAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            evidenceId: { type: "string", format: "uuid" },
            evidenceVersionNo: { type: "integer" },
            objectUri: { type: "string" },
            sha256: { type: "string" },
            sizeBytes: { type: "integer" },
            mimeType: { type: "string" },
            observedAt: { type: "string", format: "date-time" },
            periodStart: { type: "string", format: "date-time" },
            periodEnd: { type: "string", format: "date-time" },
            uploadedBy: { type: "string", format: "uuid" },
            contentAvailable: { type: "boolean" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        CreateEvidenceExpiryEventRequest: {
          type: "object",
          required: ["previousState", "newState", "reason"],
          properties: {
            previousState: { type: "string" },
            newState: { type: "string" },
            reason: { type: "string" }
          }
        },
        EvidenceExpiryEvent: {
          type: "object",
          required: [
            "id", "tenantId", "evidenceId", "previousState", "newState", "reason", "actorId",
            "occurredAt", "classification", "createdBy", "createdAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            evidenceId: { type: "string", format: "uuid" },
            previousState: { type: "string" },
            newState: { type: "string" },
            reason: { type: "string" },
            actorId: { type: "string", format: "uuid" },
            occurredAt: { type: "string", format: "date-time" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        EvidenceLinkTargetType: {
          enum: ["control_instance", "assessment_item", "automated_test_run", "remediation_task"]
        },
        CreateEvidenceLinkRequest: {
          type: "object",
          required: ["targetType", "targetId", "purpose"],
          properties: {
            targetType: { $ref: "#/components/schemas/EvidenceLinkTargetType" },
            targetId: { type: "string", format: "uuid" },
            purpose: { type: "string" },
            scopeMatch: { type: "boolean" },
            periodMatch: { type: "boolean" }
          }
        },
        EvidenceLink: {
          type: "object",
          required: [
            "id", "tenantId", "evidenceVersionId", "targetType", "targetId", "purpose", "scopeMatch",
            "periodMatch", "classification", "createdBy", "createdAt", "updatedBy", "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            evidenceVersionId: { type: "string", format: "uuid" },
            targetType: { $ref: "#/components/schemas/EvidenceLinkTargetType" },
            targetId: { type: "string", format: "uuid" },
            purpose: { type: "string" },
            scopeMatch: { type: "boolean" },
            periodMatch: { type: "boolean" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        MalwareScanStatus: {
          enum: ["clean", "infected", "error"]
        },
        MalwareScanResult: {
          type: "object",
          required: [
            "id", "tenantId", "evidenceVersionId", "engine", "signatureVersion", "status", "scannedAt",
            "classification", "createdBy", "createdAt", "updatedBy", "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            evidenceVersionId: { type: "string", format: "uuid" },
            engine: { type: "string" },
            signatureVersion: { type: "string" },
            status: { $ref: "#/components/schemas/MalwareScanStatus" },
            detailsHash: { type: "string" },
            scannedAt: { type: "string", format: "date-time" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        EvidenceCustodyEventType: {
          enum: ["created", "transferred", "accessed", "exported", "disposed"]
        },
        EvidenceCustodyEvent: {
          type: "object",
          required: [
            "id", "tenantId", "evidenceVersionId", "eventType", "actorId", "locationRef", "eventHash",
            "occurredAt", "classification", "createdBy", "createdAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            evidenceVersionId: { type: "string", format: "uuid" },
            eventType: { $ref: "#/components/schemas/EvidenceCustodyEventType" },
            actorId: { type: "string", format: "uuid" },
            locationRef: { type: "string" },
            eventHash: { type: "string" },
            occurredAt: { type: "string", format: "date-time" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        EvidenceReviewDecision: {
          enum: ["sufficient", "insufficient", "needs_more_context"]
        },
        CreateEvidenceReviewRequest: {
          type: "object",
          required: ["reviewerId", "decision", "rationale"],
          properties: {
            reviewerId: { type: "string", format: "uuid" },
            decision: { $ref: "#/components/schemas/EvidenceReviewDecision" },
            rationale: { type: "string" }
          }
        },
        EvidenceReview: {
          type: "object",
          required: [
            "id", "tenantId", "evidenceVersionId", "reviewerId", "decision", "rationale", "reviewedAt",
            "classification", "createdBy", "createdAt", "updatedBy", "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            evidenceVersionId: { type: "string", format: "uuid" },
            reviewerId: { type: "string", format: "uuid" },
            decision: { $ref: "#/components/schemas/EvidenceReviewDecision" },
            rationale: { type: "string" },
            reviewedAt: { type: "string", format: "date-time" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        EvidenceRequestStatus: {
          enum: ["requested", "submitted", "accepted", "rejected"]
        },
        CreateEvidenceRequestRequest: {
          type: "object",
          required: ["assessmentId", "controlInstanceId", "requestedFrom", "dueAt"],
          properties: {
            assessmentId: { type: "string", format: "uuid" },
            controlInstanceId: { type: "string", format: "uuid" },
            requestedFrom: { type: "string" },
            dueAt: { type: "string", format: "date-time" },
            instructions: { type: "string" }
          }
        },
        EvidenceRequest: {
          type: "object",
          required: [
            "id", "tenantId", "assessmentId", "controlInstanceId", "requestedFrom", "dueAt", "status",
            "classification", "createdBy", "createdAt", "updatedBy", "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            assessmentId: { type: "string", format: "uuid" },
            controlInstanceId: { type: "string", format: "uuid" },
            requestedFrom: { type: "string" },
            dueAt: { type: "string", format: "date-time" },
            status: { $ref: "#/components/schemas/EvidenceRequestStatus" },
            instructions: { type: "string" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        AutomatedTestSeverity: {
          enum: ["low", "medium", "high", "critical"]
        },
        CreateAutomatedTestRequest: {
          type: "object",
          required: ["controlId", "connectorType", "queryTemplate", "schedule", "severity"],
          properties: {
            controlId: { type: "string", format: "uuid" },
            connectorType: { type: "string" },
            queryTemplate: { type: "string" },
            schedule: { type: "string" },
            severity: { $ref: "#/components/schemas/AutomatedTestSeverity" }
          }
        },
        AutomatedTest: {
          type: "object",
          required: [
            "id", "tenantId", "controlId", "connectorType", "queryTemplate", "schedule", "severity",
            "classification", "createdBy", "createdAt", "updatedBy", "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            controlId: { type: "string", format: "uuid" },
            connectorType: { type: "string" },
            queryTemplate: { type: "string" },
            schedule: { type: "string" },
            severity: { $ref: "#/components/schemas/AutomatedTestSeverity" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        AutomatedTestRunStatus: {
          enum: ["running", "succeeded", "failed"]
        },
        CreateAutomatedTestRunRequest: {
          type: "object",
          required: ["connectorId"],
          properties: {
            connectorId: { type: "string", format: "uuid" },
            status: { $ref: "#/components/schemas/AutomatedTestRunStatus" },
            resultJson: { type: "object", additionalProperties: true },
            sourceWatermark: { type: "string" }
          }
        },
        AutomatedTestRun: {
          type: "object",
          required: [
            "id", "tenantId", "automatedTestId", "connectorId", "startedAt", "status", "resultJson",
            "idempotencyKey", "classification", "createdBy", "createdAt", "updatedBy", "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            automatedTestId: { type: "string", format: "uuid" },
            connectorId: { type: "string", format: "uuid" },
            startedAt: { type: "string", format: "date-time" },
            finishedAt: { type: "string", format: "date-time" },
            status: { $ref: "#/components/schemas/AutomatedTestRunStatus" },
            resultJson: { type: "object", additionalProperties: true },
            sourceWatermark: { type: "string" },
            idempotencyKey: { type: "string" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        EvidenceSampleMethod: {
          enum: ["random", "stratified", "judgmental", "full_population"]
        },
        CreateEvidenceSampleRequest: {
          type: "object",
          required: ["populationRef", "method", "sampleSize"],
          properties: {
            populationRef: { type: "string" },
            method: { $ref: "#/components/schemas/EvidenceSampleMethod" },
            sampleSize: { type: "integer" },
            sampleJson: { type: "array", items: {} },
            seed: { type: "string" }
          }
        },
        EvidenceSample: {
          type: "object",
          required: [
            "id", "tenantId", "testResultId", "populationRef", "method", "sampleSize", "sampleJson",
            "classification", "createdBy", "createdAt", "updatedBy", "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            testResultId: { type: "string", format: "uuid" },
            populationRef: { type: "string" },
            method: { $ref: "#/components/schemas/EvidenceSampleMethod" },
            sampleSize: { type: "integer" },
            sampleJson: { type: "array", items: {} },
            seed: { type: "string" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        FindingSeverity: {
          enum: ["low", "medium", "high", "critical"]
        },
        FindingImpact: {
          enum: ["low", "medium", "high", "critical"]
        },
        FindingLikelihood: {
          enum: ["rare", "unlikely", "possible", "likely", "almost_certain"]
        },
        RemediationTaskStatus: {
          enum: ["open", "in_progress", "verified", "risk_accepted"]
        },
        RemediationTaskReviewDecision: {
          enum: ["approved", "rejected"]
        },
        CreateFindingRequest: {
          type: "object",
          // G-03 (spec §11/§12): a finding requires at least one source — assessmentItemId or
          // testResultId — not necessarily both; enforced by the domain layer and the DB's
          // findings_has_source CHECK constraint, not representable as a plain "required" list here.
          required: ["severity", "description"],
          properties: {
            assessmentItemId: { type: "string", format: "uuid" },
            testResultId: { type: "string", format: "uuid" },
            severity: { $ref: "#/components/schemas/FindingSeverity" },
            impact: { $ref: "#/components/schemas/FindingImpact" },
            likelihood: { $ref: "#/components/schemas/FindingLikelihood" },
            ownerId: { type: "string", format: "uuid" },
            dueAt: { type: "string", format: "date-time" },
            description: { type: "string" }
          }
        },
        UpdateFindingRequest: {
          type: "object",
          required: ["severity", "description"],
          properties: {
            severity: { $ref: "#/components/schemas/FindingSeverity" },
            impact: { $ref: "#/components/schemas/FindingImpact" },
            likelihood: { $ref: "#/components/schemas/FindingLikelihood" },
            ownerId: { type: "string", format: "uuid" },
            dueAt: { type: "string", format: "date-time" },
            description: { type: "string" }
          }
        },
        FindingAssistCitation: {
          type: "object",
          required: ["sourceId"],
          properties: {
            sourceId: { type: "string" },
            sourceType: { type: "string" }
          }
        },
        FindingAssistRequest: {
          type: "object",
          required: [
            "assessmentItemId",
            "questionText",
            "frameworkKeys",
            "evidenceExpectationIds",
            "citations",
            "evidenceObjectIds"
          ],
          properties: {
            assessmentItemId: { type: "string", format: "uuid" },
            questionText: { type: "string" },
            responseType: { type: "string" },
            answerText: { type: "string" },
            frameworkKeys: { type: "array", maxItems: 30, items: { type: "string" } },
            harmonizedControlId: { type: "string" },
            harmonizedControlName: { type: "string" },
            sourceControlId: { type: "string" },
            sourceControlTitle: { type: "string" },
            evidenceExpectationIds: { type: "array", maxItems: 80, items: { type: "string" } },
            citations: { type: "array", maxItems: 120, items: { $ref: "#/components/schemas/FindingAssistCitation" } },
            evidenceObjectIds: { type: "array", maxItems: 8, items: { type: "string", format: "uuid" } }
          }
        },
        FindingAssistEvidenceFile: {
          type: "object",
          required: ["id", "fileName", "state", "mimeType", "sha256", "scopeTags", "extractedText", "extractionNote"],
          properties: {
            id: { type: "string", format: "uuid" },
            fileName: { type: "string" },
            state: { type: "string" },
            mimeType: { type: "string" },
            sha256: { type: "string", nullable: true },
            scopeTags: { type: "array", items: { type: "string" } },
            extractedText: { type: "string", nullable: true },
            extractionNote: { type: "string", nullable: true }
          }
        },
        FindingAssistEvidenceAnalysis: {
          type: "object",
          required: [
            "fileName",
            "relevance",
            "documentPurpose",
            "summary",
            "supports",
            "expectedEvidenceCovered",
            "keyObservations",
            "notableExcerpts",
            "contradictions",
            "limitations",
            "gaps",
            "reliabilityAssessment",
            "recommendedFollowUp"
          ],
          properties: {
            fileName: { type: "string" },
            relevance: { enum: ["not_relevant", "low", "medium", "high"] },
            evidenceType: { enum: ["policy_or_design", "implementation", "operating", "effectiveness", "sample_or_template"] },
            proves: { type: "string" },
            contextMismatches: { type: "array", items: { type: "string" } },
            documentPurpose: { type: "string" },
            summary: { type: "string" },
            supports: { type: "array", items: { type: "string" } },
            expectedEvidenceCovered: { type: "array", items: { type: "string" } },
            keyObservations: { type: "array", items: { type: "string" } },
            notableExcerpts: { type: "array", items: { type: "string" } },
            contradictions: { type: "array", items: { type: "string" } },
            limitations: { type: "array", items: { type: "string" } },
            gaps: { type: "array", items: { type: "string" } },
            reliabilityAssessment: { type: "string" },
            recommendedFollowUp: { type: "array", items: { type: "string" } }
          }
        },
        FindingAssistMaterialObligation: {
          type: "object",
          required: ["obligation", "stage", "status", "supportingEvidence", "missingProof"],
          properties: {
            obligation: { type: "string" },
            stage: { enum: ["documented", "approved", "implemented", "operating", "effective"] },
            status: { enum: ["proven", "partially_proven", "not_proven", "contradicted", "not_applicable"] },
            supportingEvidence: { type: "array", items: { type: "string" } },
            missingProof: { type: "string" }
          }
        },
        FindingAssistRecommendation: {
          type: "object",
          required: [
            "findingDecision",
            "findingDecisionRationale",
            "severity",
            "impact",
            "likelihood",
            "executiveSummary",
            "description",
            "rationale",
            "controlConclusion",
            "evidenceCoverage",
            "evidenceCoverageRationale",
            "evidenceSummary",
            "evidenceAnalyses",
            "missingEvidence",
            "recommendedReviewerActions",
            "parameterScoringMethod",
            "severityRationale",
            "impactRationale",
            "likelihoodRationale",
            "confidence",
            "confidenceRationale",
            "model",
            "generatedAt",
            "evidenceFiles",
            "warnings"
          ],
          properties: {
            findingDecision: { enum: ["create_finding", "no_finding", "needs_manual_review"] },
            findingDecisionRationale: { type: "string" },
            severity: { $ref: "#/components/schemas/FindingSeverity" },
            impact: { $ref: "#/components/schemas/FindingImpact" },
            likelihood: { $ref: "#/components/schemas/FindingLikelihood" },
            executiveSummary: { type: "string" },
            description: { type: "string" },
            rationale: { type: "string" },
            controlConclusion: { type: "string" },
            evidenceCoverage: { enum: ["none", "limited", "partial", "substantial", "complete"] },
            evidenceCoverageRationale: { type: "string" },
            evidenceSummary: { type: "string" },
            materialObligations: { type: "array", items: { $ref: "#/components/schemas/FindingAssistMaterialObligation" } },
            evidenceContextMismatches: { type: "array", items: { type: "string" } },
            suggestedAdditionalEvidence: { type: "array", items: { type: "string" } },
            evidenceAnalyses: { type: "array", items: { $ref: "#/components/schemas/FindingAssistEvidenceAnalysis" } },
            missingEvidence: { type: "array", items: { type: "string" } },
            recommendedReviewerActions: { type: "array", items: { type: "string" } },
            parameterScoringMethod: { type: "string" },
            severityRationale: { type: "string" },
            impactRationale: { type: "string" },
            likelihoodRationale: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            confidenceRationale: { type: "string" },
            model: { type: "string" },
            generatedAt: { type: "string", format: "date-time" },
            evidenceFiles: { type: "array", items: { $ref: "#/components/schemas/FindingAssistEvidenceFile" } },
            warnings: { type: "array", items: { type: "string" } }
          }
        },
        Finding: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "assessmentItemId",
            "testResultId",
            "severity",
            "impact",
            "likelihood",
            "ownerId",
            "dueAt",
            "description",
            "version",
            "classification",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            assessmentItemId: { type: "string", format: "uuid", nullable: true },
            testResultId: { type: "string", format: "uuid", nullable: true },
            severity: { $ref: "#/components/schemas/FindingSeverity" },
            impact: { allOf: [{ $ref: "#/components/schemas/FindingImpact" }], nullable: true },
            likelihood: { allOf: [{ $ref: "#/components/schemas/FindingLikelihood" }], nullable: true },
            ownerId: { type: "string", format: "uuid", nullable: true },
            dueAt: { type: "string", format: "date-time", nullable: true },
            description: { type: "string" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        CreateRemediationTaskRequest: {
          type: "object",
          required: ["findingId", "ownerId", "dueAt"],
          properties: {
            findingId: { type: "string", format: "uuid" },
            ownerId: { type: "string", format: "uuid" },
            dueAt: { type: "string", format: "date-time" }
          }
        },
        UpdateRemediationTaskRequest: {
          type: "object",
          required: ["ownerId", "dueAt", "status"],
          properties: {
            ownerId: { type: "string", format: "uuid" },
            dueAt: { type: "string", format: "date-time" },
            status: { enum: ["open", "in_progress", "verified"] }
          }
        },
        RemediationTaskReviewRequest: {
          type: "object",
          required: ["decision", "rationale"],
          properties: {
            decision: { $ref: "#/components/schemas/RemediationTaskReviewDecision" },
            rationale: { type: "string" },
            evidenceVersionIds: {
              type: "array",
              items: { type: "string", format: "uuid" }
            }
          }
        },
        RiskAcceptanceRequest: {
          type: "object",
          required: ["reason", "expiresAt", "nextReviewDueAt"],
          properties: {
            reason: { type: "string" },
            expiresAt: { type: "string", format: "date-time" },
            nextReviewDueAt: { type: "string", format: "date-time" },
            compensatingControls: { type: "string" },
            riskId: { type: "string", format: "uuid" }
          }
        },
        RiskAcceptanceReviewDecision: {
          enum: ["reaffirmed", "revoked", "escalated"]
        },
        RiskAcceptanceReviewRequest: {
          type: "object",
          required: ["decision", "reason"],
          properties: {
            decision: { $ref: "#/components/schemas/RiskAcceptanceReviewDecision" },
            reason: { type: "string" }
          }
        },
        RiskAcceptance: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "version",
            "remediationTaskId",
            "findingId",
            "rationale",
            "approverId",
            "approvedAt",
            "expiresAt",
            "nextReviewDueAt",
            "active",
            "classification",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            remediationTaskId: { type: "string", format: "uuid" },
            findingId: { type: "string", format: "uuid" },
            riskId: { type: "string", format: "uuid" },
            rationale: { type: "string" },
            approverId: { type: "string", format: "uuid" },
            approvedAt: { type: "string", format: "date-time" },
            expiresAt: { type: "string", format: "date-time" },
            nextReviewDueAt: { type: "string", format: "date-time" },
            compensatingControls: { type: "string" },
            supersededAt: { type: "string", format: "date-time" },
            supersededById: { type: "string", format: "uuid" },
            active: { type: "boolean" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        RiskAcceptanceReview: {
          type: "object",
          required: ["id", "tenantId", "riskAcceptanceId", "reviewerId", "decision", "reason", "reviewedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            riskAcceptanceId: { type: "string", format: "uuid" },
            reviewerId: { type: "string", format: "uuid" },
            decision: { $ref: "#/components/schemas/RiskAcceptanceReviewDecision" },
            reason: { type: "string" },
            reviewedAt: { type: "string", format: "date-time" }
          }
        },
        CreateRiskModelRequest: {
          type: "object",
          required: ["modelKey", "modelVersion", "scalesJson", "formula", "thresholds"],
          properties: {
            modelKey: { type: "string" },
            modelVersion: { type: "string" },
            scalesJson: { type: "object" },
            formula: { type: "string" },
            thresholds: { type: "object" }
          }
        },
        RiskModel: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "version",
            "modelKey",
            "modelVersion",
            "scalesJson",
            "formula",
            "thresholds",
            "status",
            "classification",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            modelKey: { type: "string" },
            modelVersion: { type: "string" },
            scalesJson: { type: "object" },
            formula: { type: "string" },
            thresholds: { type: "object" },
            status: { enum: ["draft", "active", "retired"] },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        CreateRiskRequest: {
          type: "object",
          required: ["riskKey", "title", "category", "inherentScore", "residualScore", "ownerId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            riskModelId: { type: "string", format: "uuid" },
            riskKey: { type: "string" },
            title: { type: "string" },
            category: { type: "string" },
            inherentScore: { type: "number", minimum: 0, maximum: 100 },
            residualScore: { type: "number", minimum: 0, maximum: 100 },
            ownerId: { type: "string", format: "uuid" }
          }
        },
        Risk: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "version",
            "riskKey",
            "title",
            "category",
            "inherentScore",
            "residualScore",
            "ownerId",
            "status",
            "classification",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            workspaceId: { type: "string", format: "uuid" },
            riskModelId: { type: "string", format: "uuid" },
            riskKey: { type: "string" },
            title: { type: "string" },
            category: { type: "string" },
            inherentScore: { type: "number" },
            residualScore: { type: "number" },
            ownerId: { type: "string", format: "uuid" },
            status: { enum: ["identified", "assessed", "treatment_planned", "monitoring", "closed"] },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        RiskAssistRequest: {
          type: "object",
          required: ["findingId", "assessmentId"],
          properties: {
            findingId: { type: "string", format: "uuid" },
            assessmentId: { type: "string", format: "uuid" }
          }
        },
        RiskAssistEvidenceFile: {
          type: "object",
          required: ["id", "fileName", "state", "mimeType", "sha256", "scopeTags", "extractedText", "extractionNote"],
          properties: {
            id: { type: "string", format: "uuid" },
            fileName: { type: "string" },
            state: { type: "string" },
            mimeType: { type: "string" },
            sha256: { type: "string", nullable: true },
            scopeTags: { type: "array", items: { type: "string" } },
            extractedText: { type: "string", nullable: true },
            extractionNote: { type: "string", nullable: true }
          }
        },
        RiskAssistEvidenceAnalysis: {
          type: "object",
          required: [
            "fileName",
            "relevance",
            "documentPurpose",
            "summary",
            "keyFacts",
            "controlCoverage",
            "notableExcerpts",
            "supports",
            "gaps",
            "riskSignals",
            "limitations",
            "reviewerConclusion"
          ],
          properties: {
            fileName: { type: "string" },
            relevance: { enum: ["not_relevant", "low", "medium", "high"] },
            documentPurpose: { type: "string" },
            summary: { type: "string" },
            keyFacts: { type: "array", items: { type: "string" } },
            controlCoverage: { type: "array", items: { type: "string" } },
            notableExcerpts: { type: "array", items: { type: "string" } },
            supports: { type: "array", items: { type: "string" } },
            gaps: { type: "array", items: { type: "string" } },
            riskSignals: { type: "array", items: { type: "string" } },
            limitations: { type: "array", items: { type: "string" } },
            reviewerConclusion: { type: "string" }
          }
        },
        RiskAssistRelatedRisk: {
          type: "object",
          required: ["riskKey", "title", "reason"],
          properties: {
            riskKey: { type: "string" },
            title: { type: "string" },
            reason: { type: "string" }
          }
        },
        RiskAssistFrameworkImpact: {
          type: "object",
          required: ["frameworkKey", "requirementRefs", "impact"],
          properties: {
            frameworkKey: { type: "string" },
            requirementRefs: { type: "array", items: { type: "string" } },
            impact: { type: "string" }
          }
        },
        RiskAssistContextSummary: {
          type: "object",
          required: [
            "assessmentName",
            "questionText",
            "findingSeverity",
            "findingImpact",
            "findingLikelihood",
            "harmonizedControlId",
            "frameworks",
            "evidenceFileCount",
            "relatedRiskCount"
          ],
          properties: {
            assessmentName: { type: "string" },
            questionText: { type: "string", nullable: true },
            findingSeverity: { $ref: "#/components/schemas/FindingSeverity" },
            findingImpact: { allOf: [{ $ref: "#/components/schemas/FindingImpact" }], nullable: true },
            findingLikelihood: { allOf: [{ $ref: "#/components/schemas/FindingLikelihood" }], nullable: true },
            harmonizedControlId: { type: "string", nullable: true },
            frameworks: { type: "array", items: { type: "string" } },
            evidenceFileCount: { type: "integer" },
            relatedRiskCount: { type: "integer" }
          }
        },
        RiskTreatmentStrategy: {
          enum: ["accept", "mitigate", "transfer", "avoid"]
        },
        RiskEscalationDecision: {
          enum: ["create_new_risk", "link_existing_risk", "no_escalation"]
        },
        RiskAssistRecommendation: {
          type: "object",
          required: [
            "escalationDecision",
            "escalationDecisionRationale",
            "findingReassessmentRecommended",
            "recommendedExistingRiskKey",
            "recommendedExistingRiskTitle",
            "recommendedExistingRiskReason",
            "riskTitle",
            "riskStatement",
            "category",
            "categoryRationale",
            "source",
            "suggestedLikelihood",
            "suggestedImpact",
            "suggestedInherentRisk",
            "inherentScore",
            "residualScore",
            "riskScoringMethod",
            "inherentScoreRationale",
            "residualScoreRationale",
            "confidence",
            "suggestedTreatment",
            "treatmentRationale",
            "suggestedMitigation",
            "suggestedEvidenceRequired",
            "potentialRelatedRisks",
            "frameworkImpact",
            "evidenceAnalysis",
            "aiRationale",
            "sourcesUsed",
            "model",
            "generatedAt",
            "evidenceFiles",
            "warnings",
            "contextSummary"
          ],
          properties: {
            escalationDecision: { $ref: "#/components/schemas/RiskEscalationDecision" },
            escalationDecisionRationale: { type: "string" },
            findingReassessmentRecommended: { type: "boolean" },
            recommendedExistingRiskKey: { type: "string", nullable: true },
            recommendedExistingRiskTitle: { type: "string", nullable: true },
            recommendedExistingRiskReason: { type: "string", nullable: true },
            riskTitle: { type: "string", nullable: true },
            riskStatement: { type: "string", nullable: true },
            category: { type: "string", nullable: true },
            categoryRationale: { type: "string", nullable: true },
            source: { type: "string", nullable: true },
            suggestedLikelihood: { allOf: [{ $ref: "#/components/schemas/FindingLikelihood" }], nullable: true },
            suggestedImpact: { allOf: [{ $ref: "#/components/schemas/FindingImpact" }], nullable: true },
            suggestedInherentRisk: { enum: ["low", "medium", "high", "critical"], nullable: true },
            inherentScore: { type: "number", minimum: 0, maximum: 100, nullable: true },
            residualScore: { type: "number", minimum: 0, maximum: 100, nullable: true },
            riskScoringMethod: { type: "string", nullable: true },
            inherentScoreRationale: { type: "string", nullable: true },
            residualScoreRationale: { type: "string", nullable: true },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            suggestedTreatment: { allOf: [{ $ref: "#/components/schemas/RiskTreatmentStrategy" }], nullable: true },
            treatmentRationale: { type: "string", nullable: true },
            suggestedMitigation: { type: "string", nullable: true },
            suggestedEvidenceRequired: { type: "array", items: { type: "string" } },
            potentialRelatedRisks: { type: "array", items: { $ref: "#/components/schemas/RiskAssistRelatedRisk" } },
            frameworkImpact: { type: "array", items: { $ref: "#/components/schemas/RiskAssistFrameworkImpact" } },
            evidenceAnalysis: { type: "array", items: { $ref: "#/components/schemas/RiskAssistEvidenceAnalysis" } },
            aiRationale: { type: "string" },
            sourcesUsed: { type: "array", items: { type: "string" } },
            model: { type: "string" },
            generatedAt: { type: "string", format: "date-time" },
            evidenceFiles: { type: "array", items: { $ref: "#/components/schemas/RiskAssistEvidenceFile" } },
            warnings: { type: "array", items: { type: "string" } },
            contextSummary: { $ref: "#/components/schemas/RiskAssistContextSummary" }
          }
        },
        RiskLinkTargetType: {
          enum: ["finding", "control_instance", "vendor", "evidence_object", "assessment", "requirement_instance"]
        },
        RiskLinkRelationship: {
          enum: ["related_to", "caused_by", "mitigated_by", "threatens"]
        },
        CreateRiskLinkRequest: {
          type: "object",
          required: ["targetType", "targetId", "relationship"],
          properties: {
            targetType: { $ref: "#/components/schemas/RiskLinkTargetType" },
            targetId: { type: "string", format: "uuid" },
            relationship: { $ref: "#/components/schemas/RiskLinkRelationship" }
          }
        },
        RiskLink: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "version",
            "riskId",
            "targetType",
            "targetId",
            "relationship",
            "classification",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            riskId: { type: "string", format: "uuid" },
            targetType: { $ref: "#/components/schemas/RiskLinkTargetType" },
            targetId: { type: "string", format: "uuid" },
            relationship: { $ref: "#/components/schemas/RiskLinkRelationship" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        CreateRiskTreatmentRequest: {
          type: "object",
          required: ["strategy", "plan", "ownerId", "dueAt"],
          properties: {
            strategy: { $ref: "#/components/schemas/RiskTreatmentStrategy" },
            plan: { type: "string" },
            ownerId: { type: "string", format: "uuid" },
            dueAt: { type: "string", format: "date-time" }
          }
        },
        RiskTreatment: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "version",
            "riskId",
            "strategy",
            "plan",
            "ownerId",
            "dueAt",
            "status",
            "classification",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            riskId: { type: "string", format: "uuid" },
            strategy: { $ref: "#/components/schemas/RiskTreatmentStrategy" },
            plan: { type: "string" },
            ownerId: { type: "string", format: "uuid" },
            dueAt: { type: "string", format: "date-time" },
            status: { enum: ["planned", "in_progress", "completed", "cancelled"] },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        UniversalTaskStatus: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "cancelled"]
        },
        UniversalTaskPriority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"]
        },
        UniversalTask: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "title",
            "status",
            "priority",
            "ownerId",
            "targetType",
            "targetId",
            "version",
            "classification",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            title: { type: "string" },
            description: { type: "string" },
            status: { $ref: "#/components/schemas/UniversalTaskStatus" },
            priority: { $ref: "#/components/schemas/UniversalTaskPriority" },
            dueAt: { type: "string", format: "date-time" },
            ownerId: { type: "string", format: "uuid" },
            targetType: { type: "string", enum: ["remediation_task", "rights_request_task", "framework_update_impact"] },
            targetId: { type: "string", format: "uuid" },
            completedAt: { type: "string", format: "date-time" },
            completedBy: { type: "string", format: "uuid" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        UpdateUniversalTaskRequest: {
          type: "object",
          properties: {
            ownerId: { type: "string", format: "uuid" },
            status: { $ref: "#/components/schemas/UniversalTaskStatus" },
            priority: { $ref: "#/components/schemas/UniversalTaskPriority" }
          }
        },
        CalculateDiffRequest: {
          type: "object",
          required: ["frameworkKey", "fromVersionKey", "toVersionKey"],
          properties: {
            frameworkKey: { type: "string" },
            fromVersionKey: { type: "string" },
            toVersionKey: { type: "string" }
          }
        },
        FrameworkDiff: {
          type: "object",
          required: ["id", "tenantId", "version", "frameworkId", "fromVersionId", "toVersionId", "createdBy", "createdAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            frameworkId: { type: "string", format: "uuid" },
            fromVersionId: { type: "string", format: "uuid" },
            toVersionId: { type: "string", format: "uuid" },
            frameworkKey: { type: "string" },
            fromVersionKey: { type: "string" },
            toVersionKey: { type: "string" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        FrameworkDiffItem: {
          type: "object",
          required: ["id", "tenantId", "version", "diffId", "changeType", "controlKey", "createdBy", "createdAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            diffId: { type: "string", format: "uuid" },
            changeType: { type: "string", enum: ["added", "removed", "modified"] },
            controlKey: { type: "string" },
            oldValue: { type: "object", nullable: true },
            newValue: { type: "object", nullable: true },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        FrameworkUpdateImpact: {
          type: "object",
          required: ["id", "tenantId", "version", "diffItemId", "assessmentId", "controlInstanceId", "status", "createdBy", "createdAt", "updatedBy", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            diffItemId: { type: "string", format: "uuid" },
            assessmentId: { type: "string", format: "uuid" },
            controlInstanceId: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["pending", "reassessed", "accepted", "ignored"] },
            resolutionRationale: { type: "string", nullable: true },
            resolvedBy: { type: "string", format: "uuid", nullable: true },
            resolvedAt: { type: "string", format: "date-time", nullable: true },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        ResolveImpactRequest: {
          type: "object",
          required: ["status", "resolutionRationale"],
          properties: {
            status: { type: "string", enum: ["accepted", "ignored"] },
            resolutionRationale: { type: "string" }
          }
        },
        RemediationTask: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "findingId",
            "ownerId",
            "dueAt",
            "status",
            "version",
            "classification",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            findingId: { type: "string", format: "uuid" },
            ownerId: { type: "string", format: "uuid" },
            dueAt: { type: "string", format: "date-time" },
            status: { $ref: "#/components/schemas/RemediationTaskStatus" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        RemediationTaskReview: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "version",
            "remediationTaskId",
            "reviewerId",
            "decision",
            "rationale",
            "evidenceVersionIds",
            "reviewedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            remediationTaskId: { type: "string", format: "uuid" },
            reviewerId: { type: "string", format: "uuid" },
            decision: { $ref: "#/components/schemas/RemediationTaskReviewDecision" },
            rationale: { type: "string" },
            evidenceVersionIds: {
              type: "array",
              items: { type: "string", format: "uuid" }
            },
            reviewedAt: { type: "string", format: "date-time" }
          }
        },
        ReportFormat: {
          enum: ["pdf", "xlsx"]
        },
        RequestReportExportRequest: {
          type: "object",
          required: ["assessmentId", "snapshotId", "templateVersion", "format"],
          properties: {
            assessmentId: { type: "string", format: "uuid" },
            snapshotId: { type: "string" },
            templateVersion: { type: "string" },
            format: { $ref: "#/components/schemas/ReportFormat" }
          }
        },
        ReportExport: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "assessmentId",
            "snapshotId",
            "templateVersion",
            "format",
            "idempotencyKey",
            "sha256",
            "version",
            "classification",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            assessmentId: { type: "string", format: "uuid" },
            snapshotId: { type: "string" },
            templateVersion: { type: "string" },
            format: { $ref: "#/components/schemas/ReportFormat" },
            idempotencyKey: { type: "string" },
            sha256: { type: "string" },
            storageUri: { type: "string" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        TenantQuestion: {
          type: "object",
          required: ["id", "tenantId", "questionText", "responseType", "frameworkKeys", "status", "createdBy", "createdAt", "done"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            questionText: { type: "string" },
            responseType: { enum: ["boolean", "text", "maturity", "multi_select"] },
            description: { type: "string", nullable: true },
            frameworkKeys: { type: "array", items: { type: "string" } },
            status: { enum: ["active", "archived"] },
            backingQuestionVersionId: { type: "string", format: "uuid", nullable: true },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            done: { type: "boolean" }
          }
        },
        CreateTenantQuestionRequest: {
          type: "object",
          required: ["questionText", "responseType", "frameworkKeys"],
          properties: {
            questionText: { type: "string" },
            responseType: { enum: ["boolean", "text", "maturity", "multi_select"] },
            description: { type: "string" },
            frameworkKeys: { type: "array", items: { type: "string" } }
          }
        },
        CreateAssessmentFromQuestionRequest: {
          type: "object",
          required: ["scopeName", "ownerId", "periodStart", "periodEnd"],
          properties: {
            scopeName: { type: "string" },
            ownerId: { type: "string", format: "uuid" },
            periodStart: { type: "string", format: "date" },
            periodEnd: { type: "string", format: "date" }
          }
        },
        UnifiedQuestion: {
          type: "object",
          required: ["id", "source", "questionVersionId", "questionText", "responseType", "frameworkKeys", "done", "assessmentId"],
          properties: {
            id: { type: "string" },
            source: { enum: ["canonical", "custom"] },
            questionVersionId: { type: "string" },
            questionText: { type: "string" },
            responseType: { type: "string" },
            frameworkKeys: { type: "array", items: { type: "string" } },
            done: { type: "boolean" },
            assessmentId: { type: "string", format: "uuid", nullable: true }
          }
        },
        FrameworkComplianceSummary: {
          type: "object",
          required: ["frameworkKey", "totalQuestions", "completedQuestions", "remainingQuestions", "compliancePercent"],
          properties: {
            frameworkKey: { type: "string" },
            totalQuestions: { type: "integer" },
            completedQuestions: { type: "integer" },
            remainingQuestions: { type: "integer" },
            compliancePercent: { type: "number" }
          }
        },
        DashboardSummary: {
          type: "object",
          required: ["totalQuestions", "completedQuestions", "remainingQuestions", "overallCompletionPercent", "frameworks", "recentAssessments"],
          properties: {
            totalQuestions: { type: "integer" },
            completedQuestions: { type: "integer" },
            remainingQuestions: { type: "integer" },
            overallCompletionPercent: { type: "number" },
            frameworks: { type: "array", items: { $ref: "#/components/schemas/FrameworkComplianceSummary" } },
            recentAssessments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  scopeName: { type: "string" },
                  status: { type: "string" },
                  createdAt: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        ControlDispositionResult: {
          type: "object",
          required: ["itemId", "controlId", "harmonizedControlId", "frameworkKey", "frameworkVersion", "disposition", "reason", "findingCount", "citationId"],
          properties: {
            itemId: { type: "string", format: "uuid" },
            controlId: { type: "string" },
            harmonizedControlId: { type: "string" },
            frameworkKey: { type: "string" },
            frameworkVersion: { type: "string" },
            disposition: { enum: ["approved", "not_approved", "not_applicable"] },
            reason: { type: "string" },
            findingCount: { type: "integer" },
            citationId: { type: "string" }
          }
        },
        FrameworkComplianceResult: {
          type: "object",
          required: [
            "frameworkKey",
            "frameworkVersion",
            "applicableCount",
            "approvedCount",
            "notApprovedCount",
            "notApplicableCount",
            "rawPercentage",
            "displayPercentage",
            "formula",
            "citationId"
          ],
          properties: {
            frameworkKey: { type: "string" },
            frameworkVersion: { type: "string" },
            applicableCount: { type: "integer" },
            approvedCount: { type: "integer" },
            notApprovedCount: { type: "integer" },
            notApplicableCount: { type: "integer" },
            rawPercentage: { type: "number", nullable: true },
            displayPercentage: { type: "string" },
            formula: { type: "string" },
            citationId: { type: "string" }
          }
        },
        ComplianceEngineResult: {
          type: "object",
          required: ["dispositions", "frameworks"],
          properties: {
            dispositions: { type: "array", items: { $ref: "#/components/schemas/ControlDispositionResult" } },
            frameworks: { type: "array", items: { $ref: "#/components/schemas/FrameworkComplianceResult" } }
          }
        },
        FindingSummaryRow: {
          type: "object",
          required: [
            "id",
            "severity",
            "description",
            "assessmentItemId",
            "frameworkKey",
            "controlId",
            "ownerId",
            "dueAt",
            "remediationStatus",
            "riskAccepted"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            severity: { enum: ["low", "medium", "high", "critical"] },
            description: { type: "string" },
            assessmentItemId: { type: "string", format: "uuid", nullable: true },
            frameworkKey: { type: "string", nullable: true },
            controlId: { type: "string", nullable: true },
            ownerId: { type: "string", format: "uuid", nullable: true },
            dueAt: { type: "string", format: "date-time", nullable: true },
            remediationStatus: { type: "string", nullable: true },
            riskAccepted: { type: "boolean" }
          }
        },
        QuestionAnswerRow: {
          type: "object",
          required: ["itemId", "frameworkKey", "controlId", "questionText", "answerText", "applicable", "applicabilityRationale", "evidenceCount"],
          properties: {
            itemId: { type: "string", format: "uuid" },
            frameworkKey: { type: "string" },
            controlId: { type: "string" },
            questionText: { type: "string" },
            answerText: { type: "string", nullable: true },
            applicable: { type: "boolean" },
            applicabilityRationale: { type: "string", nullable: true },
            evidenceCount: { type: "integer" }
          }
        },
        RemediationTaskSummaryRow: {
          type: "object",
          required: ["id", "findingId", "status", "ownerId", "dueAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            findingId: { type: "string", format: "uuid" },
            status: { enum: ["open", "in_progress", "verified", "risk_accepted"] },
            ownerId: { type: "string", format: "uuid" },
            dueAt: { type: "string", format: "date-time" }
          }
        },
        RiskAcceptanceSummaryRow: {
          type: "object",
          required: ["id", "findingId", "rationale", "approverId", "approvedAt", "expiresAt", "active"],
          properties: {
            id: { type: "string", format: "uuid" },
            findingId: { type: "string", format: "uuid" },
            riskId: { type: "string", format: "uuid" },
            riskTitle: { type: "string" },
            riskCategory: { type: "string" },
            riskInherentScore: { type: "number" },
            riskResidualScore: { type: "number" },
            rationale: { type: "string" },
            approverId: { type: "string", format: "uuid" },
            approvedAt: { type: "string", format: "date-time" },
            expiresAt: { type: "string", format: "date-time" },
            active: { type: "boolean" }
          }
        },
        EvidenceSummaryRow: {
          type: "object",
          required: ["id", "fileName", "state", "classification", "linkedItemIds"],
          properties: {
            id: { type: "string", format: "uuid" },
            fileName: { type: "string" },
            state: { type: "string" },
            classification: { type: "string" },
            linkedItemIds: { type: "array", items: { type: "string", format: "uuid" } }
          }
        },
        SignoffRow: {
          type: "object",
          required: ["id", "scopeType", "scopeId", "signerId", "decision", "signedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            scopeType: { type: "string" },
            scopeId: { type: "string" },
            signerId: { type: "string", format: "uuid" },
            decision: { type: "string" },
            signedAt: { type: "string", format: "date-time" }
          }
        },
        AuditReportJson: {
          type: "object",
          required: ["assessment", "questionsAndAnswers", "compliance", "evidence", "findings", "remediationTasks", "riskAcceptances", "signoffs"],
          properties: {
            assessment: {
              type: "object",
              required: ["id", "scopeName", "status", "periodStart", "periodEnd", "frameworkKeys", "itemCount", "closedAt", "closedBy"],
              properties: {
                id: { type: "string", format: "uuid" },
                scopeName: { type: "string" },
                status: { type: "string" },
                periodStart: { type: "string", format: "date-time" },
                periodEnd: { type: "string", format: "date-time" },
                frameworkKeys: { type: "array", items: { type: "string" } },
                itemCount: { type: "integer" },
                closedAt: { type: "string", format: "date-time", nullable: true },
                closedBy: { type: "string", format: "uuid", nullable: true }
              }
            },
            questionsAndAnswers: { type: "array", items: { $ref: "#/components/schemas/QuestionAnswerRow" } },
            compliance: { $ref: "#/components/schemas/ComplianceEngineResult" },
            evidence: {
              type: "object",
              required: ["total", "byState", "items"],
              properties: {
                total: { type: "integer" },
                byState: { type: "object", additionalProperties: { type: "integer" } },
                items: { type: "array", items: { $ref: "#/components/schemas/EvidenceSummaryRow" } }
              }
            },
            findings: {
              type: "object",
              required: ["total", "bySeverity", "items"],
              properties: {
                total: { type: "integer" },
                bySeverity: { type: "object", additionalProperties: { type: "integer" } },
                items: { type: "array", items: { $ref: "#/components/schemas/FindingSummaryRow" } }
              }
            },
            remediationTasks: {
              type: "object",
              required: ["total", "byStatus", "items"],
              properties: {
                total: { type: "integer" },
                byStatus: { type: "object", additionalProperties: { type: "integer" } },
                items: { type: "array", items: { $ref: "#/components/schemas/RemediationTaskSummaryRow" } }
              }
            },
            riskAcceptances: {
              type: "object",
              required: ["total", "active", "items"],
              properties: {
                total: { type: "integer" },
                active: { type: "integer" },
                items: { type: "array", items: { $ref: "#/components/schemas/RiskAcceptanceSummaryRow" } }
              }
            },
            signoffs: { type: "array", items: { $ref: "#/components/schemas/SignoffRow" } }
          }
        },
        NotificationItem: {
          type: "object",
          required: ["id", "category", "title", "description", "link", "createdAt"],
          properties: {
            id: { type: "string" },
            category: { enum: ["pending_answer", "pending_remediation", "review_item", "verify_remediation", "ready_to_close"] },
            title: { type: "string" },
            description: { type: "string" },
            link: { type: "string" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        NotificationFeed: {
          type: "object",
          required: ["role", "items"],
          properties: {
            role: { enum: ["platform_admin", "auditor", "compliance_manager", "viewer"] },
            items: { type: "array", items: { $ref: "#/components/schemas/NotificationItem" } }
          }
        },
        ClosedAssessmentSummary: {
          type: "object",
          required: ["assessmentId", "scopeName", "frameworks", "periodStart", "periodEnd", "itemCount", "findingCount"],
          properties: {
            assessmentId: { type: "string", format: "uuid" },
            scopeName: { type: "string" },
            frameworks: { type: "array", items: { type: "string" } },
            periodStart: { type: "string", format: "date-time" },
            periodEnd: { type: "string", format: "date-time" },
            closedAt: { type: "string", format: "date-time", nullable: true },
            closedBy: { type: "string", format: "uuid", nullable: true },
            itemCount: { type: "integer" },
            findingCount: { type: "integer" },
            latestReport: {
              type: "object",
              nullable: true,
              properties: {
                reportId: { type: "string", format: "uuid" },
                generatedAt: { type: "string", format: "date-time" }
              }
            }
          }
        },
        AuditReport: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "version",
            "assessmentId",
            "reportType",
            "generatedBy",
            "generatedAt",
            "reportHash",
            "artifactMimeType",
            "structuredReportJson",
            "classification",
            "createdBy",
            "createdAt",
            "updatedBy",
            "updatedAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            assessmentId: { type: "string", format: "uuid" },
            reportType: { enum: ["closure_audit"] },
            generatedBy: { type: "string", format: "uuid" },
            generatedAt: { type: "string", format: "date-time" },
            reportHash: { type: "string" },
            artifactMimeType: { type: "string" },
            structuredReportJson: { $ref: "#/components/schemas/AuditReportJson" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        AiGenerationStatus: {
          enum: ["awaiting_review", "fallback_used", "approved", "rejected"]
        },
        AiReviewState: {
          enum: ["pending_review", "approved", "rejected"]
        },
        AiResponseType: {
          enum: ["boolean", "text", "maturity", "multi_select"]
        },
        AiCitationSource: {
          type: "object",
          required: ["sourceId", "sourceType"],
          properties: {
            sourceId: { type: "string" },
            sourceType: {
              enum: ["framework_requirement", "harmonized_control", "evidence_expectation", "tenant_scope", "knowledge_base"]
            },
            checksum: { type: "string" },
            tenantId: { type: "string", format: "uuid" }
          }
        },
        AiControlContext: {
          type: "object",
          required: [
            "harmonizedControlId",
            "controlTitle",
            "controlDescription",
            "mappedClauseIds",
            "evidenceExpectationIds",
            "tenantScopeTags",
            "citations"
          ],
          properties: {
            harmonizedControlId: { type: "string" },
            controlTitle: { type: "string" },
            controlDescription: { type: "string" },
            mappedClauseIds: { type: "array", items: { type: "string" } },
            evidenceExpectationIds: { type: "array", items: { type: "string" } },
            tenantScopeTags: { type: "array", items: { type: "string" } },
            citations: { type: "array", items: { $ref: "#/components/schemas/AiCitationSource" } }
          }
        },
        AiGenerationParameters: {
          type: "object",
          required: ["temperature", "maxOutputTokens", "retrievalTopK"],
          properties: {
            temperature: { type: "number", minimum: 0, maximum: 0.3 },
            maxOutputTokens: { type: "integer", minimum: 1 },
            retrievalTopK: { type: "integer", minimum: 1 }
          }
        },
        AiGeneratedQuestionCandidate: {
          type: "object",
          required: ["questionText", "responseType", "evidenceExpectationIds", "citations", "confidence"],
          properties: {
            questionText: { type: "string" },
            responseType: { $ref: "#/components/schemas/AiResponseType" },
            evidenceExpectationIds: { type: "array", items: { type: "string" } },
            citations: { type: "array", items: { $ref: "#/components/schemas/AiCitationSource" } },
            confidence: { type: "number", minimum: 0, maximum: 1 }
          }
        },
        AiQuestionGenerationRequest: {
          type: "object",
          required: ["generationParameters"],
          properties: {
            generationParameters: { $ref: "#/components/schemas/AiGenerationParameters" },
            controls: { type: "array", items: { $ref: "#/components/schemas/AiControlContext" } },
            responseTypes: {
              type: "array",
              minItems: 1,
              maxItems: 4,
              items: { $ref: "#/components/schemas/AiResponseType" }
            },
            questionFocus: { type: "string" },
            frameworkKeys: { type: "array", items: { type: "string" } },
            providerQuestions: { type: "array", items: { $ref: "#/components/schemas/AiGeneratedQuestionCandidate" } }
          }
        },
        AiFallbackGenerationRequest: {
          type: "object",
          required: ["generationParameters", "failureReason"],
          properties: {
            generationParameters: { $ref: "#/components/schemas/AiGenerationParameters" },
            controls: { type: "array", items: { $ref: "#/components/schemas/AiControlContext" } },
            questionFocus: { type: "string" },
            frameworkKeys: { type: "array", items: { type: "string" } },
            failureReason: { enum: ["model_unavailable", "retrieval_unavailable", "policy_failed", "evaluation_failed"] }
          }
        },
        AiGenerationReviewRequest: {
          type: "object",
          required: ["decision", "rationale"],
          properties: {
            decision: { enum: ["approved", "rejected"] },
            rationale: { type: "string" },
            reviewerKind: { enum: ["human", "ai", "service"] }
          }
        },
        AiQuestionVersion: {
          type: "object",
          required: ["id", "version", "questionText", "responseType", "evidenceExpectationIds", "citations", "confidence", "state"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            generationRunId: { type: "string", format: "uuid" },
            generationStatus: { $ref: "#/components/schemas/AiGenerationStatus" },
            version: { type: "string" },
            questionText: { type: "string" },
            responseType: { $ref: "#/components/schemas/AiResponseType" },
            evidenceExpectationIds: { type: "array", items: { type: "string" } },
            citations: { type: "array", items: { $ref: "#/components/schemas/AiCitationSource" } },
            confidence: { type: "number" },
            state: { $ref: "#/components/schemas/AiReviewState" },
            approvedBy: { type: "string", format: "uuid", nullable: true },
            approvedAt: { type: "string", format: "date-time", nullable: true }
          }
        },
        AiGenerationRun: {
          type: "object",
          required: [
            "id",
            "tenantId",
            "actorId",
            "useCase",
            "status",
            "promptVersionId",
            "modelDeploymentId",
            "retrievalIndexId",
            "generationParameters",
            "inputFingerprint",
            "outputFingerprint",
            "questions",
            "createdAt"
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            actorId: { type: "string", format: "uuid" },
            useCase: { enum: ["assessment_question"] },
            status: { $ref: "#/components/schemas/AiGenerationStatus" },
            promptVersionId: { type: "string", format: "uuid" },
            modelDeploymentId: { type: "string", format: "uuid" },
            retrievalIndexId: { type: "string", format: "uuid" },
            generationParameters: { $ref: "#/components/schemas/AiGenerationParameters" },
            inputFingerprint: { type: "string" },
            outputFingerprint: { type: "string" },
            failureReason: { type: ["string", "null"] },
            questions: { type: "array", items: { $ref: "#/components/schemas/AiQuestionVersion" } },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        AiGenerationProvenance: {
          type: "object",
          additionalProperties: true
        },
        // G-06 Phase 1 (0020_g06_ai_provenance_lineage.sql): retrieved chunks, citations, safety
        // checks, evaluation suites/cases/results, publication approval.
        AiPublicationEvent: {
          type: "object",
          required: ["id", "tenantId", "targetType", "targetId", "approvedVersionId", "approverId", "publishedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            versionNumber: { type: "integer" },
            targetType: { enum: ["ai_question_version", "prompt_version", "model_deployment"] },
            targetId: { type: "string", format: "uuid" },
            generationRunId: { type: "string", format: "uuid" },
            approvedVersionId: { type: "string", format: "uuid" },
            approverId: { type: "string", format: "uuid" },
            publishedAt: { type: "string", format: "date-time" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        KnowledgeChunkSourceType: {
          enum: ["framework_requirement", "harmonized_control", "policy_version", "evidence_object"]
        },
        CreateKnowledgeChunkRequest: {
          type: "object",
          required: ["retrievalIndexId", "sourceType", "sourceId", "sourceVersion", "contentHash", "textUri"],
          properties: {
            retrievalIndexId: { type: "string", format: "uuid" },
            sourceType: { $ref: "#/components/schemas/KnowledgeChunkSourceType" },
            sourceId: { type: "string" },
            sourceVersion: { type: "string" },
            contentHash: { type: "string" },
            aclJson: { type: "object" },
            textUri: { type: "string" }
          }
        },
        KnowledgeChunk: {
          type: "object",
          required: ["id", "tenantId", "retrievalIndexId", "sourceType", "sourceId", "sourceVersion", "contentHash", "textUri"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            versionNumber: { type: "integer" },
            retrievalIndexId: { type: "string", format: "uuid" },
            sourceType: { $ref: "#/components/schemas/KnowledgeChunkSourceType" },
            sourceId: { type: "string" },
            sourceVersion: { type: "string" },
            contentHash: { type: "string" },
            aclJson: { type: "object" },
            textUri: { type: "string" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        CreateRetrievalRunRequest: {
          type: "object",
          required: ["queryHash", "retrievalIndexId", "topK"],
          properties: {
            queryHash: { type: "string" },
            filtersJson: { type: "object" },
            retrievalIndexId: { type: "string", format: "uuid" },
            topK: { type: "integer", minimum: 1, maximum: 50 }
          }
        },
        RetrievalRun: {
          type: "object",
          required: ["id", "tenantId", "queryHash", "retrievalIndexId", "topK", "startedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            versionNumber: { type: "integer" },
            queryHash: { type: "string" },
            filtersJson: { type: "object" },
            retrievalIndexId: { type: "string", format: "uuid" },
            topK: { type: "integer" },
            startedAt: { type: "string", format: "date-time" },
            finishedAt: { type: "string", format: "date-time", nullable: true },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        RetrievedChunkAclDecision: {
          enum: ["allowed", "denied"]
        },
        CreateRetrievedChunkRequest: {
          type: "object",
          required: ["knowledgeChunkId", "rank", "score", "aclDecision"],
          properties: {
            knowledgeChunkId: { type: "string", format: "uuid" },
            rank: { type: "integer", minimum: 1 },
            score: { type: "number" },
            aclDecision: { $ref: "#/components/schemas/RetrievedChunkAclDecision" }
          }
        },
        RetrievedChunk: {
          type: "object",
          required: ["id", "tenantId", "retrievalRunId", "knowledgeChunkId", "rank", "score", "aclDecision"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            versionNumber: { type: "integer" },
            retrievalRunId: { type: "string", format: "uuid" },
            knowledgeChunkId: { type: "string", format: "uuid" },
            rank: { type: "integer" },
            score: { type: "number" },
            aclDecision: { $ref: "#/components/schemas/RetrievedChunkAclDecision" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        CreateGenerationCitationRequest: {
          type: "object",
          required: ["outputPath", "knowledgeChunkId"],
          properties: {
            outputPath: { type: "string" },
            knowledgeChunkId: { type: "string", format: "uuid" },
            locator: { type: "string" },
            entailmentScore: { type: "number", minimum: 0, maximum: 1 }
          }
        },
        GenerationCitation: {
          type: "object",
          required: ["id", "tenantId", "generationRunId", "outputPath", "knowledgeChunkId"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            versionNumber: { type: "integer" },
            generationRunId: { type: "string", format: "uuid" },
            outputPath: { type: "string" },
            knowledgeChunkId: { type: "string", format: "uuid" },
            locator: { type: "string" },
            entailmentScore: { type: "number" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        SafetyCheckType: {
          enum: ["prompt_injection", "pii_exposure", "toxicity", "policy_bypass", "jailbreak"]
        },
        SafetyCheckResult: {
          enum: ["pass", "fail", "warn"]
        },
        CreateSafetyCheckRequest: {
          type: "object",
          required: ["checkType", "policyVersion", "result"],
          properties: {
            checkType: { $ref: "#/components/schemas/SafetyCheckType" },
            policyVersion: { type: "string" },
            result: { $ref: "#/components/schemas/SafetyCheckResult" },
            score: { type: "number" },
            redactionSummary: { type: "object" }
          }
        },
        SafetyCheck: {
          type: "object",
          required: ["id", "tenantId", "generationRunId", "checkType", "policyVersion", "result"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            versionNumber: { type: "integer" },
            generationRunId: { type: "string", format: "uuid" },
            checkType: { $ref: "#/components/schemas/SafetyCheckType" },
            policyVersion: { type: "string" },
            result: { $ref: "#/components/schemas/SafetyCheckResult" },
            score: { type: "number", nullable: true },
            redactionSummary: { type: "object" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        CreateEvaluationSuiteRequest: {
          type: "object",
          required: ["useCase", "suiteKey", "suiteVersion"],
          properties: {
            useCase: { type: "string" },
            suiteKey: { type: "string" },
            suiteVersion: { type: "string" },
            thresholdPolicy: { type: "object" }
          }
        },
        EvaluationSuite: {
          type: "object",
          required: ["id", "tenantId", "useCase", "suiteKey", "suiteVersion", "status"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            versionNumber: { type: "integer" },
            useCase: { type: "string" },
            suiteKey: { type: "string" },
            suiteVersion: { type: "string" },
            status: { enum: ["draft", "active", "retired"] },
            thresholdPolicy: { type: "object" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        CreateEvaluationCaseRequest: {
          type: "object",
          required: ["caseKey", "inputFixtureUri"],
          properties: {
            caseKey: { type: "string" },
            inputFixtureUri: { type: "string" },
            expectedJson: { type: "object" }
          }
        },
        EvaluationCase: {
          type: "object",
          required: ["id", "tenantId", "suiteId", "caseKey", "inputFixtureUri"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            versionNumber: { type: "integer" },
            suiteId: { type: "string", format: "uuid" },
            caseKey: { type: "string" },
            inputFixtureUri: { type: "string" },
            expectedJson: { type: "object" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        CreateEvaluationResultRequest: {
          type: "object",
          required: ["evaluationRunId", "caseId", "metric", "score", "threshold"],
          properties: {
            evaluationRunId: { type: "string", format: "uuid" },
            caseId: { type: "string", format: "uuid" },
            metric: { type: "string" },
            score: { type: "number" },
            threshold: { type: "number" },
            artifactUri: { type: "string" }
          }
        },
        EvaluationResult: {
          type: "object",
          required: ["id", "tenantId", "evaluationRunId", "caseId", "metric", "score", "threshold", "passed"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            versionNumber: { type: "integer" },
            evaluationRunId: { type: "string", format: "uuid" },
            caseId: { type: "string", format: "uuid" },
            metric: { type: "string" },
            score: { type: "number" },
            threshold: { type: "number" },
            passed: { type: "boolean" },
            artifactUri: { type: "string" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        ConnectorKind: {
          enum: [
            "cloud",
            "identity",
            "endpoint",
            "code",
            "ticketing",
            "document",
            "siem",
            "vulnerability",
            "data",
            "crm",
            "clm",
            "notification",
            "vendor_intelligence",
            "trust_portal"
          ]
        },
        ConnectorStatus: {
          enum: ["draft", "active", "disabled"]
        },
        ConnectorHealth: {
          enum: ["healthy", "degraded", "failing"]
        },
        ConnectorScope: {
          type: "object",
          required: ["name", "access", "reason"],
          properties: {
            name: { type: "string" },
            access: { enum: ["read", "write"] },
            reason: { type: "string" }
          }
        },
        RegisterIntegrationConnectorRequest: {
          type: "object",
          required: ["key", "provider", "kind", "scopes", "secretRef"],
          properties: {
            key: { type: "string" },
            provider: { type: "string" },
            kind: { $ref: "#/components/schemas/ConnectorKind" },
            scopes: { type: "array", items: { $ref: "#/components/schemas/ConnectorScope" } },
            secretRef: { type: "string" }
          }
        },
        IntegrationConnector: {
          type: "object",
          required: ["id", "tenantId", "key", "provider", "kind", "scopes", "secretRef", "status", "health", "syncCursor", "createdAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            key: { type: "string" },
            provider: { type: "string" },
            kind: { $ref: "#/components/schemas/ConnectorKind" },
            scopes: { type: "array", items: { $ref: "#/components/schemas/ConnectorScope" } },
            secretRef: { type: "string" },
            status: { $ref: "#/components/schemas/ConnectorStatus" },
            health: { $ref: "#/components/schemas/ConnectorHealth" },
            syncCursor: { type: ["string", "null"] },
            lastSeenAt: { type: "string", format: "date-time", nullable: true },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        ConnectorObjectCounts: {
          type: "object",
          required: ["read", "created", "updated", "deleted"],
          properties: {
            read: { type: "integer", minimum: 0 },
            created: { type: "integer", minimum: 0 },
            updated: { type: "integer", minimum: 0 },
            deleted: { type: "integer", minimum: 0 }
          }
        },
        ConnectorSyncStatus: {
          enum: ["started", "succeeded", "failed"]
        },
        RecordConnectorSyncRunRequest: {
          type: "object",
          required: ["status", "objectCounts"],
          properties: {
            status: { $ref: "#/components/schemas/ConnectorSyncStatus" },
            cursorAfter: { type: ["string", "null"] },
            objectCounts: { $ref: "#/components/schemas/ConnectorObjectCounts" },
            finishedAt: { type: "string", format: "date-time", nullable: true },
            error: { type: "string", nullable: true },
            alertOwnerId: { type: "string", format: "uuid" }
          }
        },
        ConnectorSyncRun: {
          type: "object",
          required: ["id", "tenantId", "connectorId", "status", "cursorBefore", "cursorAfter", "startedAt", "objectCounts"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            connectorId: { type: "string", format: "uuid" },
            status: { $ref: "#/components/schemas/ConnectorSyncStatus" },
            cursorBefore: { type: ["string", "null"] },
            cursorAfter: { type: ["string", "null"] },
            startedAt: { type: "string", format: "date-time" },
            finishedAt: { type: "string", format: "date-time" },
            objectCounts: { $ref: "#/components/schemas/ConnectorObjectCounts" },
            error: { type: "string" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        AssuranceAlertStatus: {
          enum: ["open", "triaged", "resolved"]
        },
        AssuranceAlert: {
          type: "object",
          required: ["id", "tenantId", "sourceType", "sourceId", "severity", "ownerId", "slaDueAt", "status", "reason"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            sourceType: { enum: ["control_test", "connector_health", "evidence_freshness"] },
            sourceId: { type: "string", format: "uuid" },
            severity: { enum: ["low", "medium", "high", "critical"] },
            ownerId: { type: "string", format: "uuid" },
            slaDueAt: { type: "string", format: "date-time" },
            status: { $ref: "#/components/schemas/AssuranceAlertStatus" },
            reason: { type: "string" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        ConnectorSyncRunResult: {
          type: "object",
          required: ["connector", "syncRun"],
          properties: {
            connector: { $ref: "#/components/schemas/IntegrationConnector" },
            syncRun: { $ref: "#/components/schemas/ConnectorSyncRun" },
            alert: { $ref: "#/components/schemas/AssuranceAlert", nullable: true }
          }
        },
        ConnectorDeliveryStatus: {
          enum: ["pending", "delivered", "failed", "dead_lettered"]
        },
        RecordConnectorObjectRequest: {
          type: "object",
          required: ["syncRunId", "objectType", "externalId", "sourcePayload", "deliveryStatus", "sourceTimestamp"],
          properties: {
            syncRunId: { type: "string", format: "uuid" },
            objectType: { type: "string" },
            externalId: { type: "string" },
            sourcePayload: { type: "object", additionalProperties: true },
            deliveryStatus: { $ref: "#/components/schemas/ConnectorDeliveryStatus" },
            sourceTimestamp: { type: "string", format: "date-time" }
          }
        },
        ConnectorObject: {
          type: "object",
          required: ["id", "tenantId", "connectorId", "objectType", "externalId", "sourceHash", "provenance", "deliveryStatus"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            connectorId: { type: "string", format: "uuid" },
            objectType: { type: "string" },
            externalId: { type: "string" },
            sourceHash: { type: "string" },
            provenance: { type: "object", additionalProperties: true },
            deliveryStatus: { $ref: "#/components/schemas/ConnectorDeliveryStatus" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        RegisterWebhookContractRequest: {
          type: "object",
          required: ["key", "version", "direction", "signingSecretRef", "rateLimitPerMinute"],
          properties: {
            key: { type: "string" },
            version: { type: "string" },
            direction: { enum: ["inbound", "outbound"] },
            signingSecretRef: { type: "string" },
            rateLimitPerMinute: { type: "integer", minimum: 1 }
          }
        },
        WebhookContract: {
          type: "object",
          required: ["id", "tenantId", "key", "version", "direction", "signingSecretRef", "rateLimitPerMinute", "status"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            versionNumber: { type: "integer" },
            key: { type: "string" },
            version: { type: "string" },
            direction: { enum: ["inbound", "outbound"] },
            signingSecretRef: { type: "string" },
            rateLimitPerMinute: { type: "integer" },
            status: { enum: ["active", "disabled"] },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        RecordWebhookDeliveryRequest: {
          type: "object",
          required: ["deliveryIdempotencyKey", "payload", "deliveryStatus", "attempts"],
          properties: {
            deliveryIdempotencyKey: { type: "string" },
            payload: { type: "object", additionalProperties: true },
            deliveryStatus: { $ref: "#/components/schemas/ConnectorDeliveryStatus" },
            attempts: { type: "integer", minimum: 1 },
            observedAt: { type: "string", format: "date-time" },
            lastError: { type: "string", nullable: true }
          }
        },
        WebhookDelivery: {
          type: "object",
          required: ["id", "tenantId", "webhookId", "idempotencyKey", "payloadHash", "deliveryStatus", "attempts", "observedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            webhookId: { type: "string", format: "uuid" },
            idempotencyKey: { type: "string" },
            payloadHash: { type: "string" },
            deliveryStatus: { $ref: "#/components/schemas/ConnectorDeliveryStatus" },
            attempts: { type: "integer" },
            observedAt: { type: "string", format: "date-time" },
            lastError: { type: "string", nullable: true },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        ControlTestResult: {
          type: "object",
          required: ["status", "summary", "evidenceObjectIds"],
          properties: {
            status: { enum: ["pass", "fail", "inconclusive"] },
            summary: { type: "string" },
            evidenceObjectIds: { type: "array", items: { type: "string", format: "uuid" } }
          }
        },
        RecordAutomatedControlTestRequest: {
          type: "object",
          required: ["connectorId", "controlRef", "query", "population", "sample", "result", "sourceTimestamp", "ownerId"],
          properties: {
            connectorId: { type: "string", format: "uuid" },
            controlRef: { type: "string" },
            query: { type: "string" },
            population: { type: "object", additionalProperties: true },
            sample: { type: "object", additionalProperties: true },
            result: { $ref: "#/components/schemas/ControlTestResult" },
            sourceTimestamp: { type: "string", format: "date-time" },
            ownerId: { type: "string", format: "uuid" }
          }
        },
        AutomatedControlTest: {
          type: "object",
          required: ["id", "tenantId", "connectorId", "controlRef", "query", "population", "sample", "result", "sourceTimestamp"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            version: { type: "integer" },
            connectorId: { type: "string", format: "uuid" },
            controlRef: { type: "string" },
            query: { type: "string" },
            population: { type: "object", additionalProperties: true },
            sample: { type: "object", additionalProperties: true },
            result: { $ref: "#/components/schemas/ControlTestResult" },
            sourceTimestamp: { type: "string", format: "date-time" },
            classification: { $ref: "#/components/schemas/Classification" },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "string", format: "uuid" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        AutomatedControlTestResultResponse: {
          type: "object",
          required: ["controlTest"],
          properties: {
            controlTest: { $ref: "#/components/schemas/AutomatedControlTest" },
            alert: { $ref: "#/components/schemas/AssuranceAlert", nullable: true }
          }
        },
        ...privacyOperationsSchemas(),
        ...privacyGraphSchemas(),
        ...enterpriseGrcSchemas(),
        ...auditChainSchemas(),
        Problem: {
          type: "object",
          required: ["type", "title", "status", "detail", "correlationId"],
          properties: {
            type: { type: "string" },
            title: { type: "string" },
            status: { type: "integer" },
            detail: { type: "string" },
            instance: { type: "string" },
            correlationId: { type: "string" }
          }
        }
      }
    }
  };
}

function privacyOperationsPaths() {
  return {
    "/v1/privacy-operations/inventory-records": {
      post: privacyMutation(
        "createPrivacyInventoryRecord",
        "Create a data inventory record.",
        "CreatePrivacyInventoryRecordRequest",
        "DataInventoryRecord",
        "Data inventory record created."
      ),
      get: privacyList("listPrivacyInventoryRecords", "List data inventory records.", "DataInventoryRecord")
    },
    "/v1/privacy-operations/inventory-records/{recordId}": {
      get: privacyRead(
        "getPrivacyInventoryRecord",
        "Fetch a data inventory record.",
        "DataInventoryRecord",
        [pathParameter("recordId", "uuid")]
      )
    },
    "/v1/privacy-operations/processing-activities": {
      post: privacyMutation(
        "createProcessingActivity",
        "Create a RoPA processing activity.",
        "CreateProcessingActivityRequest",
        "ProcessingActivity",
        "Processing activity created."
      ),
      get: privacyList("listProcessingActivities", "List RoPA processing activities.", "ProcessingActivity")
    },
    "/v1/privacy-operations/processing-activities/{activityId}": {
      get: privacyRead(
        "getProcessingActivity",
        "Fetch a RoPA processing activity.",
        "ProcessingActivity",
        [pathParameter("activityId", "uuid")]
      )
    },
    "/v1/privacy-operations/dpia-assessments": {
      post: privacyMutation(
        "createDpiaAssessment",
        "Create a DPIA assessment.",
        "CreateDpiaAssessmentRequest",
        "DpiaAssessment",
        "DPIA assessment created."
      ),
      get: privacyList("listDpiaAssessments", "List DPIA assessments.", "DpiaAssessment")
    },
    "/v1/privacy-operations/dpia-assessments/{dpiaId}": {
      get: privacyRead(
        "getDpiaAssessment",
        "Fetch a DPIA assessment.",
        "DpiaAssessment",
        [pathParameter("dpiaId", "uuid")]
      )
    },
    "/v1/privacy-operations/rights-requests": {
      post: privacyMutation(
        "createPrivacyRightsRequest",
        "Open a privacy rights request.",
        "CreatePrivacyRightsRequestRequest",
        "PrivacyRightsRequest",
        "Rights request opened."
      ),
      get: privacyList("listPrivacyRightsRequests", "List privacy rights requests.", "PrivacyRightsRequest")
    },
    "/v1/privacy-operations/rights-requests/{requestId}": {
      get: privacyRead(
        "getPrivacyRightsRequest",
        "Fetch a privacy rights request.",
        "PrivacyRightsRequest",
        [pathParameter("requestId", "uuid")]
      )
    },
    "/v1/privacy-operations/rights-requests/{requestId}/verify-identity": {
      post: privacyMutation(
        "verifyPrivacyRightsRequestIdentity",
        "Verify identity for a privacy rights request.",
        undefined,
        "PrivacyRightsRequest",
        "Verified rights request.",
        [pathParameter("requestId", "uuid")]
      )
    },
    "/v1/privacy-operations/rights-requests/{requestId}/search-tasks": {
      post: privacyMutation(
        "addPrivacyRightsSearchTask",
        "Add a system search task to a verified rights request.",
        "AddPrivacyRightsSearchTaskRequest",
        "PrivacyRightsRequest",
        "Rights request with added search task.",
        [pathParameter("requestId", "uuid")]
      )
    },
    "/v1/privacy-operations/rights-requests/{requestId}/complete": {
      post: privacyMutation(
        "completePrivacyRightsRequest",
        "Complete a privacy rights request with evidence and communication.",
        "CompletePrivacyRightsRequestRequest",
        "PrivacyRightsRequest",
        "Completed rights request.",
        [pathParameter("requestId", "uuid")]
      )
    },
    "/v1/privacy-operations/consents": {
      post: privacyMutation(
        "grantPrivacyConsent",
        "Grant consent for a subject and purpose.",
        "GrantPrivacyConsentRequest",
        "ConsentRecord",
        "Consent granted."
      ),
      get: privacyList("listPrivacyConsents", "List consent records.", "ConsentRecord")
    },
    "/v1/privacy-operations/consents/{consentId}": {
      get: privacyRead(
        "getPrivacyConsent",
        "Fetch a consent record.",
        "ConsentRecord",
        [pathParameter("consentId", "uuid")]
      )
    },
    "/v1/privacy-operations/consents/{consentId}/withdraw": {
      post: privacyMutation(
        "withdrawPrivacyConsent",
        "Withdraw consent with a reason.",
        "WithdrawPrivacyConsentRequest",
        "ConsentRecord",
        "Withdrawn consent record.",
        [pathParameter("consentId", "uuid")]
      )
    },
    "/v1/privacy-operations/incidents": {
      post: privacyMutation(
        "createPrivacyIncident",
        "Create a privacy incident with notification clocks.",
        "CreatePrivacyIncidentRequest",
        "PrivacyIncident",
        "Privacy incident created."
      ),
      get: privacyList("listPrivacyIncidents", "List privacy incidents.", "PrivacyIncident")
    },
    "/v1/privacy-operations/incidents/{incidentId}": {
      get: privacyRead(
        "getPrivacyIncident",
        "Fetch a privacy incident.",
        "PrivacyIncident",
        [pathParameter("incidentId", "uuid")]
      )
    },
    "/v1/privacy-operations/retention-schedules": {
      post: privacyMutation(
        "createRetentionSchedule",
        "Create a retention schedule.",
        "CreateRetentionScheduleRequest",
        "RetentionSchedule",
        "Retention schedule created."
      ),
      get: privacyList("listRetentionSchedules", "List retention schedules.", "RetentionSchedule")
    },
    "/v1/privacy-operations/retention-schedules/{scheduleId}": {
      get: privacyRead(
        "getRetentionSchedule",
        "Fetch a retention schedule.",
        "RetentionSchedule",
        [pathParameter("scheduleId", "uuid")]
      )
    },
    "/v1/privacy-operations/retention-schedules/{scheduleId}/evaluation": {
      get: privacyRead(
        "evaluateRetentionSchedule",
        "Evaluate retention or legal-hold decision for record age.",
        "RetentionDecisionResponse",
        [
          pathParameter("scheduleId", "uuid"),
          { name: "ageMonths", in: "query", required: true, schema: { type: "integer", minimum: 0 } }
        ]
      )
    }
  };
}

function privacyGraphPaths() {
  return {
    "/v1/privacy/systems-assets": {
      post: privacyMutation("createSystemAsset", "Register a system/asset.", "CreateSystemAssetRequest", "SystemAsset", "System asset created."),
      get: privacyList("listSystemAssets", "List systems/assets.", "SystemAsset")
    },
    "/v1/privacy/data-categories": {
      post: privacyMutation("createDataCategory", "Define a data category.", "CreateDataCategoryRequest", "DataCategory", "Data category created."),
      get: privacyList("listDataCategories", "List data categories.", "DataCategory")
    },
    "/v1/privacy/data-subject-categories": {
      post: privacyMutation("createDataSubjectCategory", "Define a data subject category.", "CreateDataSubjectCategoryRequest", "DataSubjectCategory", "Data subject category created."),
      get: privacyList("listDataSubjectCategories", "List data subject categories.", "DataSubjectCategory")
    },
    "/v1/privacy/systems-assets/{systemId}/discovery-scans": {
      post: privacyMutation("createDataDiscoveryScan", "Record a data-discovery scan.", "CreateDataDiscoveryScanRequest", "DataDiscoveryScan", "Data discovery scan created.", [pathParameter("systemId", "uuid")]),
      get: privacyList("listDataDiscoveryScans", "List data-discovery scans for a system.", "DataDiscoveryScan", [pathParameter("systemId", "uuid")])
    },
    "/v1/privacy/discovery-scans/{scanId}/findings": {
      post: privacyMutation("createDataDiscoveryFinding", "Record a discovered-data finding.", "CreateDataDiscoveryFindingRequest", "DataDiscoveryFinding", "Data discovery finding created.", [pathParameter("scanId", "uuid")]),
      get: privacyList("listDataDiscoveryFindings", "List findings for a scan.", "DataDiscoveryFinding", [pathParameter("scanId", "uuid")])
    },
    "/v1/privacy/notices": {
      post: privacyMutation("createPrivacyNotice", "Create a privacy notice.", "CreatePrivacyNoticeRequest", "PrivacyNotice", "Privacy notice created."),
      get: privacyList("listPrivacyNotices", "List privacy notices.", "PrivacyNotice")
    },
    "/v1/privacy/notices/{noticeId}": {
      get: privacyRead("getPrivacyNotice", "Fetch a privacy notice.", "PrivacyNotice", [pathParameter("noticeId", "uuid")])
    },
    "/v1/privacy/notices/{noticeId}/versions": {
      post: privacyMutation("createPrivacyNoticeVersion", "Publish an immutable privacy notice version.", "CreatePrivacyNoticeVersionRequest", "PrivacyNoticeVersion", "Privacy notice version created.", [pathParameter("noticeId", "uuid")]),
      get: privacyList("listPrivacyNoticeVersions", "List versions of a privacy notice.", "PrivacyNoticeVersion")
    },
    "/v1/privacy/processing-activities/{activityId}/inventory-links": {
      post: privacyMutation("createProcessingInventoryLink", "Link a processing activity to an inventory record.", "CreateProcessingInventoryLinkRequest", "ProcessingInventoryLink", "Processing inventory link created.", [pathParameter("activityId", "uuid")]),
      get: privacyList("listProcessingInventoryLinks", "List inventory links for a processing activity.", "ProcessingInventoryLink", [pathParameter("activityId", "uuid")])
    },
    "/v1/privacy/purposes": {
      post: privacyMutation("createPurpose", "Define a processing purpose.", "CreatePurposeRequest", "Purpose", "Purpose created."),
      get: privacyList("listPurposes", "List processing purposes.", "Purpose")
    },
    "/v1/privacy/lawful-bases": {
      post: privacyMutation("createLawfulBasis", "Define a jurisdiction lawful basis.", "CreateLawfulBasisRequest", "LawfulBasis", "Lawful basis created."),
      get: privacyList("listLawfulBases", "List lawful bases.", "LawfulBasis")
    },
    "/v1/privacy/processing-activities/{activityId}/purposes": {
      post: privacyMutation("createProcessingPurposeAssignment", "Assign a purpose/lawful-basis to a processing activity.", "CreateProcessingPurposeAssignmentRequest", "ProcessingPurposeAssignment", "Processing purpose assignment created.", [pathParameter("activityId", "uuid")]),
      get: privacyList("listProcessingPurposeAssignments", "List purpose assignments for a processing activity.", "ProcessingPurposeAssignment", [pathParameter("activityId", "uuid")])
    },
    "/v1/privacy/recipients": {
      post: privacyMutation("createRecipient", "Register a recipient/controller/processor.", "CreateRecipientRequest", "Recipient", "Recipient created."),
      get: privacyList("listRecipients", "List recipients.", "Recipient")
    },
    "/v1/privacy/processing-activities/{activityId}/recipients": {
      post: privacyMutation("createProcessingRecipientLink", "Link a processing activity to a recipient.", "CreateProcessingRecipientLinkRequest", "ProcessingRecipientLink", "Processing recipient link created.", [pathParameter("activityId", "uuid")]),
      get: privacyList("listProcessingRecipientLinks", "List recipient links for a processing activity.", "ProcessingRecipientLink", [pathParameter("activityId", "uuid")])
    },
    "/v1/privacy/processing-activities/{activityId}/transfers": {
      post: privacyMutation("createTransfer", "Record an international transfer.", "CreateTransferRequest", "Transfer", "Transfer created.", [pathParameter("activityId", "uuid")]),
      get: privacyList("listTransfers", "List transfers for a processing activity.", "Transfer", [pathParameter("activityId", "uuid")])
    },
    "/v1/privacy/processing-activities/{activityId}/dpias": {
      post: privacyMutation("createDpiaV2", "Open a DPIA for a processing activity.", "CreateDpiaV2Request", "DpiaV2", "DPIA created.", [pathParameter("activityId", "uuid")])
    },
    "/v1/privacy/dpias-v2": {
      get: privacyList("listDpiasV2", "List DPIAs.", "DpiaV2")
    },
    "/v1/privacy/dpias-v2/{dpiaId}/risks": {
      post: privacyMutation("createDpiaRisk", "Record a DPIA risk finding.", "CreateDpiaRiskRequest", "DpiaRisk", "DPIA risk created.", [pathParameter("dpiaId", "uuid")]),
      get: privacyList("listDpiaRisks", "List DPIA risk findings.", "DpiaRisk", [pathParameter("dpiaId", "uuid")])
    },
    "/v1/privacy/rights-requests/{requestId}/tasks": {
      post: privacyMutation("createRightsRequestTask", "Add a task to a rights request.", "CreateRightsRequestTaskRequest", "RightsRequestTask", "Rights request task created.", [pathParameter("requestId", "uuid")]),
      get: privacyList("listRightsRequestTasks", "List tasks for a rights request.", "RightsRequestTask", [pathParameter("requestId", "uuid")])
    },
    "/v1/privacy/consent-purposes": {
      post: privacyMutation("createConsentPurposeVersion", "Publish a versioned consent purpose.", "CreateConsentPurposeVersionRequest", "ConsentPurposeVersion", "Consent purpose version created."),
      get: privacyList("listConsentPurposeVersions", "List versioned consent purposes.", "ConsentPurposeVersion")
    },
    "/v1/privacy/consent-events": {
      post: privacyMutation("createConsentEvent", "Append a consent ledger event.", "CreateConsentEventRequest", "ConsentEvent", "Consent event recorded."),
      get: privacyList("listConsentEvents", "List consent ledger events for a subject.", "ConsentEvent", [{ name: "subjectToken", in: "query", required: true, schema: { type: "string" } }])
    },
    "/v1/privacy/incidents/{incidentId}/assessments": {
      post: privacyMutation("createIncidentAssessment", "Record a breach-determination assessment.", "CreateIncidentAssessmentRequest", "IncidentAssessment", "Incident assessment created.", [pathParameter("incidentId", "uuid")]),
      get: privacyList("listIncidentAssessments", "List breach-determination assessments.", "IncidentAssessment", [pathParameter("incidentId", "uuid")])
    },
    "/v1/privacy/incidents/{incidentId}/notifications": {
      post: privacyMutation("createIncidentNotification", "Record a notification obligation.", "CreateIncidentNotificationRequest", "IncidentNotification", "Incident notification created.", [pathParameter("incidentId", "uuid")]),
      get: privacyList("listIncidentNotifications", "List notification obligations.", "IncidentNotification", [pathParameter("incidentId", "uuid")])
    },
    "/v1/privacy/retention-rules": {
      post: privacyMutation("createRetentionRule", "Define a typed retention rule.", "CreateRetentionRuleRequest", "RetentionRule", "Retention rule created."),
      get: privacyList("listRetentionRules", "List retention rules.", "RetentionRule")
    },
    "/v1/privacy/retention-assignments": {
      post: privacyMutation("createRetentionAssignment", "Assign a retention rule to a target object.", "CreateRetentionAssignmentRequest", "RetentionAssignment", "Retention assignment created."),
      get: privacyList("listRetentionAssignments", "List retention assignments for a target object.", "RetentionAssignment", [
        { name: "targetType", in: "query", required: true, schema: { type: "string" } },
        { name: "targetId", in: "query", required: true, schema: { type: "string", format: "uuid" } }
      ])
    },
    "/v1/privacy/legal-holds": {
      post: privacyMutation("createLegalHold", "Issue a legal hold.", "CreateLegalHoldRequest", "LegalHold", "Legal hold created."),
      get: privacyList("listLegalHolds", "List legal holds.", "LegalHold")
    },
    "/v1/privacy/legal-holds/{legalHoldId}": {
      get: privacyRead("getLegalHold", "Fetch a legal hold.", "LegalHold", [pathParameter("legalHoldId", "uuid")])
    },
    "/v1/privacy/legal-holds/{legalHoldId}/release": {
      post: privacyMutation("releaseLegalHold", "Release a legal hold.", null, "LegalHold", "Legal hold released.", [pathParameter("legalHoldId", "uuid")])
    },
    "/v1/privacy/legal-holds/{legalHoldId}/items": {
      post: privacyMutation("createLegalHoldItem", "Resolve a legal hold to an explicit protected target object.", "CreateLegalHoldItemRequest", "LegalHoldItem", "Legal hold item created.", [pathParameter("legalHoldId", "uuid")]),
      get: privacyList("listLegalHoldItems", "List protected target objects for a legal hold.", "LegalHoldItem", [pathParameter("legalHoldId", "uuid")])
    },
    "/v1/privacy/deletion-jobs": {
      post: privacyMutation("createDeletionJob", "Start a deletion/erasure execution job.", "CreateDeletionJobRequest", "DeletionJob", "Deletion job created."),
      get: privacyList("listDeletionJobs", "List deletion jobs.", "DeletionJob")
    },
    "/v1/privacy/deletion-jobs/{deletionJobId}": {
      get: privacyRead("getDeletionJob", "Fetch a deletion job.", "DeletionJob", [pathParameter("deletionJobId", "uuid")])
    },
    "/v1/privacy/deletion-jobs/{deletionJobId}/items": {
      post: privacyMutation("createDeletionItem", "Record a per-object deletion proof (blocked automatically by an active legal hold).", "CreateDeletionItemRequest", "DeletionItem", "Deletion item created.", [pathParameter("deletionJobId", "uuid")]),
      get: privacyList("listDeletionItems", "List per-object deletion proofs for a deletion job.", "DeletionItem", [pathParameter("deletionJobId", "uuid")])
    }
  };
}

function privacyMutation(operationId, summary, requestSchemaName, responseSchemaName, description, extraParameters = []) {
  return {
    operationId,
    tags: ["PrivacyOperations"],
    summary,
    parameters: [...extraParameters, idempotencyHeader(), ...requestContextHeaders()],
    ...(requestSchemaName ? { requestBody: jsonRequest(requestSchemaName) } : {}),
    responses: {
      "201": jsonResponse(description, responseSchemaName),
      "400": { $ref: "#/components/responses/Problem" },
      "401": { $ref: "#/components/responses/Problem" },
      "403": { $ref: "#/components/responses/Problem" },
      "404": { $ref: "#/components/responses/Problem" }
    }
  };
}

function privacyList(operationId, summary, schemaName, extraParameters = []) {
  return {
    operationId,
    tags: ["PrivacyOperations"],
    summary,
    parameters: [...extraParameters, ...paginationParameters(), ...requestContextHeaders()],
    responses: {
      "200": jsonArrayResponse(summary, schemaName),
      "401": { $ref: "#/components/responses/Problem" },
      "403": { $ref: "#/components/responses/Problem" }
    }
  };
}

function privacyRead(operationId, summary, schemaName, extraParameters = []) {
  return {
    operationId,
    tags: ["PrivacyOperations"],
    summary,
    parameters: [...extraParameters, ...requestContextHeaders()],
    responses: {
      "200": jsonResponse(summary, schemaName),
      "401": { $ref: "#/components/responses/Problem" },
      "403": { $ref: "#/components/responses/Problem" },
      "404": { $ref: "#/components/responses/Problem" }
    }
  };
}

function privacyOperationsSchemas() {
  return {
    PrivacyClassification: {
      enum: ["internal", "confidential", "restricted"]
    },
    DpiaRiskLevel: {
      enum: ["low", "medium", "high"]
    },
    RightsRequestType: {
      enum: ["access", "delete", "correct", "export", "restrict"]
    },
    RightsRequestStatus: {
      enum: ["open", "verified", "searching", "exception_applied", "completed"]
    },
    ConsentStatus: {
      enum: ["active", "withdrawn"]
    },
    IncidentSeverity: {
      enum: ["low", "medium", "high", "critical"]
    },
    RetentionDecision: {
      enum: ["retain", "dispose", "legal_hold_exception"]
    },
    DpiaApproval: {
      type: "object",
      required: ["actorId", "role", "approvedAt"],
      properties: {
        actorId: { type: "string", format: "uuid" },
        role: { type: "string" },
        approvedAt: { type: "string", format: "date-time" }
      }
    },
    RightsSearchTask: {
      type: "object",
      required: ["systemName", "ownerId", "completed"],
      properties: {
        systemName: { type: "string" },
        ownerId: { type: "string", format: "uuid" },
        completed: { type: "boolean" }
      }
    },
    RightsCommunication: {
      type: "object",
      required: ["channel", "message", "sentAt"],
      properties: {
        channel: { type: "string" },
        message: { type: "string" },
        sentAt: { type: "string", format: "date-time" }
      }
    },
    ConsentHistoryEntry: {
      type: "object",
      required: ["action", "actorId", "at"],
      properties: {
        action: { enum: ["granted", "withdrawn"] },
        actorId: { type: "string", format: "uuid" },
        at: { type: "string", format: "date-time" },
        reason: { type: "string" }
      }
    },
    PrivacyIncidentTimelineEntry: {
      type: "object",
      required: ["event", "actorId", "at"],
      properties: {
        event: { type: "string" },
        actorId: { type: "string", format: "uuid" },
        at: { type: "string", format: "date-time" }
      }
    },
    PrivacyIncidentAction: {
      type: "object",
      required: ["action", "ownerId", "dueAt", "completed"],
      properties: {
        action: { type: "string" },
        ownerId: { type: "string", format: "uuid" },
        dueAt: { type: "string", format: "date-time" },
        completed: { type: "boolean" }
      }
    },
    CreatePrivacyInventoryRecordRequest: {
      type: "object",
      required: [
        "systemName",
        "dataElements",
        "ownerId",
        "locations",
        "classification",
        "lineage",
        "processingActivityIds",
        "controlIds",
        "vendorIds",
        "evidenceIds"
      ],
      properties: {
        systemName: { type: "string" },
        dataElements: { type: "array", items: { type: "string" }, minItems: 1 },
        ownerId: { type: "string", format: "uuid" },
        locations: { type: "array", items: { type: "string" }, minItems: 1 },
        classification: { $ref: "#/components/schemas/PrivacyClassification" },
        lineage: { type: "array", items: { type: "string" } },
        processingActivityIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1 },
        controlIds: { type: "array", items: { type: "string" } },
        vendorIds: { type: "array", items: { type: "string", format: "uuid" } },
        evidenceIds: { type: "array", items: { type: "string", format: "uuid" } }
      }
    },
    DataInventoryRecord: {
      type: "object",
      required: ["id", "tenantId", "systemName", "dataElements", "ownerId", "locations", "classification", "processingActivityIds"],
      properties: {
        ...privacyRecordMetadataProperties(),
        systemName: { type: "string" },
        dataElements: { type: "array", items: { type: "string" } },
        ownerId: { type: "string", format: "uuid" },
        locations: { type: "array", items: { type: "string" } },
        lineage: { type: "array", items: { type: "string" } },
        processingActivityIds: { type: "array", items: { type: "string", format: "uuid" } },
        controlIds: { type: "array", items: { type: "string" } },
        vendorIds: { type: "array", items: { type: "string", format: "uuid" } },
        evidenceIds: { type: "array", items: { type: "string", format: "uuid" } }
      }
    },
    CreateProcessingActivityRequest: {
      type: "object",
      required: [
        "purpose",
        "lawfulBasis",
        "dataSubjectCategories",
        "recipients",
        "transfers",
        "retentionMonths",
        "jurisdiction",
        "inventoryRecordIds"
      ],
      properties: {
        purpose: { type: "string" },
        lawfulBasis: { type: "string" },
        dataSubjectCategories: { type: "array", items: { type: "string" } },
        recipients: { type: "array", items: { type: "string" } },
        transfers: { type: "array", items: { type: "string" } },
        retentionMonths: { type: "integer", minimum: 1 },
        jurisdiction: { type: "string" },
        inventoryRecordIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1 }
      }
    },
    ProcessingActivity: {
      type: "object",
      required: ["id", "tenantId", "purpose", "lawfulBasis", "retentionMonths", "jurisdiction", "inventoryRecordIds", "version"],
      properties: {
        ...privacyRecordMetadataProperties(),
        purpose: { type: "string" },
        lawfulBasis: { type: "string" },
        dataSubjectCategories: { type: "array", items: { type: "string" } },
        recipients: { type: "array", items: { type: "string" } },
        transfers: { type: "array", items: { type: "string" } },
        retentionMonths: { type: "integer" },
        jurisdiction: { type: "string" },
        inventoryRecordIds: { type: "array", items: { type: "string", format: "uuid" } },
        version: { type: "string" }
      }
    },
    CreateDpiaAssessmentRequest: {
      type: "object",
      required: ["processingActivityId", "riskLevel", "residualRiskScore", "approvals", "findings"],
      properties: {
        processingActivityId: { type: "string", format: "uuid" },
        riskLevel: { $ref: "#/components/schemas/DpiaRiskLevel" },
        residualRiskScore: { type: "integer", minimum: 0, maximum: 100 },
        approvals: { type: "array", items: { $ref: "#/components/schemas/DpiaApproval" }, minItems: 1 },
        findings: { type: "array", items: { type: "string" } }
      }
    },
    DpiaAssessment: {
      type: "object",
      required: ["id", "tenantId", "processingActivityId", "riskLevel", "residualRiskScore", "approvals", "findings"],
      properties: {
        ...privacyRecordMetadataProperties(),
        processingActivityId: { type: "string", format: "uuid" },
        riskLevel: { $ref: "#/components/schemas/DpiaRiskLevel" },
        residualRiskScore: { type: "integer" },
        approvals: { type: "array", items: { $ref: "#/components/schemas/DpiaApproval" } },
        findings: { type: "array", items: { type: "string" } },
        reviewObligationIds: { type: "array", items: { type: "string" } }
      }
    },
    CreatePrivacyRightsRequestRequest: {
      type: "object",
      required: ["subjectId", "requestType", "openedAt", "slaDays"],
      properties: {
        subjectId: { type: "string" },
        requestType: { $ref: "#/components/schemas/RightsRequestType" },
        openedAt: { type: "string", format: "date-time" },
        slaDays: { type: "integer", minimum: 1 }
      }
    },
    AddPrivacyRightsSearchTaskRequest: {
      type: "object",
      required: ["systemName", "ownerId"],
      properties: {
        systemName: { type: "string" },
        ownerId: { type: "string", format: "uuid" }
      }
    },
    CompletePrivacyRightsRequestRequest: {
      type: "object",
      required: ["completionEvidenceIds", "communication"],
      properties: {
        completionEvidenceIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1 },
        communication: { $ref: "#/components/schemas/RightsCommunication" }
      }
    },
    PrivacyRightsRequest: {
      type: "object",
      required: ["id", "tenantId", "subjectId", "requestType", "status", "identityVerified", "openedAt", "deadlineAt"],
      properties: {
        ...privacyRecordMetadataProperties(),
        subjectId: { type: "string" },
        requestType: { $ref: "#/components/schemas/RightsRequestType" },
        status: { $ref: "#/components/schemas/RightsRequestStatus" },
        identityVerified: { type: "boolean" },
        openedAt: { type: "string", format: "date-time" },
        deadlineAt: { type: "string", format: "date-time" },
        searchTasks: { type: "array", items: { $ref: "#/components/schemas/RightsSearchTask" } },
        exceptions: { type: "array", items: { type: "string" } },
        communications: { type: "array", items: { $ref: "#/components/schemas/RightsCommunication" } },
        completionEvidenceIds: { type: "array", items: { type: "string", format: "uuid" } }
      }
    },
    GrantPrivacyConsentRequest: {
      type: "object",
      required: ["subjectId", "purpose", "version", "region"],
      properties: {
        subjectId: { type: "string" },
        purpose: { type: "string" },
        version: { type: "string" },
        region: { type: "string" }
      }
    },
    WithdrawPrivacyConsentRequest: {
      type: "object",
      required: ["reason"],
      properties: {
        reason: { type: "string" }
      }
    },
    ConsentRecord: {
      type: "object",
      required: ["id", "tenantId", "subjectId", "purpose", "version", "region", "status", "history"],
      properties: {
        ...privacyRecordMetadataProperties(),
        subjectId: { type: "string" },
        purpose: { type: "string" },
        version: { type: "string" },
        region: { type: "string" },
        status: { $ref: "#/components/schemas/ConsentStatus" },
        history: { type: "array", items: { $ref: "#/components/schemas/ConsentHistoryEntry" } }
      }
    },
    CreatePrivacyIncidentRequest: {
      type: "object",
      required: ["severity", "impactedProcessingActivityIds", "evidenceIds", "reportIds", "discoveredAt"],
      properties: {
        severity: { $ref: "#/components/schemas/IncidentSeverity" },
        impactedProcessingActivityIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1 },
        evidenceIds: { type: "array", items: { type: "string", format: "uuid" } },
        reportIds: { type: "array", items: { type: "string", format: "uuid" } },
        discoveredAt: { type: "string", format: "date-time" }
      }
    },
    PrivacyIncident: {
      type: "object",
      required: [
        "id",
        "tenantId",
        "severity",
        "impactedProcessingActivityIds",
        "discoveredAt",
        "regulatorNotificationDueAt",
        "dataSubjectNotificationDueAt"
      ],
      properties: {
        ...privacyRecordMetadataProperties(),
        severity: { $ref: "#/components/schemas/IncidentSeverity" },
        impactedProcessingActivityIds: { type: "array", items: { type: "string", format: "uuid" } },
        evidenceIds: { type: "array", items: { type: "string", format: "uuid" } },
        reportIds: { type: "array", items: { type: "string", format: "uuid" } },
        discoveredAt: { type: "string", format: "date-time" },
        regulatorNotificationDueAt: { type: "string", format: "date-time" },
        dataSubjectNotificationDueAt: { type: "string", format: "date-time" },
        timeline: { type: "array", items: { $ref: "#/components/schemas/PrivacyIncidentTimelineEntry" } },
        actions: { type: "array", items: { $ref: "#/components/schemas/PrivacyIncidentAction" } }
      }
    },
    CreateRetentionScheduleRequest: {
      type: "object",
      required: [
        "dataCategory",
        "jurisdiction",
        "residency",
        "transferMechanism",
        "retentionMonths",
        "legalHold",
        "disposalEvidenceIds"
      ],
      properties: {
        dataCategory: { type: "string" },
        jurisdiction: { type: "string" },
        residency: { type: "string" },
        transferMechanism: { type: "string" },
        retentionMonths: { type: "integer", minimum: 1 },
        legalHold: { type: "boolean" },
        disposalEvidenceIds: { type: "array", items: { type: "string", format: "uuid" } }
      }
    },
    RetentionSchedule: {
      type: "object",
      required: ["id", "tenantId", "dataCategory", "jurisdiction", "residency", "transferMechanism", "retentionMonths", "legalHold"],
      properties: {
        ...privacyRecordMetadataProperties(),
        dataCategory: { type: "string" },
        jurisdiction: { type: "string" },
        residency: { type: "string" },
        transferMechanism: { type: "string" },
        retentionMonths: { type: "integer" },
        legalHold: { type: "boolean" },
        disposalEvidenceIds: { type: "array", items: { type: "string", format: "uuid" } }
      }
    },
    RetentionDecisionResponse: {
      type: "object",
      required: ["scheduleId", "decision"],
      properties: {
        scheduleId: { type: "string", format: "uuid" },
        decision: { $ref: "#/components/schemas/RetentionDecision" }
      }
    }
  };
}

function privacyRecordMetadataProperties() {
  return {
    id: { type: "string", format: "uuid" },
    tenantId: { type: "string", format: "uuid" },
    versionNumber: { type: "integer" },
    classification: { $ref: "#/components/schemas/PrivacyClassification" },
    createdBy: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" },
    updatedBy: { type: "string", format: "uuid" },
    updatedAt: { type: "string", format: "date-time" }
  };
}

function privacyAppendOnlyMetadataProperties() {
  return {
    id: { type: "string", format: "uuid" },
    tenantId: { type: "string", format: "uuid" },
    classification: { $ref: "#/components/schemas/PrivacyClassification" },
    createdBy: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" }
  };
}

function privacyGraphSchemas() {
  return {
    CreateSystemAssetRequest: {
      type: "object",
      required: ["name", "assetType", "ownerId"],
      properties: {
        workspaceId: { type: "string", format: "uuid" },
        name: { type: "string" },
        assetType: { type: "string" },
        ownerId: { type: "string", format: "uuid" },
        region: { type: "string" },
        criticality: { enum: ["low", "medium", "high", "critical"] }
      }
    },
    SystemAsset: {
      type: "object",
      required: ["id", "tenantId", "name", "assetType", "ownerId"],
      properties: {
        ...privacyRecordMetadataProperties(),
        workspaceId: { type: "string", format: "uuid" },
        name: { type: "string" },
        assetType: { type: "string" },
        ownerId: { type: "string", format: "uuid" },
        region: { type: "string" },
        criticality: { enum: ["low", "medium", "high", "critical"] }
      }
    },
    DataSensitivity: { enum: ["low", "moderate", "high", "special_category"] },
    CreateDataCategoryRequest: {
      type: "object",
      required: ["categoryKey", "name", "sensitivity"],
      properties: {
        categoryKey: { type: "string" },
        name: { type: "string" },
        sensitivity: { $ref: "#/components/schemas/DataSensitivity" }
      }
    },
    DataCategory: {
      type: "object",
      required: ["id", "tenantId", "categoryKey", "name", "sensitivity"],
      properties: {
        ...privacyRecordMetadataProperties(),
        categoryKey: { type: "string" },
        name: { type: "string" },
        sensitivity: { $ref: "#/components/schemas/DataSensitivity" }
      }
    },
    CreateDataSubjectCategoryRequest: {
      type: "object",
      required: ["subjectKey", "name"],
      properties: {
        subjectKey: { type: "string" },
        name: { type: "string" }
      }
    },
    DataSubjectCategory: {
      type: "object",
      required: ["id", "tenantId", "subjectKey", "name"],
      properties: {
        ...privacyRecordMetadataProperties(),
        subjectKey: { type: "string" },
        name: { type: "string" }
      }
    },
    CreateDataDiscoveryScanRequest: {
      type: "object",
      required: ["connectorId", "classifierVersion"],
      properties: {
        connectorId: { type: "string", format: "uuid" },
        classifierVersion: { type: "string" },
        status: { enum: ["running", "succeeded", "failed"] }
      }
    },
    DataDiscoveryScan: {
      type: "object",
      required: ["id", "tenantId", "systemId", "connectorId", "status", "classifierVersion", "idempotencyKey"],
      properties: {
        ...privacyRecordMetadataProperties(),
        systemId: { type: "string", format: "uuid" },
        connectorId: { type: "string", format: "uuid" },
        startedAt: { type: "string", format: "date-time" },
        finishedAt: { type: "string", format: "date-time" },
        status: { enum: ["running", "succeeded", "failed"] },
        classifierVersion: { type: "string" },
        idempotencyKey: { type: "string" }
      }
    },
    CreateDataDiscoveryFindingRequest: {
      type: "object",
      required: ["locatorHash", "dataCategoryId", "confidence"],
      properties: {
        locatorHash: { type: "string" },
        dataCategoryId: { type: "string", format: "uuid" },
        confidence: { type: "number" }
      }
    },
    DataDiscoveryFinding: {
      type: "object",
      required: ["id", "tenantId", "scanId", "locatorHash", "dataCategoryId", "confidence", "samplesProhibited", "reviewStatus"],
      properties: {
        ...privacyRecordMetadataProperties(),
        scanId: { type: "string", format: "uuid" },
        locatorHash: { type: "string" },
        dataCategoryId: { type: "string", format: "uuid" },
        confidence: { type: "number" },
        samplesProhibited: { type: "boolean" },
        reviewStatus: { enum: ["pending", "confirmed", "rejected"] }
      }
    },
    CreatePrivacyNoticeRequest: {
      type: "object",
      required: ["noticeKey", "audience", "ownerId"],
      properties: {
        noticeKey: { type: "string" },
        audience: { type: "string" },
        ownerId: { type: "string", format: "uuid" }
      }
    },
    PrivacyNotice: {
      type: "object",
      required: ["id", "tenantId", "noticeKey", "audience", "ownerId", "status"],
      properties: {
        ...privacyRecordMetadataProperties(),
        noticeKey: { type: "string" },
        audience: { type: "string" },
        ownerId: { type: "string", format: "uuid" },
        status: { enum: ["draft", "published", "retired"] }
      }
    },
    CreatePrivacyNoticeVersionRequest: {
      type: "object",
      required: ["contentUri", "sha256", "jurisdictions", "effectiveFrom"],
      properties: {
        contentUri: { type: "string" },
        sha256: { type: "string" },
        jurisdictions: { type: "array", items: { type: "string" } },
        effectiveFrom: { type: "string", format: "date-time" },
        effectiveTo: { type: "string", format: "date-time" }
      }
    },
    PrivacyNoticeVersion: {
      type: "object",
      required: ["id", "tenantId", "privacyNoticeId", "noticeVersionNo", "contentUri", "sha256", "jurisdictions", "effectiveFrom", "approvedBy"],
      properties: {
        ...privacyAppendOnlyMetadataProperties(),
        privacyNoticeId: { type: "string", format: "uuid" },
        noticeVersionNo: { type: "integer" },
        contentUri: { type: "string" },
        sha256: { type: "string" },
        jurisdictions: { type: "array", items: { type: "string" } },
        effectiveFrom: { type: "string", format: "date-time" },
        effectiveTo: { type: "string", format: "date-time" },
        approvedBy: { type: "string", format: "uuid" }
      }
    },
    CreateProcessingInventoryLinkRequest: {
      type: "object",
      required: ["inventoryRecordId", "role"],
      properties: {
        inventoryRecordId: { type: "string", format: "uuid" },
        role: { enum: ["source", "destination", "processor"] }
      }
    },
    ProcessingInventoryLink: {
      type: "object",
      required: ["id", "tenantId", "processingActivityId", "inventoryRecordId", "role"],
      properties: {
        ...privacyRecordMetadataProperties(),
        processingActivityId: { type: "string", format: "uuid" },
        inventoryRecordId: { type: "string", format: "uuid" },
        role: { enum: ["source", "destination", "processor"] }
      }
    },
    CreatePurposeRequest: {
      type: "object",
      required: ["purposeKey", "name"],
      properties: {
        purposeKey: { type: "string" },
        name: { type: "string" },
        description: { type: "string" }
      }
    },
    Purpose: {
      type: "object",
      required: ["id", "tenantId", "purposeKey", "name"],
      properties: {
        ...privacyRecordMetadataProperties(),
        purposeKey: { type: "string" },
        name: { type: "string" },
        description: { type: "string" }
      }
    },
    CreateLawfulBasisRequest: {
      type: "object",
      required: ["jurisdiction", "basisKey", "name"],
      properties: {
        jurisdiction: { type: "string" },
        basisKey: { type: "string" },
        name: { type: "string" },
        citation: { type: "string" }
      }
    },
    LawfulBasis: {
      type: "object",
      required: ["id", "tenantId", "jurisdiction", "basisKey", "name"],
      properties: {
        ...privacyRecordMetadataProperties(),
        jurisdiction: { type: "string" },
        basisKey: { type: "string" },
        name: { type: "string" },
        citation: { type: "string" }
      }
    },
    CreateProcessingPurposeAssignmentRequest: {
      type: "object",
      required: ["purposeId", "lawfulBasisId"],
      properties: {
        purposeId: { type: "string", format: "uuid" },
        lawfulBasisId: { type: "string", format: "uuid" }
      }
    },
    ProcessingPurposeAssignment: {
      type: "object",
      required: ["id", "tenantId", "processingActivityId", "purposeId", "lawfulBasisId", "effectiveFrom"],
      properties: {
        ...privacyRecordMetadataProperties(),
        processingActivityId: { type: "string", format: "uuid" },
        purposeId: { type: "string", format: "uuid" },
        lawfulBasisId: { type: "string", format: "uuid" },
        effectiveFrom: { type: "string", format: "date-time" },
        effectiveTo: { type: "string", format: "date-time" }
      }
    },
    CreateRecipientRequest: {
      type: "object",
      required: ["name", "recipientType", "country"],
      properties: {
        name: { type: "string" },
        recipientType: { enum: ["controller", "processor", "sub_processor"] },
        country: { type: "string" },
        vendorId: { type: "string", format: "uuid" }
      }
    },
    Recipient: {
      type: "object",
      required: ["id", "tenantId", "name", "recipientType", "country"],
      properties: {
        ...privacyRecordMetadataProperties(),
        name: { type: "string" },
        recipientType: { enum: ["controller", "processor", "sub_processor"] },
        country: { type: "string" },
        vendorId: { type: "string", format: "uuid" }
      }
    },
    CreateProcessingRecipientLinkRequest: {
      type: "object",
      required: ["recipientId", "purposeId"],
      properties: {
        recipientId: { type: "string", format: "uuid" },
        purposeId: { type: "string", format: "uuid" },
        dataCategoryIds: { type: "array", items: { type: "string", format: "uuid" } }
      }
    },
    ProcessingRecipientLink: {
      type: "object",
      required: ["id", "tenantId", "processingActivityId", "recipientId", "purposeId"],
      properties: {
        ...privacyRecordMetadataProperties(),
        processingActivityId: { type: "string", format: "uuid" },
        recipientId: { type: "string", format: "uuid" },
        purposeId: { type: "string", format: "uuid" },
        dataCategoryIds: { type: "array", items: { type: "string", format: "uuid" } }
      }
    },
    CreateTransferRequest: {
      type: "object",
      required: ["fromCountry", "toCountry", "mechanism"],
      properties: {
        fromCountry: { type: "string" },
        toCountry: { type: "string" },
        mechanism: { enum: ["sccs", "adequacy_decision", "bcr", "derogation"] },
        safeguards: { type: "string" }
      }
    },
    Transfer: {
      type: "object",
      required: ["id", "tenantId", "processingActivityId", "fromCountry", "toCountry", "mechanism", "status"],
      properties: {
        ...privacyRecordMetadataProperties(),
        processingActivityId: { type: "string", format: "uuid" },
        fromCountry: { type: "string" },
        toCountry: { type: "string" },
        mechanism: { enum: ["sccs", "adequacy_decision", "bcr", "derogation"] },
        safeguards: { type: "string" },
        status: { enum: ["active", "suspended", "terminated"] }
      }
    },
    CreateDpiaV2Request: {
      type: "object",
      required: ["triggerReason", "ownerId"],
      properties: {
        triggerReason: { type: "string" },
        ownerId: { type: "string", format: "uuid" }
      }
    },
    DpiaV2: {
      type: "object",
      required: ["id", "tenantId", "processingActivityId", "triggerReason", "status", "ownerId"],
      properties: {
        ...privacyRecordMetadataProperties(),
        processingActivityId: { type: "string", format: "uuid" },
        triggerReason: { type: "string" },
        status: { enum: ["draft", "in_review", "approved", "rejected"] },
        ownerId: { type: "string", format: "uuid" },
        approvedBy: { type: "string", format: "uuid" },
        approvedAt: { type: "string", format: "date-time" }
      }
    },
    CreateDpiaRiskRequest: {
      type: "object",
      required: ["description", "likelihood", "impact", "residualScore"],
      properties: {
        description: { type: "string" },
        likelihood: { enum: ["low", "medium", "high"] },
        impact: { enum: ["low", "medium", "high"] },
        treatment: { type: "string" },
        residualScore: { type: "integer" }
      }
    },
    DpiaRisk: {
      type: "object",
      required: ["id", "tenantId", "dpiaId", "description", "likelihood", "impact", "residualScore"],
      properties: {
        ...privacyRecordMetadataProperties(),
        dpiaId: { type: "string", format: "uuid" },
        description: { type: "string" },
        likelihood: { enum: ["low", "medium", "high"] },
        impact: { enum: ["low", "medium", "high"] },
        treatment: { type: "string" },
        residualScore: { type: "integer" }
      }
    },
    CreateRightsRequestTaskRequest: {
      type: "object",
      required: ["systemId", "ownerId", "taskType"],
      properties: {
        systemId: { type: "string", format: "uuid" },
        ownerId: { type: "string", format: "uuid" },
        taskType: { enum: ["search", "decision", "fulfillment"] }
      }
    },
    RightsRequestTask: {
      type: "object",
      required: ["id", "tenantId", "rightsRequestId", "systemId", "ownerId", "taskType", "status"],
      properties: {
        ...privacyRecordMetadataProperties(),
        rightsRequestId: { type: "string", format: "uuid" },
        systemId: { type: "string", format: "uuid" },
        ownerId: { type: "string", format: "uuid" },
        taskType: { enum: ["search", "decision", "fulfillment"] },
        status: { enum: ["pending", "in_progress", "completed", "blocked"] },
        resultRef: { type: "string" }
      }
    },
    CreateConsentPurposeVersionRequest: {
      type: "object",
      required: ["purposeId", "noticeVersionId", "channel", "region"],
      properties: {
        purposeId: { type: "string", format: "uuid" },
        noticeVersionId: { type: "string", format: "uuid" },
        channel: { type: "string" },
        region: { type: "string" }
      }
    },
    ConsentPurposeVersion: {
      type: "object",
      required: ["id", "tenantId", "purposeId", "noticeVersionId", "channel", "region", "activeFrom"],
      properties: {
        ...privacyRecordMetadataProperties(),
        purposeId: { type: "string", format: "uuid" },
        noticeVersionId: { type: "string", format: "uuid" },
        channel: { type: "string" },
        region: { type: "string" },
        activeFrom: { type: "string", format: "date-time" },
        activeTo: { type: "string", format: "date-time" }
      }
    },
    ConsentEventType: { enum: ["granted", "withdrawn", "updated"] },
    CreateConsentEventRequest: {
      type: "object",
      required: ["subjectToken", "consentPurposeId", "eventType", "source", "proofHash"],
      properties: {
        subjectToken: { type: "string" },
        consentPurposeId: { type: "string", format: "uuid" },
        eventType: { $ref: "#/components/schemas/ConsentEventType" },
        source: { type: "string" },
        proofHash: { type: "string" }
      }
    },
    ConsentEvent: {
      type: "object",
      required: ["id", "tenantId", "subjectToken", "consentPurposeId", "eventType", "occurredAt", "source", "proofHash", "idempotencyKey", "recordedBy"],
      properties: {
        ...privacyAppendOnlyMetadataProperties(),
        subjectToken: { type: "string" },
        consentPurposeId: { type: "string", format: "uuid" },
        eventType: { $ref: "#/components/schemas/ConsentEventType" },
        occurredAt: { type: "string", format: "date-time" },
        source: { type: "string" },
        proofHash: { type: "string" },
        idempotencyKey: { type: "string" },
        recordedBy: { type: "string", format: "uuid" }
      }
    },
    CreateIncidentAssessmentRequest: {
      type: "object",
      required: ["jurisdiction", "reportable", "rationale"],
      properties: {
        jurisdiction: { type: "string" },
        reportable: { type: "boolean" },
        rationale: { type: "string" }
      }
    },
    IncidentAssessment: {
      type: "object",
      required: ["id", "tenantId", "incidentId", "jurisdiction", "reportable", "rationale", "assessorId", "decidedAt", "assessmentVersionNo"],
      properties: {
        ...privacyRecordMetadataProperties(),
        incidentId: { type: "string", format: "uuid" },
        jurisdiction: { type: "string" },
        reportable: { type: "boolean" },
        rationale: { type: "string" },
        assessorId: { type: "string", format: "uuid" },
        decidedAt: { type: "string", format: "date-time" },
        assessmentVersionNo: { type: "integer" }
      }
    },
    CreateIncidentNotificationRequest: {
      type: "object",
      required: ["recipientType", "jurisdiction", "dueAt"],
      properties: {
        recipientType: { enum: ["regulator", "data_subject", "partner"] },
        jurisdiction: { type: "string" },
        dueAt: { type: "string", format: "date-time" }
      }
    },
    IncidentNotification: {
      type: "object",
      required: ["id", "tenantId", "incidentId", "recipientType", "jurisdiction", "dueAt"],
      properties: {
        ...privacyRecordMetadataProperties(),
        incidentId: { type: "string", format: "uuid" },
        recipientType: { enum: ["regulator", "data_subject", "partner"] },
        jurisdiction: { type: "string" },
        dueAt: { type: "string", format: "date-time" },
        sentAt: { type: "string", format: "date-time" },
        artifactId: { type: "string", format: "uuid" }
      }
    },
    CreateRetentionRuleRequest: {
      type: "object",
      required: ["dataCategoryId", "jurisdiction", "retentionTrigger", "durationDays", "disposition"],
      properties: {
        dataCategoryId: { type: "string", format: "uuid" },
        jurisdiction: { type: "string" },
        retentionTrigger: { type: "string" },
        durationDays: { type: "integer" },
        disposition: { enum: ["delete", "anonymize", "archive"] }
      }
    },
    RetentionRule: {
      type: "object",
      required: ["id", "tenantId", "dataCategoryId", "jurisdiction", "retentionTrigger", "durationDays", "disposition"],
      properties: {
        ...privacyRecordMetadataProperties(),
        dataCategoryId: { type: "string", format: "uuid" },
        jurisdiction: { type: "string" },
        retentionTrigger: { type: "string" },
        durationDays: { type: "integer" },
        disposition: { enum: ["delete", "anonymize", "archive"] }
      }
    },
    RetentionTargetType: { enum: ["data_inventory_record", "evidence_object", "evidence_version", "rights_request", "consent_event"] },
    CreateRetentionAssignmentRequest: {
      type: "object",
      required: ["retentionRuleId", "targetType", "targetId"],
      properties: {
        retentionRuleId: { type: "string", format: "uuid" },
        targetType: { $ref: "#/components/schemas/RetentionTargetType" },
        targetId: { type: "string", format: "uuid" }
      }
    },
    RetentionAssignment: {
      type: "object",
      required: ["id", "tenantId", "retentionRuleId", "targetType", "targetId", "effectiveFrom"],
      properties: {
        ...privacyRecordMetadataProperties(),
        retentionRuleId: { type: "string", format: "uuid" },
        targetType: { $ref: "#/components/schemas/RetentionTargetType" },
        targetId: { type: "string", format: "uuid" },
        effectiveFrom: { type: "string", format: "date-time" },
        effectiveTo: { type: "string", format: "date-time" }
      }
    },
    CreateLegalHoldRequest: {
      type: "object",
      required: ["holdKey", "reason"],
      properties: {
        holdKey: { type: "string" },
        reason: { type: "string" }
      }
    },
    LegalHold: {
      type: "object",
      required: ["id", "tenantId", "holdKey", "reason", "issuedBy", "issuedAt", "scopeJson"],
      properties: {
        ...privacyRecordMetadataProperties(),
        holdKey: { type: "string" },
        reason: { type: "string" },
        issuedBy: { type: "string", format: "uuid" },
        issuedAt: { type: "string", format: "date-time" },
        releasedAt: { type: "string", format: "date-time" },
        scopeJson: { type: "object", additionalProperties: true }
      }
    },
    CreateLegalHoldItemRequest: {
      type: "object",
      required: ["targetType", "targetId"],
      properties: {
        targetType: { $ref: "#/components/schemas/RetentionTargetType" },
        targetId: { type: "string", format: "uuid" }
      }
    },
    LegalHoldItem: {
      type: "object",
      required: ["id", "tenantId", "legalHoldId", "targetType", "targetId"],
      properties: {
        ...privacyRecordMetadataProperties(),
        legalHoldId: { type: "string", format: "uuid" },
        targetType: { $ref: "#/components/schemas/RetentionTargetType" },
        targetId: { type: "string", format: "uuid" }
      }
    },
    CreateDeletionJobRequest: {
      type: "object",
      required: ["deletionTrigger"],
      properties: {
        deletionTrigger: { type: "string" }
      }
    },
    DeletionJob: {
      type: "object",
      required: ["id", "tenantId", "deletionTrigger", "requestedBy", "status"],
      properties: {
        ...privacyRecordMetadataProperties(),
        deletionTrigger: { type: "string" },
        requestedBy: { type: "string", format: "uuid" },
        status: { enum: ["requested", "running", "completed", "failed"] },
        startedAt: { type: "string", format: "date-time" },
        finishedAt: { type: "string", format: "date-time" }
      }
    },
    DeletionItemDisposition: { enum: ["deleted", "anonymized", "blocked_by_hold", "not_found"] },
    CreateDeletionItemRequest: {
      type: "object",
      required: ["targetType", "targetId"],
      properties: {
        targetType: { $ref: "#/components/schemas/RetentionTargetType" },
        targetId: { type: "string", format: "uuid" },
        requestedDisposition: { $ref: "#/components/schemas/DeletionItemDisposition" },
        keyDestroyed: { type: "boolean" },
        proofHash: { type: "string" }
      }
    },
    DeletionItem: {
      type: "object",
      required: ["id", "tenantId", "deletionJobId", "targetType", "targetId", "disposition", "keyDestroyed"],
      properties: {
        ...privacyRecordMetadataProperties(),
        deletionJobId: { type: "string", format: "uuid" },
        targetType: { $ref: "#/components/schemas/RetentionTargetType" },
        targetId: { type: "string", format: "uuid" },
        disposition: { $ref: "#/components/schemas/DeletionItemDisposition" },
        keyDestroyed: { type: "boolean" },
        proofHash: { type: "string" }
      }
    }
  };
}

function enterpriseGrcPaths() {
  return {
    "/v1/enterprise-grc/policies": {
      post: enterpriseMutation(
        "draftEnterprisePolicy",
        "Draft a policy version.",
        "DraftEnterprisePolicyRequest",
        "PolicyVersion",
        "Policy version drafted."
      ),
      get: enterpriseList("listEnterprisePolicies", "List policy versions.", "PolicyVersion")
    },
    "/v1/enterprise-grc/policies/{policyId}": {
      get: enterpriseRead(
        "getEnterprisePolicy",
        "Fetch a policy version.",
        "PolicyVersion",
        [pathParameter("policyId", "uuid")]
      )
    },
    "/v1/enterprise-grc/policies/{policyId}/publish": {
      post: enterpriseMutation(
        "publishEnterprisePolicy",
        "Publish a policy version with approval evidence.",
        "PublishEnterprisePolicyRequest",
        "PolicyVersion",
        "Policy version published.",
        [pathParameter("policyId", "uuid")]
      )
    },
    "/v1/enterprise-grc/policies/{policyId}/exceptions": {
      post: enterpriseMutation(
        "addEnterprisePolicyException",
        "Add a policy exception.",
        "AddEnterprisePolicyExceptionRequest",
        "PolicyVersion",
        "Policy exception added.",
        [pathParameter("policyId", "uuid")]
      )
    },
    "/v1/enterprise-grc/access-reviews": {
      post: enterpriseMutation(
        "createEnterpriseAccessReview",
        "Create an access review.",
        "CreateEnterpriseAccessReviewRequest",
        "AccessReview",
        "Access review created."
      ),
      get: enterpriseList("listEnterpriseAccessReviews", "List access reviews.", "AccessReview")
    },
    "/v1/enterprise-grc/access-reviews/{reviewId}": {
      get: enterpriseRead(
        "getEnterpriseAccessReview",
        "Fetch an access review.",
        "AccessReview",
        [pathParameter("reviewId", "uuid")]
      )
    },
    "/v1/enterprise-grc/vendors": {
      post: enterpriseMutation(
        "createEnterpriseVendor",
        "Create a vendor record.",
        "CreateEnterpriseVendorRequest",
        "VendorRecord",
        "Vendor record created."
      ),
      get: enterpriseList("listEnterpriseVendors", "List vendor records.", "VendorRecord")
    },
    "/v1/enterprise-grc/vendors/{vendorId}": {
      get: enterpriseRead(
        "getEnterpriseVendor",
        "Fetch a vendor record.",
        "VendorRecord",
        [pathParameter("vendorId", "uuid")]
      )
    },
    "/v1/enterprise-grc/audit-engagements": {
      post: enterpriseMutation(
        "createEnterpriseAuditEngagement",
        "Create an audit engagement.",
        "CreateEnterpriseAuditEngagementRequest",
        "AuditEngagement",
        "Audit engagement created."
      ),
      get: enterpriseList("listEnterpriseAuditEngagements", "List audit engagements.", "AuditEngagement")
    },
    "/v1/enterprise-grc/audit-engagements/{engagementId}": {
      get: enterpriseRead(
        "getEnterpriseAuditEngagement",
        "Fetch an audit engagement.",
        "AuditEngagement",
        [pathParameter("engagementId", "uuid")]
      )
    },
    "/v1/enterprise-grc/trust-center-artifacts": {
      post: enterpriseMutation(
        "publishEnterpriseTrustArtifact",
        "Publish a trust center artifact.",
        "PublishEnterpriseTrustArtifactRequest",
        "TrustCenterArtifact",
        "Trust center artifact published."
      ),
      get: enterpriseList("listEnterpriseTrustArtifacts", "List trust center artifacts.", "TrustCenterArtifact")
    },
    "/v1/enterprise-grc/trust-center-artifacts/{artifactId}": {
      get: enterpriseRead(
        "getEnterpriseTrustArtifact",
        "Fetch a trust center artifact.",
        "TrustCenterArtifact",
        [pathParameter("artifactId", "uuid")]
      )
    },
    "/v1/enterprise-grc/trust-center-artifacts/{artifactId}/downloads": {
      post: enterpriseMutation(
        "recordEnterpriseTrustArtifactDownload",
        "Record a trust center artifact download.",
        "RecordEnterpriseTrustArtifactDownloadRequest",
        "TrustCenterArtifact",
        "Trust center artifact download recorded.",
        [pathParameter("artifactId", "uuid")]
      )
    },
    "/v1/enterprise-grc/workspaces": {
      post: enterpriseMutation(
        "createEnterpriseWorkspace",
        "Create a business-unit GRC workspace.",
        "CreateEnterpriseWorkspaceRequest",
        "GrcWorkspace",
        "GRC workspace created."
      ),
      get: enterpriseList("listEnterpriseWorkspaces", "List business-unit GRC workspaces.", "GrcWorkspace")
    },
    "/v1/enterprise-grc/workspaces/{workspaceId}": {
      get: enterpriseRead(
        "getEnterpriseWorkspace",
        "Fetch a business-unit GRC workspace.",
        "GrcWorkspace",
        [pathParameter("workspaceId", "uuid")]
      )
    },
    "/v1/enterprise-grc/custom-object-definitions": {
      post: enterpriseMutation(
        "createEnterpriseCustomObjectDefinition",
        "Create an upgrade-safe custom object definition.",
        "CreateEnterpriseCustomObjectDefinitionRequest",
        "CustomObjectDefinition",
        "Custom object definition created."
      ),
      get: enterpriseList("listEnterpriseCustomObjectDefinitions", "List custom object definitions.", "CustomObjectDefinition")
    },
    "/v1/enterprise-grc/custom-object-definitions/{definitionId}": {
      get: enterpriseRead(
        "getEnterpriseCustomObjectDefinition",
        "Fetch a custom object definition.",
        "CustomObjectDefinition",
        [pathParameter("definitionId", "uuid")]
      )
    },
    // G-13 (custom platform, migration 0025_g13_custom_platform.sql).
    "/v1/enterprise-grc/custom-object-definitions/{definitionId}/status": {
      post: {
        operationId: "updateEnterpriseCustomObjectStatus",
        tags: ["EnterpriseGRC"],
        summary: "Update a custom object definition's lifecycle status and/or validation schema.",
        parameters: [pathParameter("definitionId", "uuid"), ...requestContextHeaders()],
        requestBody: jsonRequest("UpdateEnterpriseCustomObjectStatusRequest"),
        responses: {
          "201": jsonResponse("Custom object definition updated.", "CustomObjectDefinition"),
          "400": { $ref: "#/components/responses/Problem" },
          "401": { $ref: "#/components/responses/Problem" },
          "403": { $ref: "#/components/responses/Problem" },
          "404": { $ref: "#/components/responses/Problem" }
        }
      }
    },
    "/v1/enterprise-grc/custom-object-definitions/{definitionId}/fields": {
      post: enterpriseMutation(
        "createEnterpriseCustomFieldDefinition",
        "Add a normalized field definition to a custom object definition.",
        "CreateEnterpriseCustomFieldDefinitionRequest",
        "CustomFieldDefinition",
        "Custom field definition created.",
        [pathParameter("definitionId", "uuid")]
      ),
      get: enterpriseList("listEnterpriseCustomFieldDefinitions", "List a custom object definition's field definitions.", "CustomFieldDefinition", [
        pathParameter("definitionId", "uuid")
      ])
    },
    "/v1/enterprise-grc/custom-object-definitions/{definitionId}/records": {
      post: enterpriseMutation(
        "createEnterpriseCustomRecord",
        "Create a record of a custom object definition.",
        "CreateEnterpriseCustomRecordRequest",
        "CustomRecord",
        "Custom record created.",
        [pathParameter("definitionId", "uuid")]
      ),
      get: enterpriseList("listEnterpriseCustomRecords", "List a custom object definition's records.", "CustomRecord", [
        pathParameter("definitionId", "uuid")
      ])
    },
    "/v1/enterprise-grc/custom-records/{recordId}": {
      get: enterpriseRead("getEnterpriseCustomRecord", "Fetch a custom record.", "CustomRecord", [pathParameter("recordId", "uuid")])
    },
    "/v1/enterprise-grc/custom-records/{recordId}/values": {
      post: enterpriseMutation(
        "createEnterpriseCustomValue",
        "Set a typed extension value on a custom record, validated against its field definition.",
        "CreateEnterpriseCustomValueRequest",
        "CustomValue",
        "Custom value created.",
        [pathParameter("recordId", "uuid")]
      ),
      get: enterpriseList("listEnterpriseCustomValues", "List a custom record's typed extension values.", "CustomValue", [
        pathParameter("recordId", "uuid")
      ])
    },
    "/v1/enterprise-grc/policy-definitions": {
      post: enterpriseMutation(
        "createEnterprisePolicyRecord",
        "Create the stable policy identity a policy_version belongs under.",
        "CreateEnterprisePolicyRecordRequest",
        "PolicyRecord",
        "Policy record created."
      ),
      get: enterpriseList("listEnterprisePolicyRecords", "List policy identities.", "PolicyRecord")
    },
    "/v1/enterprise-grc/policy-definitions/{policyRecordId}": {
      get: enterpriseRead("getEnterprisePolicyRecord", "Fetch a policy identity.", "PolicyRecord", [
        pathParameter("policyRecordId", "uuid")
      ])
    },
    "/v1/enterprise-grc/policies/{policyId}/control-links": {
      post: enterpriseMutation(
        "createEnterprisePolicyControlLink",
        "Link a policy version to a control it covers.",
        "CreateEnterprisePolicyControlLinkRequest",
        "PolicyControlLink",
        "Policy control link created.",
        [pathParameter("policyId", "uuid")]
      ),
      get: enterpriseList("listEnterprisePolicyControlLinks", "List a policy version's control links.", "PolicyControlLink", [
        pathParameter("policyId", "uuid")
      ])
    },
    "/v1/enterprise-grc/policies/{policyId}/attestations": {
      post: enterpriseMutation(
        "createEnterprisePolicyAttestation",
        "Record an employee attestation for a policy version.",
        "CreateEnterprisePolicyAttestationRequest",
        "PolicyAttestation",
        "Policy attestation recorded.",
        [pathParameter("policyId", "uuid")]
      ),
      get: enterpriseList("listEnterprisePolicyAttestations", "List a policy version's attestations.", "PolicyAttestation", [
        pathParameter("policyId", "uuid")
      ])
    },
    "/v1/enterprise-grc/access-reviews/{reviewId}/items": {
      post: enterpriseMutation(
        "createEnterpriseAccessReviewItem",
        "Add a reviewable entitlement to an access review campaign.",
        "CreateEnterpriseAccessReviewItemRequest",
        "AccessReviewItem",
        "Access review item created.",
        [pathParameter("reviewId", "uuid")]
      ),
      get: enterpriseList("listEnterpriseAccessReviewItems", "List an access review's reviewable entitlements.", "AccessReviewItem", [
        pathParameter("reviewId", "uuid")
      ])
    },
    "/v1/enterprise-grc/access-reviews/{reviewId}/items/{itemId}/decisions": {
      post: enterpriseMutation(
        "createEnterpriseAccessReviewCertification",
        "Record a certification decision for a reviewable entitlement.",
        "CreateEnterpriseAccessReviewCertificationRequest",
        "AccessReviewCertificationDecision",
        "Access review decision recorded.",
        [pathParameter("reviewId", "uuid"), pathParameter("itemId", "uuid")]
      ),
      get: enterpriseList(
        "listEnterpriseAccessReviewCertifications",
        "List an entitlement's certification decisions.",
        "AccessReviewCertificationDecision",
        [pathParameter("reviewId", "uuid"), pathParameter("itemId", "uuid")]
      )
    },
    "/v1/enterprise-grc/vendors/{vendorId}/assessments": {
      post: enterpriseMutation(
        "createEnterpriseVendorAssessment",
        "Create a vendor due-diligence/renewal assessment.",
        "CreateEnterpriseVendorAssessmentRequest",
        "VendorAssessment",
        "Vendor assessment created.",
        [pathParameter("vendorId", "uuid")]
      ),
      get: enterpriseList("listEnterpriseVendorAssessments", "List a vendor's assessments.", "VendorAssessment", [
        pathParameter("vendorId", "uuid")
      ])
    },
    "/v1/enterprise-grc/vendors/{vendorId}/assessments/{assessmentId}/findings": {
      post: enterpriseMutation(
        "createEnterpriseVendorFinding",
        "Record a deficiency found during a vendor assessment.",
        "CreateEnterpriseVendorFindingRequest",
        "VendorFinding",
        "Vendor finding created.",
        [pathParameter("vendorId", "uuid"), pathParameter("assessmentId", "uuid")]
      ),
      get: enterpriseList("listEnterpriseVendorFindings", "List a vendor assessment's findings.", "VendorFinding", [
        pathParameter("vendorId", "uuid"),
        pathParameter("assessmentId", "uuid")
      ])
    },
    "/v1/enterprise-grc/audit-engagements/{engagementId}/requests": {
      post: enterpriseMutation(
        "createEnterpriseAuditRequest",
        "Create a PBC (provided-by-client) request for an audit engagement.",
        "CreateEnterpriseAuditRequestRequest",
        "AuditRequest",
        "Audit request created.",
        [pathParameter("engagementId", "uuid")]
      ),
      get: enterpriseList("listEnterpriseAuditRequests", "List an audit engagement's PBC requests.", "AuditRequest", [
        pathParameter("engagementId", "uuid")
      ])
    },
    "/v1/enterprise-grc/audit-engagements/{engagementId}/tests": {
      post: enterpriseMutation(
        "createEnterpriseAuditTest",
        "Record an audit test workpaper for an audit engagement.",
        "CreateEnterpriseAuditTestRequest",
        "AuditTest",
        "Audit test created.",
        [pathParameter("engagementId", "uuid")]
      ),
      get: enterpriseList("listEnterpriseAuditTests", "List an audit engagement's test workpapers.", "AuditTest", [
        pathParameter("engagementId", "uuid")
      ])
    }
  };
}

function enterpriseMutation(operationId, summary, requestSchemaName, responseSchemaName, description, extraParameters = []) {
  return {
    operationId,
    tags: ["EnterpriseGRC"],
    summary,
    parameters: [...extraParameters, idempotencyHeader(), ...requestContextHeaders()],
    requestBody: jsonRequest(requestSchemaName),
    responses: {
      "201": jsonResponse(description, responseSchemaName),
      "400": { $ref: "#/components/responses/Problem" },
      "401": { $ref: "#/components/responses/Problem" },
      "403": { $ref: "#/components/responses/Problem" },
      "404": { $ref: "#/components/responses/Problem" }
    }
  };
}

function enterpriseList(operationId, summary, schemaName, extraParameters = []) {
  return {
    operationId,
    tags: ["EnterpriseGRC"],
    summary,
    parameters: [...extraParameters, ...paginationParameters(), ...requestContextHeaders()],
    responses: {
      "200": jsonArrayResponse(summary, schemaName),
      "401": { $ref: "#/components/responses/Problem" },
      "403": { $ref: "#/components/responses/Problem" }
    }
  };
}

function enterpriseRead(operationId, summary, schemaName, extraParameters = []) {
  return {
    operationId,
    tags: ["EnterpriseGRC"],
    summary,
    parameters: [...extraParameters, ...requestContextHeaders()],
    responses: {
      "200": jsonResponse(summary, schemaName),
      "401": { $ref: "#/components/responses/Problem" },
      "403": { $ref: "#/components/responses/Problem" },
      "404": { $ref: "#/components/responses/Problem" }
    }
  };
}

function enterpriseGrcSchemas() {
  return {
    PolicyStatus: {
      enum: ["draft", "in_review", "approved", "published", "retired"]
    },
    VendorTier: {
      enum: ["low", "medium", "high", "critical"]
    },
    AuditStatus: {
      enum: ["planned", "fieldwork", "management_response", "closed"]
    },
    TrustArtifactVisibility: {
      enum: ["public", "private"]
    },
    PolicyException: {
      type: "object",
      required: ["ownerId", "reason", "expiresAt"],
      properties: {
        ownerId: { type: "string", format: "uuid" },
        reason: { type: "string" },
        expiresAt: { type: "string", format: "date-time" }
      }
    },
    AccessReviewDecision: {
      type: "object",
      required: ["subjectId", "resourceId", "decision", "evidenceId"],
      properties: {
        subjectId: { type: "string" },
        resourceId: { type: "string" },
        decision: { enum: ["approved", "revoked"] },
        evidenceId: { type: "string" }
      }
    },
    ManagementResponse: {
      type: "object",
      required: ["ownerId", "response", "dueAt"],
      properties: {
        ownerId: { type: "string", format: "uuid" },
        response: { type: "string" },
        dueAt: { type: "string", format: "date-time" }
      }
    },
    TrustDownloadEvent: {
      type: "object",
      required: ["actorId", "downloadedAt"],
      properties: {
        actorId: { type: "string", format: "uuid" },
        downloadedAt: { type: "string", format: "date-time" }
      }
    },
    CustomObjectField: {
      type: "object",
      required: ["key", "type", "required"],
      properties: {
        key: { type: "string" },
        type: { enum: ["text", "number", "date", "boolean"] },
        required: { type: "boolean" }
      }
    },
    DraftEnterprisePolicyRequest: {
      type: "object",
      required: ["templateKey", "title", "version", "content"],
      properties: {
        templateKey: { type: "string" },
        title: { type: "string" },
        version: { type: "string" },
        content: { type: "string" }
      }
    },
    PublishEnterprisePolicyRequest: {
      type: "object",
      required: ["approverId", "attestationEvidenceIds"],
      properties: {
        approverId: { type: "string", format: "uuid" },
        attestationEvidenceIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1 },
        publishedAt: { type: "string", format: "date-time" }
      }
    },
    AddEnterprisePolicyExceptionRequest: {
      type: "object",
      required: ["ownerId", "reason", "expiresAt"],
      properties: {
        ownerId: { type: "string", format: "uuid" },
        reason: { type: "string" },
        expiresAt: { type: "string", format: "date-time" }
      }
    },
    PolicyVersion: {
      type: "object",
      required: ["id", "tenantId", "templateKey", "title", "version", "status", "contentHash"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        templateKey: { type: "string" },
        title: { type: "string" },
        version: { type: "string" },
        status: { $ref: "#/components/schemas/PolicyStatus" },
        approverId: { type: "string", format: "uuid" },
        publishedAt: { type: "string", format: "date-time" },
        attestationEvidenceIds: { type: "array", items: { type: "string", format: "uuid" } },
        exceptions: { type: "array", items: { $ref: "#/components/schemas/PolicyException" } },
        contentHash: { type: "string" }
      }
    },
    CreateEnterpriseAccessReviewRequest: {
      type: "object",
      required: ["populationSource", "certifierId", "decisions"],
      properties: {
        populationSource: { type: "string" },
        certifierId: { type: "string", format: "uuid" },
        decisions: { type: "array", items: { $ref: "#/components/schemas/AccessReviewDecision" }, minItems: 1 }
      }
    },
    AccessReview: {
      type: "object",
      required: ["id", "tenantId", "populationSource", "certifierId", "decisions", "remediationTaskIds"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        populationSource: { type: "string" },
        certifierId: { type: "string", format: "uuid" },
        decisions: { type: "array", items: { $ref: "#/components/schemas/AccessReviewDecision" } },
        remediationTaskIds: { type: "array", items: { type: "string" } }
      }
    },
    CreateEnterpriseVendorRequest: {
      type: "object",
      required: [
        "name",
        "tier",
        "systems",
        "contractIds",
        "controlIds",
        "incidentIds",
        "questionnaireIds",
        "monitoringFindings",
        "renewalAt"
      ],
      properties: {
        name: { type: "string" },
        tier: { $ref: "#/components/schemas/VendorTier" },
        systems: { type: "array", items: { type: "string" }, minItems: 1 },
        contractIds: { type: "array", items: { type: "string" }, minItems: 1 },
        controlIds: { type: "array", items: { type: "string" } },
        incidentIds: { type: "array", items: { type: "string" } },
        questionnaireIds: { type: "array", items: { type: "string" } },
        monitoringFindings: { type: "array", items: { type: "string" } },
        renewalAt: { type: "string", format: "date-time" }
      }
    },
    VendorRecord: {
      type: "object",
      required: ["id", "tenantId", "name", "tier", "systems", "contractIds", "renewalAt"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        name: { type: "string" },
        tier: { $ref: "#/components/schemas/VendorTier" },
        systems: { type: "array", items: { type: "string" } },
        contractIds: { type: "array", items: { type: "string" } },
        controlIds: { type: "array", items: { type: "string" } },
        incidentIds: { type: "array", items: { type: "string" } },
        questionnaireIds: { type: "array", items: { type: "string" } },
        monitoringFindings: { type: "array", items: { type: "string" } },
        renewalAt: { type: "string", format: "date-time" }
      }
    },
    CreateEnterpriseAuditEngagementRequest: {
      type: "object",
      required: ["name", "status", "requestListIds", "evidenceIds", "findingIds", "managementResponses"],
      properties: {
        name: { type: "string" },
        status: { $ref: "#/components/schemas/AuditStatus" },
        requestListIds: { type: "array", items: { type: "string" }, minItems: 1 },
        evidenceIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1 },
        findingIds: { type: "array", items: { type: "string" } },
        managementResponses: { type: "array", items: { $ref: "#/components/schemas/ManagementResponse" } }
      }
    },
    AuditEngagement: {
      type: "object",
      required: ["id", "tenantId", "name", "status", "requestListIds", "evidenceIds"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        name: { type: "string" },
        status: { $ref: "#/components/schemas/AuditStatus" },
        requestListIds: { type: "array", items: { type: "string" } },
        evidenceIds: { type: "array", items: { type: "string", format: "uuid" } },
        findingIds: { type: "array", items: { type: "string" } },
        managementResponses: { type: "array", items: { $ref: "#/components/schemas/ManagementResponse" } }
      }
    },
    PublishEnterpriseTrustArtifactRequest: {
      type: "object",
      required: ["title", "version", "approved", "visibility", "artifactEvidenceId", "ndaRequired"],
      properties: {
        title: { type: "string" },
        version: { type: "string" },
        approved: { type: "boolean" },
        visibility: { $ref: "#/components/schemas/TrustArtifactVisibility" },
        artifactEvidenceId: { type: "string", format: "uuid" },
        ndaRequired: { type: "boolean" },
        crmAccountId: { type: "string" }
      }
    },
    RecordEnterpriseTrustArtifactDownloadRequest: {
      type: "object",
      properties: {
        downloadedAt: { type: "string", format: "date-time" }
      }
    },
    TrustCenterArtifact: {
      type: "object",
      required: ["id", "tenantId", "title", "version", "approved", "visibility", "artifactEvidenceId", "ndaRequired"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        title: { type: "string" },
        version: { type: "string" },
        approved: { type: "boolean" },
        visibility: { $ref: "#/components/schemas/TrustArtifactVisibility" },
        artifactEvidenceId: { type: "string", format: "uuid" },
        ndaRequired: { type: "boolean" },
        crmAccountId: { type: "string" },
        downloadEvents: { type: "array", items: { $ref: "#/components/schemas/TrustDownloadEvent" } }
      }
    },
    CreateEnterpriseWorkspaceRequest: {
      type: "object",
      required: ["businessUnit", "inheritedControlIds", "delegatedAdminIds"],
      properties: {
        businessUnit: { type: "string" },
        parentWorkspaceId: { type: "string", format: "uuid" },
        inheritedControlIds: { type: "array", items: { type: "string" }, minItems: 1 },
        delegatedAdminIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1 }
      }
    },
    GrcWorkspace: {
      type: "object",
      required: ["id", "tenantId", "businessUnit", "inheritedControlIds", "delegatedAdminIds"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        businessUnit: { type: "string" },
        parentWorkspaceId: { type: "string", format: "uuid" },
        inheritedControlIds: { type: "array", items: { type: "string" } },
        delegatedAdminIds: { type: "array", items: { type: "string", format: "uuid" } }
      }
    },
    CreateEnterpriseCustomObjectDefinitionRequest: {
      type: "object",
      required: ["objectKey", "fields", "workflowStates", "permissionRoleIds", "upgradeSafe", "connectorSdkEnabled"],
      properties: {
        objectKey: { type: "string" },
        fields: { type: "array", items: { $ref: "#/components/schemas/CustomObjectField" }, minItems: 1 },
        workflowStates: { type: "array", items: { type: "string" }, minItems: 1 },
        permissionRoleIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1 },
        upgradeSafe: { type: "boolean" },
        connectorSdkEnabled: { type: "boolean" }
      }
    },
    // G-13 (custom platform, migration 0025_g13_custom_platform.sql): the normalized field/record/
    // value tables underneath `custom_object_definitions`. Declared before CustomObjectDefinition
    // (not just topically grouped after it) because the frontend codegen emits one `const` per
    // schema in this object's key order and evaluates them top-to-bottom — a schema referencing
    // another via $ref must have that schema declared first, or the generated client fails to
    // build with a "used before declaration" error.
    CustomObjectDefinitionStatus: { type: "string", enum: ["draft", "active", "deprecated"] },
    CustomObjectDefinition: {
      type: "object",
      required: ["id", "tenantId", "objectKey", "fields", "workflowStates", "permissionRoleIds", "upgradeSafe", "connectorSdkEnabled"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        objectKey: { type: "string" },
        fields: { type: "array", items: { $ref: "#/components/schemas/CustomObjectField" } },
        workflowStates: { type: "array", items: { type: "string" } },
        permissionRoleIds: { type: "array", items: { type: "string", format: "uuid" } },
        upgradeSafe: { type: "boolean" },
        connectorSdkEnabled: { type: "boolean" },
        status: { $ref: "#/components/schemas/CustomObjectDefinitionStatus" },
        validationSchema: { type: "object", additionalProperties: true, nullable: true }
      }
    },
    UpdateEnterpriseCustomObjectStatusRequest: {
      type: "object",
      required: ["status"],
      properties: {
        status: { $ref: "#/components/schemas/CustomObjectDefinitionStatus" },
        validationSchema: { type: "object", additionalProperties: true }
      }
    },
    CustomFieldDataType: { type: "string", enum: ["text", "number", "boolean", "date", "datetime", "uuid", "json", "enum"] },
    CreateEnterpriseCustomFieldDefinitionRequest: {
      type: "object",
      required: ["fieldKey", "dataType", "required"],
      properties: {
        fieldKey: { type: "string" },
        dataType: { $ref: "#/components/schemas/CustomFieldDataType" },
        required: { type: "boolean" },
        validationJson: { type: "object", additionalProperties: true }
      }
    },
    CustomFieldDefinition: {
      type: "object",
      required: ["id", "tenantId", "objectDefinitionId", "fieldKey", "dataType", "required", "validationJson"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        objectDefinitionId: { type: "string", format: "uuid" },
        fieldKey: { type: "string" },
        dataType: { $ref: "#/components/schemas/CustomFieldDataType" },
        required: { type: "boolean" },
        validationJson: { type: "object", additionalProperties: true }
      }
    },
    CustomRecordStatus: { type: "string", enum: ["active", "archived"] },
    CreateEnterpriseCustomRecordRequest: {
      type: "object",
      required: ["recordKey"],
      properties: {
        recordKey: { type: "string" }
      }
    },
    CustomRecord: {
      type: "object",
      required: ["id", "tenantId", "objectDefinitionId", "recordKey", "status"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        objectDefinitionId: { type: "string", format: "uuid" },
        recordKey: { type: "string" },
        status: { $ref: "#/components/schemas/CustomRecordStatus" }
      }
    },
    CreateEnterpriseCustomValueRequest: {
      type: "object",
      required: ["fieldDefinitionId"],
      properties: {
        fieldDefinitionId: { type: "string", format: "uuid" },
        valueJson: {},
        searchText: { type: "string" }
      }
    },
    CustomValue: {
      type: "object",
      required: ["id", "tenantId", "recordId", "fieldDefinitionId"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        recordId: { type: "string", format: "uuid" },
        fieldDefinitionId: { type: "string", format: "uuid" },
        valueJson: {},
        searchText: { type: "string", nullable: true }
      }
    },
    // G-09 Phase 1 (0019): policy attestation model, access-review item,
    // vendor assessment, and audit request/test schemas.
    PolicyRecordStatus: {
      enum: ["draft", "active", "retired"]
    },
    CreateEnterprisePolicyRecordRequest: {
      type: "object",
      required: ["policyKey", "title", "ownerId", "category"],
      properties: {
        policyKey: { type: "string" },
        title: { type: "string" },
        ownerId: { type: "string", format: "uuid" },
        category: { type: "string" }
      }
    },
    PolicyRecord: {
      type: "object",
      required: ["id", "tenantId", "policyKey", "title", "ownerId", "category", "status"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        policyKey: { type: "string" },
        title: { type: "string" },
        ownerId: { type: "string", format: "uuid" },
        category: { type: "string" },
        status: { $ref: "#/components/schemas/PolicyRecordStatus" }
      }
    },
    PolicyControlCoverage: {
      enum: ["full", "partial", "not_covered"]
    },
    CreateEnterprisePolicyControlLinkRequest: {
      type: "object",
      required: ["controlId"],
      properties: {
        controlId: { type: "string" },
        coverage: { $ref: "#/components/schemas/PolicyControlCoverage" }
      }
    },
    PolicyControlLink: {
      type: "object",
      required: ["id", "tenantId", "policyVersionId", "controlId", "coverage"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        policyVersionId: { type: "string", format: "uuid" },
        controlId: { type: "string" },
        coverage: { $ref: "#/components/schemas/PolicyControlCoverage" }
      }
    },
    PolicyAttestationDecision: {
      enum: ["attested", "declined"]
    },
    CreateEnterprisePolicyAttestationRequest: {
      type: "object",
      required: ["decision", "evidenceHash"],
      properties: {
        decision: { $ref: "#/components/schemas/PolicyAttestationDecision" },
        evidenceHash: { type: "string" }
      }
    },
    PolicyAttestation: {
      type: "object",
      required: ["id", "tenantId", "policyVersionId", "userId", "decision", "evidenceHash", "attestedAt"],
      properties: {
        ...enterpriseAppendOnlyMetadataProperties(),
        policyVersionId: { type: "string", format: "uuid" },
        userId: { type: "string", format: "uuid" },
        decision: { $ref: "#/components/schemas/PolicyAttestationDecision" },
        evidenceHash: { type: "string" },
        attestedAt: { type: "string", format: "date-time" }
      }
    },
    AccessReviewRiskLevel: {
      enum: ["low", "medium", "high", "critical"]
    },
    CreateEnterpriseAccessReviewItemRequest: {
      type: "object",
      required: ["principalRef", "resourceRef", "entitlementRef"],
      properties: {
        principalRef: { type: "string" },
        resourceRef: { type: "string" },
        entitlementRef: { type: "string" }
      }
    },
    AccessReviewItem: {
      type: "object",
      required: ["id", "tenantId", "accessReviewId", "principalRef", "resourceRef", "entitlementRef", "riskLevel"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        accessReviewId: { type: "string", format: "uuid" },
        principalRef: { type: "string" },
        resourceRef: { type: "string" },
        entitlementRef: { type: "string" },
        riskLevel: { $ref: "#/components/schemas/AccessReviewRiskLevel" }
      }
    },
    AccessReviewCertificationOutcome: {
      enum: ["approved", "revoked", "flagged"]
    },
    CreateEnterpriseAccessReviewCertificationRequest: {
      type: "object",
      required: ["decision"],
      properties: {
        decision: { $ref: "#/components/schemas/AccessReviewCertificationOutcome" },
        rationale: { type: "string" }
      }
    },
    AccessReviewCertificationDecision: {
      type: "object",
      required: ["id", "tenantId", "reviewItemId", "reviewerId", "decision", "decidedAt"],
      properties: {
        ...enterpriseAppendOnlyMetadataProperties(),
        reviewItemId: { type: "string", format: "uuid" },
        reviewerId: { type: "string", format: "uuid" },
        decision: { $ref: "#/components/schemas/AccessReviewCertificationOutcome" },
        rationale: { type: "string" },
        decidedAt: { type: "string", format: "date-time" }
      }
    },
    VendorAssessmentType: {
      enum: ["onboarding", "renewal", "ad_hoc"]
    },
    VendorAssessmentStatus: {
      enum: ["planned", "in_progress", "completed"]
    },
    CreateEnterpriseVendorAssessmentRequest: {
      type: "object",
      required: ["assessmentType", "period"],
      properties: {
        assessmentType: { $ref: "#/components/schemas/VendorAssessmentType" },
        period: { type: "string" },
        score: { type: "number", minimum: 0, maximum: 100 }
      }
    },
    VendorAssessment: {
      type: "object",
      required: ["id", "tenantId", "vendorId", "assessmentType", "period", "status", "reviewerId"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        vendorId: { type: "string", format: "uuid" },
        assessmentType: { $ref: "#/components/schemas/VendorAssessmentType" },
        period: { type: "string" },
        status: { $ref: "#/components/schemas/VendorAssessmentStatus" },
        reviewerId: { type: "string", format: "uuid" },
        score: { type: "number" }
      }
    },
    VendorFindingStatus: {
      enum: ["open", "remediated", "accepted"]
    },
    CreateEnterpriseVendorFindingRequest: {
      type: "object",
      required: ["severity", "title"],
      properties: {
        severity: { $ref: "#/components/schemas/FindingSeverity" },
        title: { type: "string" },
        dueAt: { type: "string", format: "date-time" }
      }
    },
    VendorFinding: {
      type: "object",
      required: ["id", "tenantId", "vendorAssessmentId", "severity", "title", "status"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        vendorAssessmentId: { type: "string", format: "uuid" },
        severity: { $ref: "#/components/schemas/FindingSeverity" },
        title: { type: "string" },
        status: { $ref: "#/components/schemas/VendorFindingStatus" },
        dueAt: { type: "string", format: "date-time" }
      }
    },
    AuditRequestStatus: {
      enum: ["requested", "submitted", "accepted", "rejected"]
    },
    CreateEnterpriseAuditRequestRequest: {
      type: "object",
      required: ["requestedFrom", "dueAt"],
      properties: {
        controlId: { type: "string" },
        requestedFrom: { type: "string" },
        dueAt: { type: "string", format: "date-time" }
      }
    },
    AuditRequest: {
      type: "object",
      required: ["id", "tenantId", "auditEngagementId", "requestedFrom", "dueAt", "status"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        auditEngagementId: { type: "string", format: "uuid" },
        controlId: { type: "string" },
        requestedFrom: { type: "string" },
        dueAt: { type: "string", format: "date-time" },
        status: { $ref: "#/components/schemas/AuditRequestStatus" }
      }
    },
    AuditTestConclusion: {
      enum: ["effective", "ineffective", "not_tested"]
    },
    CreateEnterpriseAuditTestRequest: {
      type: "object",
      required: ["procedure"],
      properties: {
        controlInstanceId: { type: "string", format: "uuid" },
        procedure: { type: "string" },
        sampleRef: { type: "string" }
      }
    },
    AuditTest: {
      type: "object",
      required: ["id", "tenantId", "auditEngagementId", "procedure", "conclusion"],
      properties: {
        ...enterpriseRecordMetadataProperties(),
        auditEngagementId: { type: "string", format: "uuid" },
        controlInstanceId: { type: "string", format: "uuid" },
        procedure: { type: "string" },
        sampleRef: { type: "string" },
        conclusion: { $ref: "#/components/schemas/AuditTestConclusion" },
        reviewerId: { type: "string", format: "uuid" }
      }
    }
  };
}

// G-11 (audit hash chain hardening, migration 0024_g11_audit_hash_chain_hardening.sql). Routes live
// on a separate `AuditChainController` (base path `v1/audit`), not the pre-existing
// `AuditSecurityController` (base path `v1/audit/events`) — the pre-existing controller's
// `:eventId` catch-all route would otherwise swallow `GET /v1/audit/events/checkpoints` before it
// reached a literal "checkpoints" route.
function auditChainPaths() {
  return {
    "/v1/audit/checkpoints": {
      post: {
        operationId: "createAuditCheckpoint",
        tags: ["AuditSecurity"],
        summary: "Create the next signed checkpoint covering events since the last checkpoint.",
        parameters: [...requestContextHeaders()],
        responses: {
          "201": jsonResponse("Audit checkpoint created.", "AuditCheckpoint"),
          "401": { $ref: "#/components/responses/Problem" },
          "403": { $ref: "#/components/responses/Problem" },
          "409": { $ref: "#/components/responses/Problem" }
        }
      },
      get: {
        operationId: "listAuditCheckpoints",
        tags: ["AuditSecurity"],
        summary: "List audit checkpoints, most recent first.",
        parameters: [...paginationParameters(), ...requestContextHeaders()],
        responses: {
          "200": jsonArrayResponse("Audit checkpoints.", "AuditCheckpoint"),
          "401": { $ref: "#/components/responses/Problem" },
          "403": { $ref: "#/components/responses/Problem" }
        }
      }
    },
    "/v1/audit/checkpoints/{checkpointId}": {
      get: {
        operationId: "getAuditCheckpoint",
        tags: ["AuditSecurity"],
        summary: "Fetch a single audit checkpoint.",
        parameters: [pathParameter("checkpointId", "uuid"), ...requestContextHeaders()],
        responses: {
          "200": jsonResponse("Audit checkpoint.", "AuditCheckpoint"),
          "401": { $ref: "#/components/responses/Problem" },
          "403": { $ref: "#/components/responses/Problem" },
          "404": { $ref: "#/components/responses/Problem" }
        }
      }
    },
    "/v1/audit/checkpoints/{checkpointId}/verify": {
      post: {
        operationId: "verifyAuditCheckpoint",
        tags: ["AuditSecurity"],
        summary: "Independently recompute the chain and signature for a checkpoint and record the result.",
        parameters: [pathParameter("checkpointId", "uuid"), ...requestContextHeaders()],
        responses: {
          "201": jsonResponse("Verification recorded.", "AuditVerification"),
          "401": { $ref: "#/components/responses/Problem" },
          "403": { $ref: "#/components/responses/Problem" },
          "404": { $ref: "#/components/responses/Problem" }
        }
      }
    },
    "/v1/audit/verifications": {
      get: {
        operationId: "listAuditVerifications",
        tags: ["AuditSecurity"],
        summary: "List recorded verifier outcomes, optionally filtered to one checkpoint.",
        parameters: [
          { name: "checkpointId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
          ...paginationParameters(),
          ...requestContextHeaders()
        ],
        responses: {
          "200": jsonArrayResponse("Recorded verifier outcomes.", "AuditVerification"),
          "401": { $ref: "#/components/responses/Problem" },
          "403": { $ref: "#/components/responses/Problem" }
        }
      }
    }
  };
}

function auditChainSchemas() {
  return {
    AuditCheckpoint: {
      type: "object",
      required: ["id", "tenantId", "chainPartition", "startSequence", "endSequence", "rootHash", "signature", "signedAt"],
      properties: {
        id: { type: "string", format: "uuid" },
        tenantId: { type: "string", format: "uuid" },
        chainPartition: { type: "string", format: "uuid" },
        startSequence: { type: "string", description: "bigint serialized as a decimal string." },
        endSequence: { type: "string", description: "bigint serialized as a decimal string." },
        rootHash: { type: "string" },
        signature: { type: "string" },
        signedAt: { type: "string", format: "date-time" }
      }
    },
    AuditVerificationResult: { type: "string", enum: ["pass", "fail"] },
    AuditVerification: {
      type: "object",
      required: ["id", "tenantId", "checkpointId", "verifiedAt", "result", "verifierVersion"],
      properties: {
        id: { type: "string", format: "uuid" },
        tenantId: { type: "string", format: "uuid" },
        checkpointId: { type: "string", format: "uuid" },
        verifiedAt: { type: "string", format: "date-time" },
        result: { $ref: "#/components/schemas/AuditVerificationResult" },
        mismatchSequence: {
          type: "string",
          nullable: true,
          description: "bigint serialized as a decimal string; present only when result is 'fail'."
        },
        verifierVersion: { type: "string" }
      }
    }
  };
}

function enterpriseRecordMetadataProperties() {
  return {
    id: { type: "string", format: "uuid" },
    tenantId: { type: "string", format: "uuid" },
    versionNumber: { type: "integer" },
    classification: { $ref: "#/components/schemas/Classification" },
    createdBy: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" },
    updatedBy: { type: "string", format: "uuid" },
    updatedAt: { type: "string", format: "date-time" }
  };
}

// policy_attestations and access_review_decisions (0019) are append-only
// with no updated_by/updated_at column at all — see
// postgres-enterprise-grc.repository.ts's matching comment.
function enterpriseAppendOnlyMetadataProperties() {
  return {
    id: { type: "string", format: "uuid" },
    tenantId: { type: "string", format: "uuid" },
    versionNumber: { type: "integer" },
    classification: { $ref: "#/components/schemas/Classification" },
    createdBy: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" }
  };
}

function jsonResponse(description, schemaName) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` }
      }
    }
  };
}

function jsonArrayResponse(description, schemaName) {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "array",
          items: { $ref: `#/components/schemas/${schemaName}` }
        }
      }
    }
  };
}

function jsonRequest(schemaName) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` }
      }
    }
  };
}

function pathParameter(name, format) {
  return {
    name,
    in: "path",
    required: true,
    schema: format ? { type: "string", format } : { type: "string" }
  };
}

function paginationParameters() {
  return [
    {
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 1, maximum: 500, default: 50 }
    },
    {
      name: "offset",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 0, default: 0 }
    }
  ];
}

function idempotencyHeader() {
  return {
    name: "Idempotency-Key",
    in: "header",
    required: true,
    schema: { type: "string", minLength: 1 }
  };
}

function requestContextHeaders() {
  return [
    {
      name: "x-tenant-id",
      in: "header",
      required: true,
      schema: { type: "string", format: "uuid" }
    },
    {
      name: "x-user-id",
      in: "header",
      required: true,
      schema: { type: "string", format: "uuid" }
    },
    {
      name: "x-user-scopes",
      in: "header",
      required: true,
      schema: { type: "string" }
    },
    {
      name: "x-user-clearance",
      in: "header",
      required: true,
      schema: { $ref: "#/components/schemas/Classification" }
    }
  ];
}

function platformContextHeaders() {
  return [
    {
      name: "x-user-id",
      in: "header",
      required: true,
      schema: { type: "string", format: "uuid" }
    },
    {
      name: "x-platform-role",
      in: "header",
      required: true,
      schema: { enum: ["super_admin"] }
    },
    {
      name: "x-user-email",
      in: "header",
      required: false,
      schema: { type: "string", format: "email" }
    }
  ];
}
