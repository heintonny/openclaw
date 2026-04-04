// Task severity, complexity, status
export type IssueSeverity = "critical" | "high" | "medium" | "low";
export type IssueComplexity = "xs" | "s" | "m" | "l" | "xl";
export type IssueStatus =
  | "notStarted"
  | "inProgress"
  | "inReview"
  | "done"
  | "blocked"
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
  // Source fields for external issue tracking
  sourceType: "internal" | "github" | "linear" | "jira";
  sourceExternalId: string | null;
  sourceExternalUrl: string | null;
  sourceSyncedAt: string | null;
  createdAt: string; // ISO datetime
  updatedAt: string;
  completedAt: string | null;
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
  startedAt: string;
  endedAt: string | null;
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
  createdAt: string;
};
