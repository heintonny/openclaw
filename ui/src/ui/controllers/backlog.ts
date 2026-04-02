import type { AppViewState } from "../app-view-state.js";

export type BacklogState = {
  client: AppViewState["client"];
  connected: boolean;
  projectsSelectedId: string | null;
  backlogLoading: boolean;
  backlogTasks: Array<{
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
  }>;
  backlogError: string | null;
  backlogBatchPlan: Array<{ taskId: string; title: string; severity: string }>;
};

export async function loadBacklog(state: BacklogState) {
  if (!state.projectsSelectedId || !state.client || !state.connected) {
    return;
  }
  if (state.backlogLoading) {
    return;
  }
  state.backlogLoading = true;
  state.backlogError = null;
  try {
    const result = await state.client.request<{
      tasks?: Array<{
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
      }>;
    }>("backlog.list", { projectId: state.projectsSelectedId });
    state.backlogTasks = result?.tasks ?? [];
  } catch (err) {
    state.backlogError = err instanceof Error ? err.message : String(err);
  } finally {
    state.backlogLoading = false;
  }
}

export async function addBacklogTask(
  state: BacklogState,
  task: { title: string; description?: string; severity?: string; complexity?: string },
) {
  if (!state.projectsSelectedId || !state.client || !state.connected) {
    return;
  }
  state.backlogError = null;
  try {
    await state.client.request("backlog.add", {
      projectId: state.projectsSelectedId,
      ...task,
    });
    await loadBacklog(state);
  } catch (err) {
    state.backlogError = err instanceof Error ? err.message : String(err);
  }
}

export async function updateBacklogTask(
  state: BacklogState,
  taskId: string,
  updates: Record<string, string>,
) {
  if (!state.projectsSelectedId || !state.client || !state.connected) {
    return;
  }
  state.backlogError = null;
  try {
    await state.client.request("backlog.update", {
      projectId: state.projectsSelectedId,
      taskId,
      ...updates,
    });
    await loadBacklog(state);
  } catch (err) {
    state.backlogError = err instanceof Error ? err.message : String(err);
  }
}

export async function planBatch(state: BacklogState) {
  if (!state.projectsSelectedId || !state.client || !state.connected) {
    return;
  }
  state.backlogError = null;
  try {
    const result = await state.client.request<{
      tasks?: Array<{ taskId: string; title: string; severity: string }>;
    }>("backlog.batch.plan", {
      projectId: state.projectsSelectedId,
    });
    state.backlogBatchPlan = result?.tasks ?? [];
  } catch (err) {
    state.backlogError = err instanceof Error ? err.message : String(err);
  }
}
