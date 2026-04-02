import { html, nothing } from "lit";
import { icons } from "../icons.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DetailedStats = {
  statusBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  complexityBreakdown: Record<string, number>;
  total: number;
  selfImproveUnapplied: number;
  lastActivity: string | null;
  completedLast7d: number;
  completedLast30d: number;
  blockedCritical: Array<{ taskId: string; title: string; severity: string }>;
};

export type ProjectEntry = {
  projectId: string;
  repoPaths: string[];
  registeredAt?: string;
  stats?: { total: number; active: number; done: number };
  detailedStats?: DetailedStats | null;
  taskSummary?: Record<string, number>;
};

export type ProjectsProps = {
  loading: boolean;
  projects: ProjectEntry[];
  error: string | null;
  selectedProjectId: string | null;
  onRefresh: () => void;
  onRegister: (projectId: string, repoPath: string) => void;
  onSelectProject: (projectId: string) => void;
  onNavigateToBacklog: (projectId: string) => void;
};

// ── Module-level state ────────────────────────────────────────────────────────

let _registerFormVisible = false;
let _registerProjectId = "";
let _registerRepoPath = "";
let _expandedProjectId: string | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  done: "var(--status-ok, #22c55e)",
  inProgress: "var(--status-info, #3b82f6)",
  inReview: "var(--status-info, #8b5cf6)",
  blocked: "var(--status-danger, #ef4444)",
  notStarted: "var(--text-muted, #888)",
  cancelled: "var(--text-muted, #555)",
};

const STATUS_LABELS: Record<string, string> = {
  done: "Done",
  inProgress: "In Progress",
  inReview: "In Review",
  blocked: "Blocked",
  notStarted: "Not Started",
  cancelled: "Cancelled",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#6b7280",
};

function healthIndicator(ds: DetailedStats | null | undefined): {
  icon: string;
  label: string;
  color: string;
} {
  if (!ds || ds.total === 0) {
    return { icon: "○", label: "No tasks", color: "var(--text-muted, #888)" };
  }
  const blocked = ds.statusBreakdown.blocked ?? 0;
  const critical = ds.blockedCritical?.filter((t) => t.severity === "critical").length ?? 0;
  if (critical > 0 || blocked > 2) {
    return { icon: "●", label: "Needs attention", color: "#ef4444" };
  }
  if (blocked > 0 || (ds.severityBreakdown.critical ?? 0) > 0) {
    return { icon: "●", label: "Degraded", color: "#f59e0b" };
  }
  return { icon: "●", label: "Healthy", color: "#22c55e" };
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) {
    return "just now";
  }
  if (ms < 3600000) {
    return `${Math.floor(ms / 60000)}m ago`;
  }
  if (ms < 86400000) {
    return `${Math.floor(ms / 3600000)}h ago`;
  }
  return `${Math.floor(ms / 86400000)}d ago`;
}

// ── Aggregated summary bar ────────────────────────────────────────────────────

