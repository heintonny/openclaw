// Task severity, complexity, status
export type BacklogSeverity = "critical" | "high" | "medium" | "low";
export type BacklogComplexity = "xs" | "s" | "m" | "l" | "xl";
export type BacklogStatus =
  | "notStarted"
  | "inProgress"
  | "inReview"
  | "done"
  | "blocked"
  | "cancelled";

export type BacklogTask = {
  taskId: string; // e.g. "TASK-001"
  title: string;
  description: string;
  status: BacklogStatus;
  severity: BacklogSeverity;
  complexity: BacklogComplexity;
  touches: string[]; // files this task affects
  agentRole: string | null; // dev, qa, reviewer, etc.
  createdAt: string; // ISO datetime
  updatedAt: string;
  completedAt: string | null;
};

export type BacklogDependency = {
  taskId: string;
  dependsOn: string;
};

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
