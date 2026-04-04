import { html, nothing } from "lit";

export type IssueItem = {
  taskId: string;
  issueId?: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  complexity: string;
  touches?: string[];
  labels?: string[];
  agentRole?: string | null;
  assignee?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  projectId: string;
};

export type IssuesProps = {
  loading: boolean;
  tasks: IssueItem[];
  error: string | null;
  statusFilter: string | null;
  severityFilter: string | null;
  projectFilter: string | null;
  addFormVisible: boolean;
  moreProjectsOpen: boolean;
  moreProjectsSearch: string;
  batchPlanDismissed: boolean;
  batchPlan: Array<{ taskId: string; title: string; severity: string }>;
  projects?: Array<{ projectId: string; repoPaths: string[] }>;
  onRefresh: () => void;
  onStatusFilterChange: (status: string | null) => void;
  onSeverityFilterChange: (severity: string | null) => void;
  onProjectFilterChange: (projectId: string | null) => void;
  onMoreProjectsOpenChange: (open: boolean) => void;
  onMoreProjectsSearchChange: (search: string) => void;
  onBatchPlanDismiss: () => void;
  onAddTask: (task: {
    title: string;
    description?: string;
    severity?: string;
    complexity?: string;
  }) => void;
  onToggleAddForm: () => void;
  onUpdateStatus: (taskId: string, status: string, projectId: string) => void;
  onPlanBatch: () => void;
};

// Backward-compatible aliases
export type BacklogTask = IssueItem;
export type BacklogProps = IssuesProps;

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

