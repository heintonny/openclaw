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
    expect(dbInstance.hasTable("backlog")).toBe(true);
    expect(dbInstance.hasTable("dependencies")).toBe(true);
    expect(dbInstance.hasTable("execution_runs")).toBe(true);
    expect(dbInstance.hasTable("selfimprove")).toBe(true);
  });

  it("performs CRUD operations for backlog tasks", () => {
    const sqlitePath = resolveProjectSqlitePath(tempDir);
    initProjectDirectory(tempDir);
    dbInstance = openProjectDatabase(sqlitePath);

    const task: BacklogTask = {
      issueId: "TASK-001",
      title: "First task",
      description: "Do something",
      status: "notStarted",
      severity: "medium",
      complexity: "m",
      labels: ["src/index.ts"],
      assignee: "dev",
      sourceType: "internal",
      sourceExternalId: null,
      sourceExternalUrl: null,
      sourceSyncedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    dbInstance.addBacklogTask(task);

    const fetched = dbInstance.getIssue("TASK-001");
    expect(fetched).toMatchObject(task);

    const list = dbInstance.listBacklogTasks();
    expect(list).toHaveLength(1);
    expect(list[0].issueId).toBe("TASK-001");

    task.status = "inProgress";
    task.title = "Updated task";
    dbInstance.updateBacklogTask(task);

    const updated = dbInstance.getBacklogTask("TASK-001");
    expect(updated?.status).toBe("inProgress");
    expect(updated?.title).toBe("Updated task");
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
      createdAt: new Date().toISOString(),
    });

    const list = dbInstance.listSelfImprove();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Use proper naming");
    expect(list[0].applied).toBe(false);
  });
});
