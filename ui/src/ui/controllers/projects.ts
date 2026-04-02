import type { AppViewState } from "../app-view-state.js";

export type ProjectsState = {
  client: AppViewState["client"];
  connected: boolean;
  projectsLoading: boolean;
  projectsList: Array<{
    projectId: string;
    repoPaths: string[];
    taskSummary?: Record<string, number>;
  }>;
  projectsError: string | null;
};

export async function loadProjects(state: ProjectsState) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.projectsLoading) {
    return;
  }
  state.projectsLoading = true;
  state.projectsError = null;
  try {
    const result = await state.client.request<{
      projects?: Array<{
        projectId: string;
        repoPaths: string[];
        taskSummary?: Record<string, number>;
      }>;
    }>("projects.list", {});
    state.projectsList = result?.projects ?? [];
  } catch (err) {
    state.projectsError = err instanceof Error ? err.message : String(err);
  } finally {
    state.projectsLoading = false;
  }
}

export async function registerProject(state: ProjectsState, projectId: string, repoPath: string) {
  if (!state.client || !state.connected) {
    return;
  }
  state.projectsError = null;
  try {
    await state.client.request("projects.register", { projectId, repoPath });
    await loadProjects(state);
  } catch (err) {
    state.projectsError = err instanceof Error ? err.message : String(err);
  }
}