export function renderIssues(props: IssuesProps) {
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

  // Apply project filter first
  let filteredTasks = props.tasks;
  if (props.projectFilter) {
    filteredTasks = filteredTasks.filter((t) => t.projectId === props.projectFilter);
  }

  // Then status/severity filters
  if (props.statusFilter) {
    filteredTasks = filteredTasks.filter((t) => t.status === props.statusFilter);
  }
  if (props.severityFilter) {
    filteredTasks = filteredTasks.filter((t) => t.severity === props.severityFilter);
  }

  // Sort: by status order, then by project within same status
  const sortedTasks = [...filteredTasks].toSorted((a, b) => {
    const aOrder = STATUS_ORDER[a.status] ?? 99;
    const bOrder = STATUS_ORDER[b.status] ?? 99;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return a.projectId.localeCompare(b.projectId);
  });

  // Status counts (from all tasks, before filters)
  const statusCounts: Record<string, number> = {};
  for (const task of props.tasks) {
    statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
  }

  // Project counts for filter chips — top 5 by task count
  const projectCounts: Record<string, number> = {};
  for (const task of props.tasks) {
    projectCounts[task.projectId] = (projectCounts[task.projectId] ?? 0) + 1;
  }
  const topProjects = Object.entries(projectCounts)
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  // All unique project IDs for the "+ More" search
  const allProjectIds = Object.keys(projectCounts).toSorted();

  // Filter the "+ More" search results
  const searchLower = props.moreProjectsSearch.toLowerCase();
  const moreProjectResults = searchLower
    ? allProjectIds.filter(
        (id) => id.toLowerCase().includes(searchLower) && !topProjects.includes(id),
      )
    : allProjectIds.filter((id) => !topProjects.includes(id));

  const showBatchPlan = props.batchPlan.length > 0 && !props.batchPlanDismissed;

  return html`
    <section class="card">
      <!-- Header -->
      <div
        class="row"
        style="justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;"
      >
        <div>
          <div class="row" style="gap: 8px; align-items: center;">
            <div class="card-title" style="margin: 0;">Issues</div>
            <span
              class="pill"
              style="font-size: 0.8em; font-weight: normal; color: var(--text-muted, #888);"
            >
              ${props.tasks.length} issues
            </span>
          </div>
        </div>
        <div class="row" style="gap: 8px; flex-wrap: wrap;">
          <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "Loading…" : "Refresh"}
          </button>
          <button
            class="btn btn--sm ${props.addFormVisible ? "btn--primary" : ""}"
            ?disabled=${!props.projectFilter && !props.addFormVisible}
            @click=${props.onToggleAddForm}
            title=${props.projectFilter ? "" : "Select a project filter first to add an issue"}
          >
            ${props.addFormVisible ? "Cancel" : "+ Add Issue"}
          </button>
          <button
            class="btn btn--sm"
            ?disabled=${!props.projectFilter}
            @click=${props.onPlanBatch}
            title=${props.projectFilter
              ? "Plan batch for " + props.projectFilter
              : "Select a project filter to plan batch"}
          >
            Plan Batch
          </button>
        </div>
      </div>

      <!-- Error -->
      ${props.error
        ? html`<div class="callout danger" style="margin-bottom: 12px;">${props.error}</div>`
        : nothing}

      <!-- Add Issue Form -->
      ${props.addFormVisible
        ? html`
            <form
              class="card"
              style="margin-bottom: 16px; background: var(--surface-2, #1e1e1e); padding: 12px;"
              @submit=${handleAddSubmit}
            >
              <div class="card-title" style="margin-bottom: 8px;">New Issue</div>
              ${!props.projectFilter
                ? html`<div class="callout warning" style="margin-bottom: 8px; font-size: 0.85em;">
                    Select a project filter first to add issues to a specific project.
                  </div>`
                : html`<div
                    style="margin-bottom: 8px; font-size: 0.85em; color: var(--text-muted, #888);"
                  >
                    Adding to project:
                    <span class="pill" style="font-size: 0.85em;">${props.projectFilter}</span>
                  </div>`}
              <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
                <label class="field-inline">
                  <span>Title</span>
                  <input
                    type="text"
                    class="input"
                    placeholder="Issue title"
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
                <button
                  type="submit"
                  class="btn btn--sm btn--primary"
                  ?disabled=${!props.projectFilter}
                >
                  Add Issue
                </button>
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
                <strong>Recommended Next Issues</strong>
                <button class="btn btn--sm" @click=${() => props.onBatchPlanDismiss()}>
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
        <!-- Status filter -->
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
        <!-- Severity filter -->
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
        <!-- Project filter -->
        <div class="row" style="gap: 6px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 0.8em; color: var(--text-muted, #888); min-width: 60px;"
            >Project:</span
          >
          <button
            class="btn btn--sm ${!props.projectFilter ? "btn--primary" : ""}"
            @click=${() => {
              props.onProjectFilterChange(null);
              props.onMoreProjectsOpenChange(false);
            }}
          >
            All
          </button>
          ${topProjects.map(
            (pid) => html`
              <button
                class="btn btn--sm ${props.projectFilter === pid ? "btn--primary" : ""}"
                @click=${() => {
                  props.onProjectFilterChange(pid);
                  props.onMoreProjectsOpenChange(false);
                }}
              >
                ${pid}
                <span style="font-size: 0.8em; opacity: 0.7; margin-left: 2px;"
                  >(${projectCounts[pid]})</span
                >
              </button>
            `,
          )}
          ${allProjectIds.length > 5
            ? html`
                <div style="position: relative; display: inline-block;">
                  <button
                    class="btn btn--sm ${props.moreProjectsOpen ? "btn--primary" : ""}"
                    @click=${() => {
                      props.onMoreProjectsOpenChange(!props.moreProjectsOpen);
                      props.onMoreProjectsSearchChange("");
                    }}
                  >
                    + More
                  </button>
                  ${props.moreProjectsOpen
                    ? html`
                        <div
                          style="position: absolute; top: 100%; left: 0; z-index: 10; margin-top: 4px; background: var(--surface-2, #1e1e1e); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 6px; padding: 8px; min-width: 200px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);"
                        >
                          <input
                            class="input"
                            type="text"
                            placeholder="Search projects…"
                            style="font-size: 0.85em; padding: 4px 8px; width: 100%; margin-bottom: 6px;"
                            .value=${props.moreProjectsSearch}
                            @input=${(e: Event) => {
                              props.onMoreProjectsSearchChange(
                                (e.target as HTMLInputElement).value,
                              );
                            }}
                          />
                          <div style="max-height: 200px; overflow-y: auto;">
                            ${moreProjectResults.length === 0
                              ? html`<div
                                  style="font-size: 0.8em; color: var(--text-muted, #888); padding: 4px;"
                                >
                                  No matching projects
                                </div>`
                              : moreProjectResults.map(
                                  (pid) => html`
                                    <div
                                      style="padding: 4px 8px; cursor: pointer; border-radius: 4px; font-size: 0.85em;"
                                      @mouseover=${(e: Event) => {
                                        (e.currentTarget as HTMLElement).style.background =
                                          "var(--surface-3, #2a2a2a)";
                                      }}
                                      @mouseout=${(e: Event) => {
                                        (e.currentTarget as HTMLElement).style.background = "";
                                      }}
                                      @click=${() => {
                                        props.onProjectFilterChange(pid);
                                        props.onMoreProjectsOpenChange(false);
                                        props.onMoreProjectsSearchChange("");
                                      }}
                                    >
                                      ${pid}
                                      <span style="font-size: 0.8em; opacity: 0.7;"
                                        >(${projectCounts[pid] ?? 0})</span
                                      >
                                    </div>
                                  `,
                                )}
                          </div>
                        </div>
                      `
                    : nothing}
                </div>
              `
            : nothing}
        </div>
      </div>

      <!-- Loading state -->
      ${props.loading && props.tasks.length === 0
        ? html`<div class="page-empty"><p>Loading issues…</p></div>`
        : sortedTasks.length === 0
          ? html`
              <div class="page-empty">
                <p>No issues found.</p>
                ${props.tasks.length > 0
                  ? html`<p style="font-size: 0.85em; color: var(--text-muted, #888);">
                      Try clearing filters.
                    </p>`
                  : html`<p>Click "Add Issue" to create your first issue.</p>`}
              </div>
            `
          : html`
              <!-- Issue Table -->
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
                        style="text-align: left; padding: 8px 12px; white-space: nowrap; color: var(--text-muted, #888); font-weight: 500;"
                      >
                        Project
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
                          <td style="padding: 8px 12px; white-space: nowrap;">
                            <span
                              class="pill"
                              style="font-size: 0.75em; cursor: pointer;"
                              @click=${() => props.onProjectFilterChange(task.projectId)}
                              title="Filter by ${task.projectId}"
                            >
                              ${task.projectId}
                            </span>
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
                                  task.projectId,
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

// Backward-compatible alias
export const renderBacklog = renderIssues;
