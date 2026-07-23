import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { ErrorState } from "../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../src/lib/api/server";
import type { UniversalTask, UniversalTaskStatus, UniversalTaskPriority } from "../../src/lib/api/generated";
import { textParam, type SearchParamsRecord } from "../../src/lib/listing";
import { requireSession } from "../../src/lib/protected-session";

type TasksPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const tasksActionPath = "/tasks/actions";

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = searchParams ? await searchParams : {};
  const session = await requireSession(`/tasks`);

  const api = createServerApiClient(session);
  let tasks: UniversalTask[] = [];
  let apiError: string | null = null;

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
    apiError = apiErrorMessage(error);
  }

  return (
    <AppShell session={session} title="My Tasks">
      <section className="workspace" aria-labelledby="tasks-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Universal Task Layer</p>
            <h2 id="tasks-heading">Inbox & Assignment Queue</h2>
          </div>
          <span>Accountability inbox</span>
        </div>

        <div className="constraintNote">
          Centralized workplace inbox summarizing your control remediations and privacy fulfillment actions.
        </div>

        {apiError ? <ErrorState title="Tasks could not be loaded" detail={apiError} /> : null}

        {/* Filter Toolbar */}
        <div className="filterToolbar" style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <Link
            className={`badge ${!filterStatus ? "restricted" : "internal"}`}
            href="/tasks"
          >
            All Tasks
          </Link>
          <Link
            className={`badge ${filterStatus === "pending" ? "restricted" : "internal"}`}
            href="/tasks?status=pending"
          >
            Pending
          </Link>
          <Link
            className={`badge ${filterStatus === "in_progress" ? "restricted" : "internal"}`}
            href="/tasks?status=in_progress"
          >
            In Progress
          </Link>
          <Link
            className={`badge ${filterStatus === "completed" ? "restricted" : "internal"}`}
            href="/tasks?status=completed"
          >
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
                      <small style={{ fontFamily: "monospace" }}>{task.id.slice(0, 8)}</small>
                    </td>
                    <td>
                      <strong>{task.title}</strong>
                      {task.description && (
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.85em", color: "#666" }}>
                          {task.description}
                        </p>
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
                      <small style={{ textTransform: "capitalize" }}>
                        {task.targetType.replaceAll("_", " ")}
                      </small>
                    </td>
                    <td>
                      <form action={tasksActionPath} method="post" style={{ display: "inline-block" }}>
                        <input type="hidden" name="intent" value="updateTaskStatus" />
                        <input type="hidden" name="taskId" value={task.id} />
                        <select
                          name="status"
                          defaultValue={task.status}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            background: "#fff",
                            fontSize: "0.9em"
                          }}
                        >
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
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            No tasks found in your queue.
          </div>
        )}
      </section>
    </AppShell>
  );
}