function renderSummaryBar(projects: ProjectEntry[]) {
  let totalTasks = 0;
  let totalDone = 0;
  let totalInProgress = 0;
  let totalBlocked = 0;
  let totalOpen = 0;
  let totalSelfImprove = 0;

  for (const p of projects) {
    const ds = p.detailedStats;
    if (ds) {
      totalTasks += ds.total;
      totalDone += ds.statusBreakdown.done ?? 0;
      totalInProgress += ds.statusBreakdown.inProgress ?? 0;
      totalBlocked += ds.statusBreakdown.blocked ?? 0;
      totalOpen += ds.statusBreakdown.notStarted ?? 0;
      totalSelfImprove += ds.selfImproveUnapplied;
    } else if (p.stats) {
      totalTasks += p.stats.total;
      totalDone += p.stats.done;
      totalInProgress += p.stats.active;
    }
  }

  const items = [
    { label: "Projects", value: projects.length, color: "" },
    { label: "Total tasks", value: totalTasks, color: "" },
    { label: "Done", value: totalDone, color: "var(--status-ok, #22c55e)" },
    { label: "In Progress", value: totalInProgress, color: "var(--status-info, #3b82f6)" },
    { label: "Open", value: totalOpen, color: "" },
    {
      label: "Blocked",
      value: totalBlocked,
      color: totalBlocked > 0 ? "var(--status-danger, #ef4444)" : "",
    },
    { label: "Learnings", value: totalSelfImprove, color: totalSelfImprove > 0 ? "#8b5cf6" : "" },
  ];

  return html`
    <div
      class="row"
      style="gap: 16px; flex-wrap: wrap; padding: 10px 16px; background: var(--surface-2, #1a1a1a); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; margin-bottom: 16px;"
    >
      ${items.map(
        (item) => html`
          <div style="display: flex; flex-direction: column; align-items: center; min-width: 60px;">
            <span
              style="font-size: 1.25em; font-weight: 700; font-variant-numeric: tabular-nums; color: ${item.color ||
              "var(--text, #fff)"};"
              >${item.value}</span
            >
            <span style="font-size: 0.7em; color: var(--text-muted, #888); white-space: nowrap;"
              >${item.label}</span
            >
          </div>
        `,
      )}
    </div>
  `;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function renderProgressBar(ds: DetailedStats) {
  const total = ds.total;
  if (total === 0) {
    return nothing;
  }

  const segments = [
    { key: "done", count: ds.statusBreakdown.done ?? 0 },
    { key: "inProgress", count: ds.statusBreakdown.inProgress ?? 0 },
    { key: "inReview", count: ds.statusBreakdown.inReview ?? 0 },
    { key: "blocked", count: ds.statusBreakdown.blocked ?? 0 },
    { key: "notStarted", count: ds.statusBreakdown.notStarted ?? 0 },
    { key: "cancelled", count: ds.statusBreakdown.cancelled ?? 0 },
  ].filter((s) => s.count > 0);

  return html`
    <div
      style="display: flex; height: 6px; border-radius: 3px; overflow: hidden; background: var(--surface-2, #222); width: 100%;"
      title="${pct(ds.statusBreakdown.done ?? 0, total)}% complete"
    >
      ${segments.map(
        (s) => html`
          <div
            style="width: ${pct(s.count, total)}%; background: ${STATUS_COLORS[s.key] ??
            "#888"}; min-width: ${s.count > 0 ? "2px" : "0"};"
            title="${STATUS_LABELS[s.key] ?? s.key}: ${s.count}"
          ></div>
        `,
      )}
    </div>
  `;
}

// ── Project card ──────────────────────────────────────────────────────────────

function renderProjectCard(
  project: ProjectEntry,
  isSelected: boolean,
  isExpanded: boolean,
  onSelect: () => void,
  onToggleExpand: () => void,
  onNavigateToBacklog: () => void,
) {
  const ds = project.detailedStats;
  const health = healthIndicator(ds);
  const total = ds?.total ?? project.stats?.total ?? 0;
  const doneCount = ds?.statusBreakdown?.done ?? project.stats?.done ?? 0;
  const completionPct = pct(doneCount, total);

  return html`
    <div
      class="card"
      style="padding: 14px; cursor: pointer; transition: all 0.15s ease;${isSelected
        ? " outline: 2px solid var(--accent, #6366f1); outline-offset: -2px;"
        : ""}"
      @click=${() => {
        onSelect();
        onToggleExpand();
      }}
      role="button"
      tabindex="0"
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect();
          onToggleExpand();
        }
      }}
    >
      <!-- Header row -->
      <div class="row" style="align-items: center; gap: 8px; margin-bottom: 10px;">
        <span style="color: ${health.color}; font-size: 0.7em;" title="${health.label}"
          >${health.icon}</span
        >
        <strong style="font-size: 0.95em; flex: 1;">${project.projectId}</strong>
        <span style="font-size: 0.7em; color: var(--text-muted, #888);" title="Last activity"
          >${timeAgo(ds?.lastActivity)}</span
        >
      </div>

      <!-- Progress bar -->
      ${ds ? renderProgressBar(ds) : nothing}

      <!-- Stats row -->
      <div class="row" style="gap: 12px; margin-top: 8px; font-size: 0.8em; flex-wrap: wrap;">
        <span style="color: var(--text-muted, #888);">${total} tasks</span>
        ${doneCount > 0
          ? html`<span style="color: var(--status-ok, #22c55e);"
              >${doneCount} done <span style="opacity: 0.6;">(${completionPct}%)</span></span
            >`
          : nothing}
        ${(ds?.statusBreakdown?.inProgress ?? 0) > 0
          ? html`<span style="color: var(--status-info, #3b82f6);"
              >${ds!.statusBreakdown.inProgress} active</span
            >`
          : nothing}
        ${(ds?.statusBreakdown?.blocked ?? 0) > 0
          ? html`<span style="color: var(--status-danger, #ef4444);"
              >${ds!.statusBreakdown.blocked} blocked</span
            >`
          : nothing}
        ${(ds?.selfImproveUnapplied ?? 0) > 0
          ? html`<span style="color: #8b5cf6;">${ds!.selfImproveUnapplied} learnings</span>`
          : nothing}
      </div>

      <!-- Repo paths -->
      <div style="margin-top: 6px; font-size: 0.75em; color: var(--text-muted, #666);">
        ${project.repoPaths.map(
          (rp) =>
            html`<div
              style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
              title="${rp}"
            >
              ${rp}
            </div>`,
        )}
      </div>

      <!-- Expanded detail panel -->
      ${isExpanded && ds ? renderExpandedDetail(ds, onNavigateToBacklog) : nothing}
    </div>
  `;
}

