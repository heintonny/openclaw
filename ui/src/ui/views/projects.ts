import { html, nothing } from "lit";
import { icons } from "../icons.ts";

export type ProjectEntry = {
  projectId: string;
  repoPaths: string[];
  taskSummary?: Record<string, number>;
};

export type ProjectsProps = {
  loading: boolean;
  projects: ProjectEntry[];
  error: string | null;
  onRefresh: () => void;
  onRegister: (projectId: string, repoPath: string) => void;
  onSelectProject: (projectId: string) => void;
};

let _registerFormVisible = false;
let _registerProjectId = "";
let _registerRepoPath = "";

export function renderProjects(props: ProjectsProps) {
  const handleRegisterSubmit = (e: Event) => {
    e.preventDefault();
    if (_registerProjectId.trim() && _registerRepoPath.trim()) {
      props.onRegister(_registerProjectId.trim(), _registerRepoPath.trim());
      _registerProjectId = "";
      _registerRepoPath = "";
      _registerFormVisible = false;
    }
  };

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
            ${icons.plus ?? "+"} Register Project
          </button>
          <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      ${_registerFormVisible
        ? html`
            <form
              class="card"
              style="margin-bottom: 16px; background: var(--surface-2, #1e1e1e); padding: 12px;"
              @submit=${handleRegisterSubmit}
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
          `
        : nothing}
      ${props.error
        ? html`<div class="callout danger" style="margin-bottom: 12px;">${props.error}</div>`
        : nothing}
      ${props.loading && props.projects.length === 0
        ? html`<div class="page-empty"><p>Loading projects…</p></div>`
        : props.projects.length === 0
          ? html`
              <div class="page-empty">
                <p>No projects registered yet.</p>
                <p>Click "Register Project" to add your first project.</p>
              </div>
            `
          : html`
              <div
                class="instances-grid"
                style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;"
              >
                ${props.projects.map(
                  (project) => html`
                    <div
                      class="card card--hoverable"
                      style="cursor: pointer; padding: 12px;"
                      @click=${() => props.onSelectProject(project.projectId ?? project.id)}
                      role="button"
                      tabindex="0"
                      @keydown=${(e: KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          props.onSelectProject(project.projectId ?? project.id);
                        }
                      }}
                    >
                      <div class="row" style="align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span class="nav-item__icon" aria-hidden="true">${icons.folder}</span>
                        <strong style="font-size: 0.95em;">${project.projectId ?? project.id}</strong>
                      </div>
                      <div
                        style="font-size: 0.8em; color: var(--text-muted, #888); margin-bottom: 8px;"
                      >
                        ${project.repoPaths.length === 0
                          ? html`<em>No repos</em>`
                          : project.repoPaths.map(
                              (p) =>
                                html`<div
                                  style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                                  title=${p}
                                >
                                  ${p}
                                </div>`,
                            )}
                      </div>
                      ${project.taskSummary && Object.keys(project.taskSummary).length > 0
                        ? html`
                            <div class="row" style="gap: 6px; flex-wrap: wrap; font-size: 0.75em;">
                              ${Object.entries(project.taskSummary).map(
                                ([status, count]) =>
                                  html`<span
                                    class="pill ${status === "done"
                                      ? "success"
                                      : status === "failed"
                                        ? "danger"
                                        : ""}"
                                    >${count} ${status}</span
                                  >`,
                              )}
                            </div>
                          `
                        : nothing}
                    </div>
                  `,
                )}
              </div>
            `}
    </section>
  `;
}
