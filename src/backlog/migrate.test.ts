import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initProjectDirectory, openProjectDatabase, resolveProjectSqlitePath } from "./db.js";
import { migrateFromTasksJson } from "./migrate.js";

describe("backlog/migrate", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "openclaw-migrate-test-"));
  });

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function writeTasksJson(filePath: string, data: unknown) {
    writeFileSync(filePath, JSON.stringify(data), "utf-8");
  }

  it("imports tasks from array-format TASKS.json", () => {
    const tasksJson = [
      {
        id: "UI-53",
        title: "Design system alignment",
        description: "Align all components with OpenClaw design tokens",
        status: "done",
        severity: "high",
        complexity: "l",
        touches: ["src/styles/", "src/components/"],
        assignee: "dev",
      },
      {
        id: "UI-54",
        title: "Component refactor",
        description: "Refactor buttons",
        status: "in_progress",
        severity: "medium",
        complexity: "m",
      },
    ];

    const jsonPath = path.join(tempDir, "TASKS.json");
    writeTasksJson(jsonPath, tasksJson);

    const result = migrateFromTasksJson(tempDir, jsonPath);

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);

    // Verify tasks in DB
    const dbPath = resolveProjectSqlitePath(tempDir);
    const db = openProjectDatabase(dbPath);
    try {
      const task1 = db.getBacklogTask("UI-53");
      expect(task1).toBeDefined();
      expect(task1?.title).toBe("Design system alignment");
      expect(task1?.status).toBe("done");
      expect(task1?.severity).toBe("high");
      expect(task1?.complexity).toBe("l");
      expect(task1?.touches).toEqual(["src/styles/", "src/components/"]);
      expect(task1?.agentRole).toBe("dev");
      expect(task1?.completedAt).not.toBeNull();

      const task2 = db.getBacklogTask("UI-54");
      expect(task2).toBeDefined();
      expect(task2?.status).toBe("inProgress");
      expect(task2?.completedAt).toBeNull();
    } finally {
      db.close();
    }
  });

  it("imports tasks from object-with-tasks-array format", () => {
    const data = {
      tasks: [
        {
          id: "BE-01",
          title: "Setup API",
          status: "open",
        },
      ],
    };

    const jsonPath = path.join(tempDir, "TASKS.json");
    writeTasksJson(jsonPath, data);

    const result = migrateFromTasksJson(tempDir, jsonPath);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it("imports depends_on as dependencies", () => {
    const tasksJson = [
      { id: "A-01", title: "Task A", status: "done" },
      { id: "A-02", title: "Task B", status: "open", depends_on: ["A-01"] },
    ];

    const jsonPath = path.join(tempDir, "TASKS.json");
    writeTasksJson(jsonPath, tasksJson);

    migrateFromTasksJson(tempDir, jsonPath);

    const dbPath = resolveProjectSqlitePath(tempDir);
    const db = openProjectDatabase(dbPath);
    try {
      const deps = db.listDependencies("A-02");
      expect(deps).toHaveLength(1);
      expect(deps[0].taskId).toBe("A-02");
      expect(deps[0].dependsOn).toBe("A-01");
    } finally {
      db.close();
    }
  });

  it("handles blocks as reverse dependencies", () => {
    // If A-01 blocks A-03, then A-03 depends on A-01
    const tasksJson = [
      { id: "A-01", title: "Task A", status: "done", blocks: ["A-03"] },
      { id: "A-03", title: "Task C", status: "open" },
    ];

    const jsonPath = path.join(tempDir, "TASKS.json");
    writeTasksJson(jsonPath, tasksJson);

    migrateFromTasksJson(tempDir, jsonPath);

    const dbPath = resolveProjectSqlitePath(tempDir);
    const db = openProjectDatabase(dbPath);
    try {
      const deps = db.listDependencies("A-03");
      expect(deps).toHaveLength(1);
      expect(deps[0].taskId).toBe("A-03");
      expect(deps[0].dependsOn).toBe("A-01");
    } finally {
      db.close();
    }
  });

  it("skips duplicate task IDs on re-run", () => {
    const tasksJson = [{ id: "DUP-01", title: "First task", status: "open" }];

    const jsonPath = path.join(tempDir, "TASKS.json");
    writeTasksJson(jsonPath, tasksJson);

    const result1 = migrateFromTasksJson(tempDir, jsonPath);
    expect(result1.imported).toBe(1);
    expect(result1.skipped).toBe(0);

    // Run again — should skip
    const result2 = migrateFromTasksJson(tempDir, jsonPath);
    expect(result2.imported).toBe(0);
    expect(result2.skipped).toBe(1);
  });

  it("maps all v1 status names to v2", () => {
    const tasksJson = [
      { id: "S-01", title: "open", status: "open" },
      { id: "S-02", title: "not_started", status: "not_started" },
      { id: "S-03", title: "notStarted", status: "notStarted" },
      { id: "S-04", title: "in_progress", status: "in_progress" },
      { id: "S-05", title: "inProgress", status: "inProgress" },
      { id: "S-06", title: "in_review", status: "in_review" },
      { id: "S-07", title: "inReview", status: "inReview" },
      { id: "S-08", title: "done", status: "done" },
      { id: "S-09", title: "complete", status: "complete" },
      { id: "S-10", title: "completed", status: "completed" },
      { id: "S-11", title: "blocked", status: "blocked" },
      { id: "S-12", title: "cancelled", status: "cancelled" },
      { id: "S-13", title: "canceled", status: "canceled" },
      { id: "S-14", title: "unknown", status: "unknown" },
    ];

    const jsonPath = path.join(tempDir, "TASKS.json");
    writeTasksJson(jsonPath, tasksJson);

    migrateFromTasksJson(tempDir, jsonPath);

    const dbPath = resolveProjectSqlitePath(tempDir);
    const db = openProjectDatabase(dbPath);
    try {
      expect(db.getBacklogTask("S-01")?.status).toBe("notStarted");
      expect(db.getBacklogTask("S-02")?.status).toBe("notStarted");
      expect(db.getBacklogTask("S-03")?.status).toBe("notStarted");
      expect(db.getBacklogTask("S-04")?.status).toBe("inProgress");
      expect(db.getBacklogTask("S-05")?.status).toBe("inProgress");
      expect(db.getBacklogTask("S-06")?.status).toBe("inReview");
      expect(db.getBacklogTask("S-07")?.status).toBe("inReview");
      expect(db.getBacklogTask("S-08")?.status).toBe("done");
      expect(db.getBacklogTask("S-09")?.status).toBe("done");
      expect(db.getBacklogTask("S-10")?.status).toBe("done");
      expect(db.getBacklogTask("S-11")?.status).toBe("blocked");
      expect(db.getBacklogTask("S-12")?.status).toBe("cancelled");
      expect(db.getBacklogTask("S-13")?.status).toBe("cancelled");
      expect(db.getBacklogTask("S-14")?.status).toBe("notStarted"); // unknown → default
    } finally {
      db.close();
    }
  });

  it("uses defaults for missing fields", () => {
    const tasksJson = [{ id: "MIN-01", title: "Minimal task" }];

    const jsonPath = path.join(tempDir, "TASKS.json");
    writeTasksJson(jsonPath, tasksJson);

    migrateFromTasksJson(tempDir, jsonPath);

    const dbPath = resolveProjectSqlitePath(tempDir);
    const db = openProjectDatabase(dbPath);
    try {
      const task = db.getBacklogTask("MIN-01");
      expect(task).toBeDefined();
      expect(task?.status).toBe("notStarted");
      expect(task?.severity).toBe("medium");
      expect(task?.complexity).toBe("m");
      expect(task?.description).toBe("");
      expect(task?.touches).toEqual([]);
      expect(task?.agentRole).toBeNull();
    } finally {
      db.close();
    }
  });

  it("throws when TASKS.json not found", () => {
    expect(() => {
      migrateFromTasksJson(tempDir, path.join(tempDir, "nonexistent.json"));
    }).toThrow("No TASKS.json found");
  });

  it("throws for invalid JSON format (not array or object-with-tasks)", () => {
    const jsonPath = path.join(tempDir, "TASKS.json");
    writeTasksJson(jsonPath, { foo: "bar" });

    // Init project dir so initProjectDirectory won't fail
    initProjectDirectory(tempDir);

    expect(() => {
      migrateFromTasksJson(tempDir, jsonPath);
    }).toThrow("TASKS.json must be an array");
  });

  it("auto-detects TASKS.json at .openclaw/TASKS.json", () => {
    const dotOpenclaw = path.join(tempDir, ".openclaw");
    initProjectDirectory(tempDir);

    const jsonPath = path.join(dotOpenclaw, "TASKS.json");
    writeTasksJson(jsonPath, [{ id: "AUTO-01", title: "Auto detected" }]);

    const result = migrateFromTasksJson(tempDir);
    expect(result.imported).toBe(1);
  });

  it("auto-detects TASKS.json at root TASKS.json", () => {
    const jsonPath = path.join(tempDir, "TASKS.json");
    writeTasksJson(jsonPath, [{ id: "ROOT-01", title: "Root detected" }]);

    const result = migrateFromTasksJson(tempDir);
    expect(result.imported).toBe(1);
  });

  it("sets completedAt for done/complete/completed status", () => {
    const tasksJson = [
      { id: "C-01", title: "done task", status: "done" },
      { id: "C-02", title: "complete task", status: "complete" },
      { id: "C-03", title: "completed task", status: "completed" },
      { id: "C-04", title: "active task", status: "in_progress" },
    ];

    const jsonPath = path.join(tempDir, "TASKS.json");
    writeTasksJson(jsonPath, tasksJson);

    migrateFromTasksJson(tempDir, jsonPath);

    const dbPath = resolveProjectSqlitePath(tempDir);
    const db = openProjectDatabase(dbPath);
    try {
      expect(db.getBacklogTask("C-01")?.completedAt).not.toBeNull();
      expect(db.getBacklogTask("C-02")?.completedAt).not.toBeNull();
      expect(db.getBacklogTask("C-03")?.completedAt).not.toBeNull();
      expect(db.getBacklogTask("C-04")?.completedAt).toBeNull();
    } finally {
      db.close();
    }
  });
});