// ── Expanded detail panel ─────────────────────────────────────────────────────

function renderExpandedDetail(ds: DetailedStats, onNavigateToBacklog: () => void) {
  const statusEntries = Object.entries(ds.statusBreakdown).filter(([, v]) => v > 0);
  const severityEntries = Object.entries(ds.severityBreakdown).filter(([, v]) => v > 0);
  const complexityEntries = Object.entries(ds.complexityBreakdown).filter(([, v]) => v > 0);

  return html`
    <div
      style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border, rgba(255,255,255,0.08));"
      @click=${(e: Event) => e.stopPropagation()}
    >
      <!-- Status breakdown -->
      <div style="margin-bottom: 12px;">
        <div
          style="font-size: 0.75em; font-weight: 600; color: var(--text-muted, #888); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;"
        >
          Status Breakdown
        </div>
        <div class="row" style="gap: 6px; flex-wrap: wrap;">
          ${statusEntries.map(
            ([status, count]) => html`
              <span
                class="pill"
                style="font-size: 0.75em; background: ${STATUS_COLORS[status] ??
                "#888"}22; color: ${STATUS_COLORS[status] ??
                "#888"}; border: 1px solid ${STATUS_COLORS[status] ?? "#888"}33;"
              >
                ${count} ${STATUS_LABELS[status] ?? status}
              </span>
            `,
          )}
        </div>
      </div>

      <!-- Severity + Complexity side by side -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        ${severityEntries.length > 0
          ? html`
              <div>
                <div
                  style="font-size: 0.75em; font-weight: 600; color: var(--text-muted, #888); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;"
                >
                  Severity (open)
                </div>
                <div style="display: flex; flex-direction: column; gap: 3px;">
                  ${severityEntries.map(
                    ([sev, count]) => html`
                      <div class="row" style="align-items: center; gap: 6px; font-size: 0.8em;">
                        <span
                          style="width: 8px; height: 8px; border-radius: 50%; background: ${SEVERITY_COLORS[
                            sev
                          ] ?? "#888"}; flex-shrink: 0;"
                        ></span>
                        <span style="flex: 1; color: var(--text, #ccc);">${sev}</span>
                        <span
                          style="font-variant-numeric: tabular-nums; color: var(--text-muted, #888);"
                          >${count}</span
                        >
                      </div>
                    `,
                  )}
                </div>
              </div>
            `
          : nothing}
        ${complexityEntries.length > 0
          ? html`
              <div>
                <div
                  style="font-size: 0.75em; font-weight: 600; color: var(--text-muted, #888); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;"
                >
                  Complexity (open)
                </div>
                <div style="display: flex; flex-direction: column; gap: 3px;">
                  ${complexityEntries.map(
                    ([comp, count]) => html`
                      <div class="row" style="align-items: center; gap: 6px; font-size: 0.8em;">
                        <span style="flex: 1; color: var(--text, #ccc);"
                          >${comp.toUpperCase()}</span
                        >
                        <span
                          style="font-variant-numeric: tabular-nums; color: var(--text-muted, #888);"
                          >${count}</span
                        >
                      </div>
                    `,
                  )}
                </div>
              </div>
            `
          : nothing}
      </div>

      <!-- Velocity -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <div style="padding: 8px 10px; background: var(--surface-2, #1a1a1a); border-radius: 6px;">
          <div style="font-size: 1.1em; font-weight: 700; color: var(--status-ok, #22c55e);">
            ${ds.completedLast7d}
          </div>
          <div style="font-size: 0.7em; color: var(--text-muted, #888);">Completed (7d)</div>
        </div>
        <div style="padding: 8px 10px; background: var(--surface-2, #1a1a1a); border-radius: 6px;">
          <div style="font-size: 1.1em; font-weight: 700; color: var(--text, #ccc);">
            ${ds.completedLast30d}
          </div>
          <div style="font-size: 0.7em; color: var(--text-muted, #888);">Completed (30d)</div>
        </div>
      </div>

      <!-- Blocked / critical items -->
      ${ds.blockedCritical.length > 0
        ? html`
            <div style="margin-bottom: 12px;">
              <div
                style="font-size: 0.75em; font-weight: 600; color: var(--status-danger, #ef4444); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;"
              >
                ⚠ Attention Required
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${ds.blockedCritical.slice(0, 5).map(
                  (t) => html`
                    <div class="row" style="align-items: center; gap: 6px; font-size: 0.8em;">
                      <span
                        class="pill ${t.severity === "critical" ? "danger" : "warning"}"
                        style="font-size: 0.75em;"
                        >${t.severity}</span
                      >
                      <span
                        style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text, #ccc);"
                        >${t.title}</span
                      >
                    </div>
                  `,
                )}
                ${ds.blockedCritical.length > 5
                  ? html`<span style="font-size: 0.75em; color: var(--text-muted, #888);"
                      >+${ds.blockedCritical.length - 5} more</span
                    >`
                  : nothing}
              </div>
            </div>
          `
        : nothing}

      <!-- Action buttons -->
      <div class="row" style="gap: 8px; margin-top: 4px;">
        <button class="btn btn--sm btn--primary" @click=${onNavigateToBacklog}>
          Open Backlog →
        </button>
      </div>
    </div>
  `;
}

