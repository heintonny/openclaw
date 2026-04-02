import { html, nothing } from "lit";

export type BacklogTask = {
  taskId: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  complexity: string;
  touches: string[];
  agentRole: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type BacklogProps = {
  loading: boolean;
  tasks: BacklogTask[];
  error: string | null;
  selectedProjectId: string | null;
  statusFilter: string | null;
  severityFilter: string | null;
  addFormVisible: boolean;
  batchPlan: Array<{ taskId: string; title: string; severity: string }>;
  onRefresh: () => void;
  onStatusFilterChange: (status: string | null) => void;
  onSeverityFilterChange: (severity: string | null) => void;
  onAddTask: (task: {
    title: string;
    description?: string;
    severity?: string;
    complexity?: string;
  }) => void;
  onToggleAddForm: () => void;
  onUpdateStatus: (taskId: string, status: string) => void;
  onPlanBatch: () => void;
  onNavigateToProjects: () => void;
};

const STATUS_OPTIONS = [
  { value: "notStarted", label: "Not Started" },
  { value: "inProgress", label: "In Progress" },
  { value: "inReview", label: "In Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
  { value: "cancelled", label: "Cancelled" },
];

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const COMPLEXITY_OPTIONS = [
  { value: "xs", label: "XS" },
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL" },
];

const STATUS_ORDER: Record<string, number> = {
  inProgress: 0,
  notStarted: 1,
  blocked: 2,
  inReview: 3,
  done: 4,
  cancelled: 5,
};

function severityClass(severity: string): string {
  switch (severity) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
      return "";
    default:
      return "";
  }
}

function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

// Module-level form state (same pattern as projects.ts)
let _addTitle = "";
let _addDescription = "";
let _addSeverity = "medium";
let _addComplexity = "m";
let _batchPlanDismissed = false;

export function renderBacklog(props: BacklogProps) {
  // If no project selected, show empty state
  if (!props.selectedProjectId) {
    return html`
      <section class="card">
        <div class="page-empty">
          <p>No project selected.</p>
          <p>
            <button class="btn btn--sm btn--primary" @click=${props.onNavigateToProjects}>
              ← Go to Projects
            </button>
          </p>
        </div>
      </section>
    `;
  }

  const handleAddSubmit = (e: Event) => {
    e.preventDefault();
    if (_addTitle.trim()) {
      props.onAddTask({
        title: _addTitle.trim(),
        description: _addDescription.trim() || undefined,
        severity: _addSeverity,
        complexity: _addComplexity,
      });
      _addTitle = "";
      _addDescription = "";
      _addSeverity = "medium";
      _addComplexity = "m";
    }
  };

  // Filter tasks
  let filteredTasks = props.tasks;
  if (props.statusFilter) {
    filteredTasks = filteredTasks.filter((t) => t.status === props.statusFilter);
  }
  if (props.severityFilter) {
    filteredTasks = filteredTasks.filter((t) => t.severity === props.severityFilter);
  }

  // Sort tasks
  const sortedTasks = [...filteredTasks].toSorted((a, b) => {
    const aOrder = STATUS_ORDER[a.status] ?? 99;
    const bOrder = STATUS_ORDER[b.status] ?? 99;
    return aOrder - bOrder;
  });

  // Status counts
  const statusCounts: Record<string, number> = {};
  for (const task of props.tasks) {
    statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
  }

  const showBatchPlan = props.batchPlan.length > 0 && !_batchPlanDismissed;

  return html`
    <section class="card">
      <!-- Header -->
      <div
        class="row"
        style="justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;"
      >
        <div>
          <div class="row" style="gap: 8px; align-items: center;">
            <button
              class="btn btn--sm"
              @click=${props.onNavigateToProjects}
              title="Back to Projects"
            >
              ← Projects
            </button>
            <div class="card-title" style="margin: 0;">Backlog</div>
            <span
              class="pill"
              style="font-size: 0.8em; font-weight: normal; color: var(--text-muted, #888);"
            >
              ${props.selectedProjectId}
            </span>
          </div>
        </div>
        <div class="row" style="gap: 8px; flex-wrap: wrap;">
          <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "Loading…" : "Refresh"}
          </button>
          <button
            class="btn btn--sm ${props.addFormVisible ? "btn--primary" : ""}"
            @click=${props.onToggleAddForm}
          >
            ${props.addFormVisible ? "Cancel" : "+ Add Task"}
          </button>
          <button class="btn btn--sm" @click=${props.onPlanBatch}>Plan Batch</button>
        </div>
      </div>

      <!-- Error -->
      ${props.error
        ? html`<div class="callout danger" style="margin-bottom: 12px;">${props.error}</div>`
        : nothing}

      <!-- Add Task Form -->
      ${props.addFormVisible
        ? html`
            <form
              class="card"
              style="margin-bottom: 16px; background: var(--surface-2, #1e1e1e); padding: 12px;"
              @submit=${handleAddSubmit}
            >
              <div class="card-title" style="margin-bottom: 8px;">New Task</div>
              <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
                <label class="field-inline">
                  <span>Title</span>
                  <input
                    type="text"
                    class="input"
                    placeholder="Task title"
                    .value=${_addTitle}
                    @input=${(e: Event) => {
                      _addTitle = (e.target as HTMLInputElement).value;
                    }}
                    required
                  />
                </label>
                <label class="field-inline">
                  <span>Description</span>
                  <textarea
                    class="input"
                    placeholder="Optional description"
                    rows="2"
                    .value=${_addDescription}
                    @input=${(e: Event) => {
                      _addDescription = (e.target as HTMLTextAreaElement).value;
                    }}
                  ></textarea>
                </label>
                <div class="row" style="gap: 8px; flex-wrap: wrap;">
                  <label class="field-inline">
                    <span>Severity</span>
                    <select
                      class="input"
                      .value=${_addSeverity}
                      @change=${(e: Event) => {
                        _addSeverity = (e.target as HTMLSelectElement).value;
                      }}
                    >
                      ${SEVERITY_OPTIONS.map(
                        (o) =>
                          html`<option value=${o.value} ?selected=${o.value === _addSeverity}>
                            ${o.label}
                          </option>`,
                      )}
                    </select>
                  </label>
                  <label class="field-inline">
                    <span>Complexity</span>
                    <select
                      class="input"
                      .value=${_addComplexity}
                      @change=${(e: Event) => {
                        _addComplexity = (e.target as HTMLSelectElement).value;
                      }}
                    >
                      ${COMPLEXITY_OPTIONS.map(
                        (o) =>
                          html`<option value=${o.value} ?selected=${o.value === _addComplexity}>
                            ${o.label}
                          </option>`,
                      )}
                    </select>
                  </label>
                </div>
              </div>
              <div class="row" style="gap: 8px;">
                <button type="submit" class="btn btn--sm btn--primary">Add Task</button>
                <button type="button" class="btn btn--sm" @click=${props.onToggleAddForm}>
                  Cancel
                </button>
              </div>
            </form>
          `
        : nothing}

      <!-- Batch Plan Panel -->
      ${showBatchPlan
        ? html`
            <div
              class="callout"
              style="margin-bottom: 12px; background: var(--surface-2, #1e1e1e); padding: 12px; border-radius: 6px;"
            >
              <div
                class="row"
                style="justify-content: space-between; align-items: center; margin-bottom: 8px;"
              >
                <strong>Recommended Next Tasks</strong>
                <button
                  class="btn btn--sm"
                  @click=${() => {
                    _batchPlanDismissed = true;
                  }}
                >
                  Dismiss
                </button>
              </div>
              <ul style="margin: 0; padding-left: 20px;">
                ${props.batchPlan.map(
                  (t) => html`
                    <li style="margin-bottom: 4px;">
                      <span
                        class="pill ${severityClass(t.severity)}"
                        style="font-size: 0.75em; margin-right: 6px;"
                        >${t.severity}</span
                      >
                      ${t.title}
                      <small style="color: var(--text-muted, #888); margin-left: 6px;"
                        >#${t.taskId}</small
                      >
                    </li>
                  `,
                )}
              </ul>
            </div>
          `
        : nothing}

      <!-- Summary Bar -->
      ${props.tasks.length > 0
        ? html`
            <div class="row" style="gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
              ${Object.entries(statusCounts).map(
                ([status, count]) => html`
                  <span
                    class="pill ${status === "done"
                      ? "success"
                      : status === "blocked" || status === "cancelled"
                        ? "danger"
                        : status === "inProgress"
                          ? "info"
                          : ""}"
                    style="font-size: 0.8em;"
                  >
                    ${count} ${statusLabel(status)}
                  </span>
                `,
              )}
            </div>
          `
        : nothing}

      <!-- Filters -->
      <div style="margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">
        <div class="row" style="gap: 6px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 0.8em; color: var(--text-muted, #888); min-width: 60px;"
            >Status:</span
          >
          <button
            class="btn btn--sm ${!props.statusFilter ? "btn--primary" : ""}"
            @click=${() => props.onStatusFilterChange(null)}
          >
            All
          </button>
          ${STATUS_OPTIONS.map(
            (s) => html`
              <button
                class="btn btn--sm ${props.statusFilter === s.value ? "btn--primary" : ""}"
                @click=${() => props.onStatusFilterChange(s.value)}
              >
                ${s.label}
              </button>
            `,
          )}
        </div>
        <div class="row" style="gap: 6px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 0.8em; color: var(--text-muted, #888); min-width: 60px;"
            >Severity:</span
          >
          <button
            class="btn btn--sm ${!props.severityFilter ? "btn--primary" : ""}"
            @click=${() => props.onSeverityFilterChange(null)}
          >
            All
          </button>
          ${SEVERITY_OPTIONS.map(
            (s) => html`
              <button
                class="btn btn--sm ${props.severityFilter === s.value ? "btn--primary" : ""}"
                @click=${() => props.onSeverityFilterChange(s.value)}
              >
                ${s.label}
              </button>
            `,
          )}
        </div>
      </div>

      <!-- Loading state -->
      ${props.loading && props.tasks.length === 0
        ? html`<div class="page-empty"><p>Loading tasks…</p></div>`
        : sortedTasks.length === 0
          ? html`
              <div class="page-empty">
                <p>No tasks found.</p>
                ${props.tasks.length > 0
                  ? html`<p style="font-size: 0.85em; color: var(--text-muted, #888);">
                      Try clearing filters.
                    </p>`
                  : html`<p>Click "Add Task" to create your first task.</p>`}
              </div>
            `
          : html`
              <!-- Task Table -->
              <div style="overflow-x: auto;">
                <table
                  class="table"
                  style="width: 100%; border-collapse: collapse; font-size: 0.875em;"
                >
                  <thead>
                    <tr>
                      <th
                        style="text-align: left; padding: 8px 12px; white-space: nowrap; color: var(--text-muted, #888); font-weight: 500;"
                      >
                        ID
                      </th>
                      <th
                        style="text-align: left; padding: 8px 12px; color: var(--text-muted, #888); font-weight: 500;"
                      >
                        Title
                      </th>
                      <th
                        style="text-align: left; padding: 8px 12px; white-space: nowrap; color: var(--text-muted, #888); font-weight: 500;"
                      >
                        Status
                      </th>
                      <th
                        style="text-align: left; padding: 8px 12px; white-space: nowrap; color: var(--text-muted, #888); font-weight: 500;"
                      >
                        Severity
                      </th>
                      <th
                        style="text-align: left; padding: 8px 12px; white-space: nowrap; color: var(--text-muted, #888); font-weight: 500;"
                      >
                        Complexity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sortedTasks.map(
                      (task) => html`
                        <tr style="border-top: 1px solid var(--border, rgba(255,255,255,0.08));">
                          <td
                            style="padding: 8px 12px; white-space: nowrap; color: var(--text-muted, #888); font-family: monospace; font-size: 0.85em;"
                          >
                            #${task.taskId.slice(0, 8)}
                          </td>
                          <td style="padding: 8px 12px; max-width: 300px;">
                            <div style="font-weight: 500;">${task.title}</div>
                            ${task.description
                              ? html`<div
                                  style="font-size: 0.8em; color: var(--text-muted, #888); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;"
                                >
                                  ${task.description}
                                </div>`
                              : nothing}
                          </td>
                          <td style="padding: 8px 12px; white-space: nowrap;">
                            <select
                              class="input"
                              style="font-size: 0.85em; padding: 2px 6px;"
                              .value=${task.status}
                              @change=${(e: Event) => {
                                props.onUpdateStatus(
                                  task.taskId,
                                  (e.target as HTMLSelectElement).value,
                                );
                              }}
                            >
                              ${STATUS_OPTIONS.map(
                                (s) => html`
                                  <option value=${s.value} ?selected=${task.status === s.value}>
                                    ${s.label}
                                  </option>
                                `,
                              )}
                            </select>
                          </td>
                          <td style="padding: 8px 12px; white-space: nowrap;">
                            <span
                              class="pill ${severityClass(task.severity)}"
                              style="font-size: 0.8em;"
                            >
                              ${task.severity}
                            </span>
                          </td>
                          <td
                            style="padding: 8px 12px; white-space: nowrap; color: var(--text-muted, #888);"
                          >
                            ${task.complexity.toUpperCase()}
                          </td>
                        </tr>
                      `,
                    )}
                  </tbody>
                </table>
              </div>
            `}
    </section>
  `;
}
