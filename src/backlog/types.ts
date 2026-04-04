// Task severity, complexity, status
export type IssueSeverity = "critical" | "high" | "medium" | "low";
export type IssueComplexity = "xs" | "s" | "m" | "l" | "xl";
export type IssueStatus =
  | "open"
  | "approved"
  | "in_progress"
  | "blocked"
  | "done"
  | "rejected"
  // Legacy aliases kept for backward compatibility
  | "notStarted"
  | "inProgress"
  | "inReview"
  | "cancelled";

export type Issue = {
  issueId: string; // e.g. "TASK-001"
  title: string;
  description: string;
  status: IssueStatus;
  severity: IssueSeverity;
  complexity: IssueComplexity;
  labels: string[]; // files/areas this issue affects
  assignee: string | null; // dev, qa, reviewer, etc.
  // Project/batch grouping
  projectId: string | null;
  batchId: string | null;
  requiresApproval: number; // 0 or 1
  touchesJson: string | null; // JSON array of file paths
  // Source fields for external issue tracking
  sourceType: "internal" | "github" | "linear" | "jira";
  sourceExternalId: string | null;
  sourceExternalUrl: string | null;
  sourceSyncedAt: string | null;
  // Timestamps (stored as Unix ms integers in DB, but surface as number)
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  startedAt: number | null;
  closedAt: number | null;
  approvedAt: number | null;
};

export type IssueDependency = {
  issueId: string;
  dependsOn: string;
};

// Backward-compatible aliases
export type BacklogSeverity = IssueSeverity;
export type BacklogComplexity = IssueComplexity;
export type BacklogStatus = IssueStatus;
export type BacklogTask = Issue;
export type BacklogDependency = IssueDependency;

export type ExecutionRun = {
  id: number;
  taskId: string;
  agentRole: string;
  runtime: string; // subagent, acp, cli
  sessionKey: string | null;
  label: string | null; // OpenClaw task label
  status: string;
  startedAt: number; // Unix ms
  endedAt: number | null;
  error: string | null;
  commitHash: string | null;
};

export type SelfImproveEntry = {
  id: number;
  taskId: string | null;
  agentRole: string;
  category: "lesson" | "pattern" | "anti_pattern" | "process";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  tags: string | null;
  scope: "project" | "global";
  applied: boolean;
  createdAt: number; // Unix ms
};

export type Project = {
  projectId: string;
  repoPath: string;
  displayName: string | null;
  repoUrl: string | null;
  sqlitePath: string | null;
  lastSeenAt: number | null; // Unix ms
  configJson: string | null; // JSON object stored as string
  registeredAt: number; // Unix ms
};