// ── Register form ─────────────────────────────────────────────────────────────

function renderRegisterForm(onRegister: (projectId: string, repoPath: string) => void) {
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (_registerProjectId.trim() && _registerRepoPath.trim()) {
      onRegister(_registerProjectId.trim(), _registerRepoPath.trim());
      _registerProjectId = "";
      _registerRepoPath = "";
      _registerFormVisible = false;
    }
  };

  return html`
    <form
      class="card"
      style="margin-bottom: 16px; background: var(--surface-2, #1e1e1e); padding: 12px;"
      @submit=${handleSubmit}
    >
      <div class="card-title" style="margin-bottom: 8px;">Register New Project</div>
      <div class="filters" style="gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
        <label class="field-inline">
          <span>Project ID</span>
          <input
            type="text"
            class="input"
            placeholder="my-project"
            .value=${_registerProjectId}
            @input=${(e: Event) => {
              _registerProjectId = (e.target as HTMLInputElement).value;
            }}
            required
          />
        </label>
        <label class="field-inline">
          <span>Repo Path</span>
          <input
            type="text"
            class="input"
            placeholder="/path/to/repo"
            .value=${_registerRepoPath}
            @input=${(e: Event) => {
              _registerRepoPath = (e.target as HTMLInputElement).value;
            }}
            required
          />
        </label>
      </div>
      <div class="row" style="gap: 8px;">
        <button type="submit" class="btn btn--sm btn--primary">Register</button>
        <button
          type="button"
          class="btn btn--sm"
          @click=${() => {
            _registerFormVisible = false;
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  `;
}

// ── Main render ───────────────────────────────────────────────────────────────

export function renderProjects(props: ProjectsProps) {
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; margin-bottom: 12px;">
        <div>
          <div class="card-title">Projects</div>
          <div class="card-sub">Multi-repo project registry</div>
        </div>
        <div class="row" style="gap: 8px;">
          <button
            class="btn btn--sm"
            @click=${() => {
              _registerFormVisible = !_registerFormVisible;
            }}
          >
            ${icons.plus ?? "+"} Register
          </button>
          <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      ${_registerFormVisible ? renderRegisterForm(props.onRegister) : nothing}
      ${props.error
        ? html`<div class="callout danger" style="margin-bottom: 12px;">${props.error}</div>`
        : nothing}
      ${props.loading && props.projects.length === 0
        ? html`<div class="page-empty"><p>Loading projects…</p></div>`
        : props.projects.length === 0
          ? html`
              <div class="page-empty">
                <p>No projects registered yet.</p>
                <p>Click "Register" to add your first project.</p>
              </div>
            `
          : html`
              <!-- Aggregated summary -->
              ${renderSummaryBar(props.projects)}

              <!-- Project cards grid -->
              <div
                style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px;"
              >
                ${props.projects.map((project) => {
                  const pid = project.projectId;
                  const isSelected = pid === props.selectedProjectId;
                  const isExpanded = pid === _expandedProjectId;
                  return renderProjectCard(
                    project,
                    isSelected,
                    isExpanded,
                    () => props.onSelectProject(pid),
                    () => {
                      _expandedProjectId = isExpanded ? null : pid;
                    },
                    () => props.onNavigateToBacklog(pid),
                  );
                })}
              </div>
            `}
    </section>
  `;
}
