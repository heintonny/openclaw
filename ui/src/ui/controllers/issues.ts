import type { AppViewState } from "../app-view-state.js";

export type IssueBase = {
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
  sourceType?: string;
  sourceExternalId?: string | null;
  sourceExternalUrl?: string | null;
  sourceSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type IssueWithProject = IssueBase & { projectId: string };

export type IssuesState = {
  client: AppViewState["client"];
  connected: boolean;
  projectsSelectedId: string | null;
  issuesLoading: boolean;
  issuesList: IssueWithProject[];
  issuesError: string | null;
  issuesBatchPlan: Array<{ taskId: string; title: string; severity: string }>;
  issuesProjectFilter: string | null;
};

// Backward-compatible aliases
export type BacklogTaskBase = IssueBase;
export type BacklogTaskWithProject = IssueWithProject;
export type BacklogState = IssuesState;

export async function loadIssues(state: IssuesState) {
  if (!state.projectsSelectedId || !state.client || !state.connected) {
    return;
  }
  if (state.issuesLoading) {
    return;
  }
  state.issuesLoading = true;
  state.issuesError = null;
  try {
    const result = await state.client.request<{
      tasks?: IssueBase[];
    }>("issues.list", { projectId: state.projectsSelectedId });
    state.issuesList = (result?.tasks ?? []).map((t) => ({
      ...t,
      projectId: state.projectsSelectedId!,
    }));
  } catch (err) {
    state.issuesError = err instanceof Error ? err.message : String(err);
  } finally {
    state.issuesLoading = false;
  }
}

export async function loadAllIssues(state: IssuesState) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.issuesLoading) {
    return;
  }
  state.issuesLoading = true;
  state.issuesError = null;
  try {
    const result = await state.client.request<{
      tasks?: IssueWithProject[];
    }>("issues.listAll");
    state.issuesList = result?.tasks ?? [];
  } catch (err) {
    state.issuesError = err instanceof Error ? err.message : String(err);
  } finally {
    state.issuesLoading = false;
  }
}

export async function addIssue(
  state: IssuesState,
  task: { title: string; description?: string; severity?: string; complexity?: string },
  projectId?: string,
) {
  const pid = projectId || state.projectsSelectedId;
  if (!pid || !state.client || !state.connected) {
    return;
  }
  state.issuesError = null;
  try {
    await state.client.request("issues.add", {
      projectId: pid,
      ...task,
    });
    await loadAllIssues(state);
  } catch (err) {
    state.issuesError = err instanceof Error ? err.message : String(err);
  }
}

export async function updateIssue(
  state: IssuesState,
  taskId: string,
  updates: Record<string, string>,
  projectId?: string,
) {
  const pid = projectId || state.projectsSelectedId;
  if (!pid || !state.client || !state.connected) {
    return;
  }
  state.issuesError = null;
  try {
    await state.client.request("issues.update", {
      projectId: pid,
      taskId,
      ...updates,
    });
    await loadAllIssues(state);
  } catch (err) {
    state.issuesError = err instanceof Error ? err.message : String(err);
  }
}

export async function planIssueBatch(state: IssuesState, projectId?: string) {
  const pid = projectId || state.projectsSelectedId;
  if (!pid || !state.client || !state.connected) {
    return;
  }
  state.issuesError = null;
  try {
    const result = await state.client.request<{
      tasks?: Array<{ taskId: string; title: string; severity: string }>;
    }>("issues.batch.plan", {
      projectId: pid,
    });
    state.issuesBatchPlan = result?.tasks ?? [];
  } catch (err) {
    state.issuesError = err instanceof Error ? err.message : String(err);
  }
}

// Backward-compatible aliases
export const loadBacklog = loadIssues;
export const loadAllBacklog = loadAllIssues;
export const addBacklogTask = addIssue;
export const updateBacklogTask = updateIssue;
export const planBatch = planIssueBatch;
