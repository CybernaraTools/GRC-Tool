import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { ErrorState, EmptyState } from "../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../src/lib/api/server";
import type { NotificationItem, UniversalTask, UniversalTaskStatus, UniversalTaskPriority } from "../../src/lib/api/generated";
import { textParam, type SearchParamsRecord } from "../../src/lib/listing";
import { requireSession } from "../../src/lib/protected-session";

type TasksPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const tasksActionPath = "/tasks/actions";

const CATEGORY_LABELS: Record<string, string> = {
  pending_answer: "Submit Answer",
  pending_remediation: "Execute Remediation",
  review_item: "Review Required",
  verify_remediation: "Verify Remediation",
  ready_to_close: "Ready to Close"
};

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  pending_answer: "dispBadge dispUnresolved",
  pending_remediation: "dispBadge dispUnresolved",
  review_item: "dispBadge dispAcceptedRisk",
  verify_remediation: "dispBadge dispAcceptedRisk",
  ready_to_close: "dispBadge dispSatisfied"
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = searchParams ? await searchParams : {};
  const session = await requireSession(`/tasks`);
  const primaryRole = (session.roles[0] || "viewer").toLowerCase();

  const api = createServerApiClient(session);

  let notifications: NotificationItem[] = [];
  let notificationsError: string | null = null;
  try {
    const feed = await api.listNotifications();
    notifications = feed.items;
  } catch (error) {
    notificationsError = apiErrorMessage(error);
  }

  let tasks: UniversalTask[] = [];
  let tasksError: string | null = null;

  const filterStatus = (textParam(params, "status") || undefined) as UniversalTaskStatus | undefined;
  const filterPriority = (textParam(params, "priority") || undefined) as UniversalTaskPriority | undefined;

  try {
    tasks = await api.listUniversalTasks({
      status: filterStatus,
      priority: filterPriority,
      ownerId: session.userId,
      limit: 50,
      offset: 0
    });
  } catch (error) {
    tasksError = apiErrorMessage(error);
  }

  return (
    <AppShell session={session} title="Tasks & Notifications">
      <section className="workspace" aria-labelledby="tasks-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Notification & Action Hub</p>
            <h2 id="tasks-heading">Action Required</h2>
          </div>
          <span>{notifications.length} active</span>
        </div>

        <div className="constraintNote">
          {primaryRole === "viewer"
            ? "Read-only summary of active work across the platform. This feed updates automatically as work moves through the governance lifecycle - there is nothing to dismiss manually."
            : "Every item below is computed live from current assessment, finding, and remediation state. As soon as you (or the assigned owner) complete the underlying action, it disappears from this list automatically."}
        </div>

        {notificationsError ? <ErrorState title="Notifications could not be loaded" detail={notificationsError} /> : null}

        {!notificationsError && notifications.length === 0 ? (
          <EmptyState title="Nothing needs your attention right now" detail="New notifications appear here the moment there's an action for your role." />
        ) : null}

        {!notificationsError && notifications.length > 0 ? (
          <div className="detailGrid">
            {notifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))}
          </div>
        ) : null}
      </section>

      {primaryRole !== "viewer" ? (
        <section className="workspace" aria-labelledby="task-queue-heading">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Universal Task Layer</p>
              <h2 id="task-queue-heading">My Assignment Queue</h2>
            </div>
            <span>Accountability inbox</span>
          </div>

          {tasksError ? <ErrorState title="Tasks could not be loaded" detail={tasksError} /> : null}

          <div className="tagList" style={{ padding: "0 24px 16px" }}>
            <Link className={!filterStatus ? "active" : ""} href="/tasks">
              All Tasks
            </Link>
            <Link className={filterStatus === "pending" ? "active" : ""} href="/tasks?status=pending">
              Pending
            </Link>
            <Link className={filterStatus === "in_progress" ? "active" : ""} href="/tasks?status=in_progress">
              In Progress
            </Link>
            <Link className={filterStatus === "completed" ? "active" : ""} href="/tasks?status=completed">
              Completed
            </Link>
          </div>

          {tasks.length > 0 ? (
            <div className="tableScroller">
              <table>
                <caption>Open Assignments</caption>
                <thead>
                  <tr>
                    <th scope="col">Task ID</th>
                    <th scope="col">Title</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Status</th>
                    <th scope="col">Target Type</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <small>{task.id.slice(0, 8)}</small>
                      </td>
                      <td>
                        <strong>{task.title}</strong>
                        {task.description && (
                          <p style={{ margin: "4px 0 0 0", fontSize: "0.85em", color: "#666" }}>{task.description}</p>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${task.priority === "critical" || task.priority === "high" ? "restricted" : "internal"}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <span className="badge internal">{task.status}</span>
                      </td>
                      <td>
                        <small style={{ textTransform: "capitalize" }}>{task.targetType.replaceAll("_", " ")}</small>
                      </td>
                      <td>
                        <form action={tasksActionPath} method="post" style={{ display: "inline-block" }}>
                          <input type="hidden" name="intent" value="updateTaskStatus" />
                          <input type="hidden" name="taskId" value={task.id} />
                          <select name="status" defaultValue={task.status}>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button type="submit" style={{ marginLeft: "8px" }}>
                            Update
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>No tasks found in your queue.</div>
          )}
        </section>
      ) : null}
    </AppShell>
  );
}

function NotificationCard({ notification }: { notification: NotificationItem }) {
  const label = CATEGORY_LABELS[notification.category] ?? notification.category;
  const badgeClass = CATEGORY_BADGE_CLASS[notification.category] ?? "dispBadge dispNotApplicable";
  return (
    <article style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "18px 20px", borderRadius: "var(--radius-card)", background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
        <span className={badgeClass}>{label}</span>
      </div>
      <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>{notification.title}</h3>
      <p style={{ fontSize: "13px", color: "var(--ink-muted)", margin: 0 }}>{notification.description}</p>
      <Link href={notification.link} style={{ textDecoration: "none", marginTop: "auto", paddingTop: "6px" }}>
        <button type="button">Open</button>
      </Link>
    </article>
  );
}
