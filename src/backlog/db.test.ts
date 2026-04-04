import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initProjectDirectory, openProjectDatabase, resolveProjectSqlitePath } from "./db.js";
import type { BacklogTask } from "./types.js";

describe("backlog/db", () => {
  let tempDir: string;
  let dbInstance: ReturnType<typeof openProjectDatabase>;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "openclaw-backlog-db-test-"));
  });

  afterEach(() => {
    if (dbInstance) {
      dbInstance.db.close();
    }
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("initProjectDirectory creates the .openclaw directory and files", () => {
    const sqlitePath = initProjectDirectory(tempDir);
    expect(sqlitePath).toBe(resolveProjectSqlitePath(tempDir));
    expect(existsSync(path.join(tempDir, ".openclaw"))).toBe(true);
    expect(existsSync(path.join(tempDir, ".openclaw", "PROJECT.md"))).toBe(true);
  });

  it("creates tables and enables WAL mode", () => {
    const sqlitePath = resolveProjectSqlitePath(tempDir);
    initProjectDirectory(tempDir);
    dbInstance = openProjectDatabase(sqlitePath);

    expect(dbInstance.isWalMode()).toBe(true);
    expect(dbInstance.hasTable("issues")).toBe(true);
    expect(dbInstance.hasTable("dependencies")).toBe(true);
    expect(dbInstance.hasTable("execution_runs")).toBe(true);
    expect(dbInstance.hasTable("selfimprove")).toBe(true);
  });

  it("performs CRUD operations for backlog tasks", () => {
    const sqlitePath = resolveProjectSqlitePath(tempDir);
    initProjectDirectory(tempDir);
    dbInstance = openProjectDatabase(sqlitePath);

    const now = Date.now();
    const task: BacklogTask = {
      issueId: "TASK-001",
      title: "First task",
      description: "Do something",
      status: "open",
      severity: "medium",
      complexity: "m",
      labels: ["src/index.ts"],
      assignee: "dev",
      projectId: null,
      batchId: null,
      requiresApproval: 0,
      touchesJson: null,
      sourceType: "internal",
      sourceExternalId: null,
      sourceExternalUrl: null,
      sourceSyncedAt: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      startedAt: null,
      closedAt: null,
      approvedAt: null,
    };

    dbInstance.addBacklogTask(task);

    const fetched = dbInstance.getIssue("TASK-001");
    expect(fetched).toMatchObject({
      issueId: "TASK-001",
      title: "First task",
      status: "open",
    });

    const list = dbInstance.listBacklogTasks();
    expect(list).toHaveLength(1);
    expect(list[0].issueId).toBe("TASK-001");

    task.status = "in_progress";
    task.title = "Updated task";
    dbInstance.updateBacklogTask(task);

    const updated = dbInstance.getBacklogTask("TASK-001");
    expect(updated?.status).toBe("in_progress");
    expect(updated?.title).toBe("Updated task");
  });

  it("stores and retrieves project_id and requires_approval", () => {
    const sqlitePath = resolveProjectSqlitePath(tempDir);
    initProjectDirectory(tempDir);
    dbInstance = openProjectDatabase(sqlitePath);

    const now = Date.now();
    const task: BacklogTask = {
      issueId: "TASK-002",
      title: "Project task",
      description: "Task with project",
      status: "open",
      severity: "high",
      complexity: "l",
      labels: [],
      assignee: null,
      projectId: "my-project",
      batchId: "batch-001",
      requiresApproval: 1,
      touchesJson: '["src/db.ts","src/types.ts"]',
      sourceType: "internal",
      sourceExternalId: null,
      sourceExternalUrl: null,
      sourceSyncedAt: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      startedAt: null,
      closedAt: null,
      approvedAt: null,
    };

    dbInstance.addIssue(task);
    const fetched = dbInstance.getIssue("TASK-002");
    expect(fetched?.projectId).toBe("my-project");
    expect(fetched?.batchId).toBe("batch-001");
    expect(fetched?.requiresApproval).toBe(1);
    expect(fetched?.touchesJson).toBe('["src/db.ts","src/types.ts"]');
  });

  it("supports new status values: approved, in_progress, rejected", () => {
    const sqlitePath = resolveProjectSqlitePath(tempDir);
    initProjectDirectory(tempDir);
    dbInstance = openProjectDatabase(sqlitePath);

    dbInstance.addTask({ issueId: "TASK-003", title: "Approval test" });
    dbInstance.updateTask("TASK-003", { status: "approved" });
    const approved = dbInstance.getIssue("TASK-003");
    expect(approved?.status).toBe("approved");
    expect(approved?.approvedAt).toBeTypeOf("number");

    dbInstance.updateTask("TASK-003", { status: "in_progress" });
    const inProgress = dbInstance.getIssue("TASK-003");
    expect(inProgress?.status).toBe("in_progress");
    expect(inProgress?.startedAt).toBeTypeOf("number");
  });

  it("listIssuesByProject filters correctly", () => {
    const sqlitePath = resolveProjectSqlitePath(tempDir);
    initProjectDirectory(tempDir);
    dbInstance = openProjectDatabase(sqlitePath);

    dbInstance.addTask({ issueId: "A-001", title: "Project A task 1", projectId: "proj-a" });
    dbInstance.addTask({ issueId: "A-002", title: "Project A task 2", projectId: "proj-a" });
    dbInstance.addTask({ issueId: "B-001", title: "Project B task", projectId: "proj-b" });

    const projA = dbInstance.listIssuesByProject("proj-a");
    expect(projA).toHaveLength(2);
    expect(projA.every((t) => t.projectId === "proj-a")).toBe(true);

    const projB = dbInstance.listIssuesByProject("proj-b");
    expect(projB).toHaveLength(1);
  });

  it("timestamps are stored as Unix ms integers", () => {
    const sqlitePath = resolveProjectSqlitePath(tempDir);
    initProjectDirectory(tempDir);
    dbInstance = openProjectDatabase(sqlitePath);

    const before = Date.now();
    dbInstance.addTask({ issueId: "TS-001", title: "Timestamp test" });
    const after = Date.now();

    const issue = dbInstance.getIssue("TS-001");
    expect(issue?.createdAt).toBeTypeOf("number");
    expect(issue?.createdAt).toBeGreaterThanOrEqual(before);
    expect(issue?.createdAt).toBeLessThanOrEqual(after);
  });

  it("manages dependencies", () => {
    const sqlitePath = resolveProjectSqlitePath(tempDir);
    initProjectDirectory(tempDir);
    dbInstance = openProjectDatabase(sqlitePath);

    dbInstance.addDependency({ issueId: "TASK-002", dependsOn: "TASK-001" });
    dbInstance.addDependency({ issueId: "TASK-002", dependsOn: "TASK-003" });

    const deps = dbInstance.listDependencies("TASK-002");
    expect(deps).toHaveLength(2);
    expect(deps.map((d) => d.dependsOn).toSorted()).toEqual(["TASK-001", "TASK-003"]);

    dbInstance.removeDependency({ issueId: "TASK-002", dependsOn: "TASK-001" });

    const afterRemove = dbInstance.listDependencies("TASK-002");
    expect(afterRemove).toHaveLength(1);
    expect(afterRemove[0].dependsOn).toBe("TASK-003");
  });

  it("adds and lists selfimprove entries", () => {
    const sqlitePath = resolveProjectSqlitePath(tempDir);
    initProjectDirectory(tempDir);
    dbInstance = openProjectDatabase(sqlitePath);

    const now = Date.now();
    dbInstance.addSelfImprove({
      taskId: "TASK-001",
      agentRole: "reviewer",
      category: "lesson",
      severity: "info",
      title: "Use proper naming",
      description: "Always use camelCase",
      tags: "naming,style",
      scope: "project",
      applied: false,
      createdAt: now,
    });

    const list = dbInstance.listSelfImprove();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Use proper naming");
    expect(list[0].applied).toBe(false);
    expect(list[0].createdAt).toBeTypeOf("number");
  });
});
