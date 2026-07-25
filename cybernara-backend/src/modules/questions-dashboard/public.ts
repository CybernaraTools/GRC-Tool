export { QuestionsDashboardModule } from "./questions-dashboard.module.js";
export { QuestionsDashboardService } from "./application/questions-dashboard.service.js";
export { computeDashboardSummary, complianceStatusLabel } from "./domain/dashboard-aggregation.js";
export type {
  DashboardSummary,
  FrameworkComplianceSummary,
  QuestionSource,
  UnifiedQuestion
} from "./domain/dashboard-aggregation.js";
