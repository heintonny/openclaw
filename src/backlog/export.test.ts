import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportBacklog, exportSelfImprove } from "./export.js";
import type { BacklogTask, SelfImproveEntry } from "./types.js";

describe("backlog/export", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "openclaw-export-test-"));
  });

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("exportBacklog", () => {
    it("creates backlog.md in .openclaw/export/", () => {
      const tasks: BacklogTask[] = [
        {
          taskId: "TASK-001",
          title: "Fix login bug",
          description: "Users cannot log in with SSO",
          status: "inProgress",
          severity: "critical",
          complexity: "m",
          touches: ["src/auth.ts", "src/login.ts"],
          agentRole: "dev",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
          completedAt: null,
        },
        {
          taskId: "TASK-002",
          title: "Write tests",
          description: "",
          status: "notStarted",
          severity: "medium",
          complexity: "s",
          touches: [],
          agentRole: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          completedAt: null,
        },
      ];

      const deps = [{ taskId: "TASK-002", dependsOn: "TASK-001" }];

      const backlogPath = exportBacklog(tempDir, tasks, deps);

      expect(backlogPath).toBe(path.join(tempDir, ".openclaw", "export", "backlog.md"));
      expect(existsSync(backlogPath)).toBe(true);

      const content = readFileSync(backlogPath, "utf-8");
      expect(content).toContain("# Backlog");
      expect(content).toContain("do not edit manually");
      expect(content).toContain("## Summary");
      expect(content).toContain("| inProgress | 1 |");
      expect(content).toContain("| notStarted | 1 |");
      expect(content).toContain("| **Total** | **2** |");
    });

    it("groups tasks by status in correct order", () => {
      const tasks: BacklogTask[] = [
        {
          taskId: "TASK-003",
          title: "Done task",
          description: "A completed task",
          status: "done",
          severity: "low",
          complexity: "xs",
          touches: [],
          agentRole: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          completedAt: "2024-01-02T00:00:00.000Z",
        },
        {
          taskId: "TASK-004",
          title: "In progress task",
          description: "",
          status: "inProgress",
          severity: "high",
          complexity: "l",
          touches: ["src/main.ts"],
          agentRole: "dev",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          completedAt: null,
        },
      ];

      const backlogPath = exportBacklog(tempDir, tasks, []);
      const content = readFileSync(backlogPath, "utf-8");

      // inProgress should appear before done
      const inProgressIdx = content.indexOf("## inProgress");
      const doneIdx = content.indexOf("## done");
      expect(inProgressIdx).toBeLessThan(doneIdx);
    });

    it("includes task details: severity, complexity, agent, deps, touches", () => {
      const tasks: BacklogTask[] = [
        {
          taskId: "TASK-010",
          title: "Complex feature",
          description: "A detailed description",
          status: "blocked",
          severity: "high",
          complexity: "xl",
          touches: ["src/feature.ts", "src/utils.ts"],
          agentRole: "qa",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          completedAt: null,
        },
      ];

      const deps = [{ taskId: "TASK-010", dependsOn: "TASK-005" }];

      const backlogPath = exportBacklog(tempDir, tasks, deps);
      const content = readFileSync(backlogPath, "utf-8");

      expect(content).toContain("### TASK-010: Complex feature");
      expect(content).toContain("**Severity:** high | **Complexity:** xl");
      expect(content).toContain("**Agent:** qa");
      expect(content).toContain("**Depends on:** TASK-005");
      expect(content).toContain("**Touches:** src/feature.ts, src/utils.ts");
      expect(content).toContain("A detailed description");
    });

    it("handles empty task list", () => {
      const backlogPath = exportBacklog(tempDir, [], []);
      const content = readFileSync(backlogPath, "utf-8");

      expect(content).toContain("# Backlog");
      expect(content).toContain("| **Total** | **0** |");
    });

    it("creates export directory if it does not exist", () => {
      const exportDir = path.join(tempDir, ".openclaw", "export");
      expect(existsSync(exportDir)).toBe(false);

      exportBacklog(tempDir, [], []);

      expect(existsSync(exportDir)).toBe(true);
    });
  });

  describe("exportSelfImprove", () => {
    it("creates selfimprove.md in .openclaw/export/", () => {
      const entries: SelfImproveEntry[] = [
        {
          id: 1,
          taskId: "TASK-001",
          agentRole: "dev",
          category: "anti_pattern",
          severity: "warning",
          title: "Avoid blocking calls",
          description: "Use async/await instead of sync methods",
          tags: "performance,async",
          scope: "project",
          applied: false,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: 2,
          taskId: null,
          agentRole: "qa",
          category: "pattern",
          severity: "info",
          title: "Test with temp directories",
          description: "Always use mkdtempSync for test isolation",
          tags: null,
          scope: "global",
          applied: true,
          createdAt: "2024-01-02T00:00:00.000Z",
        },
      ];

      const siPath = exportSelfImprove(tempDir, entries);

      expect(siPath).toBe(path.join(tempDir, ".openclaw", "export", "selfimprove.md"));
      expect(existsSync(siPath)).toBe(true);

      const content = readFileSync(siPath, "utf-8");
      expect(content).toContain("# Self-Improvement Log");
      expect(content).toContain("do not edit manually");
      expect(content).toContain("2 entries");
    });

    it("uses correct icons per category", () => {
      const makeEntry = (
        id: number,
        category: SelfImproveEntry["category"],
        title: string,
      ): SelfImproveEntry => ({
        id,
        taskId: null,
        agentRole: "dev",
        category,
        severity: "info",
        title,
        description: "desc",
        tags: null,
        scope: "project",
        applied: false,
        createdAt: "2024-01-01T00:00:00.000Z",
      });

      const entries = [
        makeEntry(1, "anti_pattern", "Anti Pattern Entry"),
        makeEntry(2, "pattern", "Pattern Entry"),
        makeEntry(3, "process", "Process Entry"),
        makeEntry(4, "lesson", "Lesson Entry"),
      ];

      const siPath = exportSelfImprove(tempDir, entries);
      const content = readFileSync(siPath, "utf-8");

      expect(content).toContain("⚠️ Anti Pattern Entry");
      expect(content).toContain("💡 Pattern Entry");
      expect(content).toContain("🔧 Process Entry");
      expect(content).toContain("📝 Lesson Entry");
    });

    it("includes task ID when present, omits when null", () => {
      const entries: SelfImproveEntry[] = [
        {
          id: 1,
          taskId: "TASK-007",
          agentRole: "dev",
          category: "lesson",
          severity: "info",
          title: "With task",
          description: "Has a task ID",
          tags: null,
          scope: "project",
          applied: false,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: 2,
          taskId: null,
          agentRole: "dev",
          category: "lesson",
          severity: "info",
          title: "Without task",
          description: "No task ID",
          tags: null,
          scope: "global",
          applied: false,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const siPath = exportSelfImprove(tempDir, entries);
      const content = readFileSync(siPath, "utf-8");

      expect(content).toContain("| **Task:** TASK-007");
      // The "Without task" entry should not have "Task:" field
      const withoutBlock = content.split("### 📝 Without task")[1];
      expect(withoutBlock).not.toContain("**Task:**");
    });

    it("includes tags when present", () => {
      const entries: SelfImproveEntry[] = [
        {
          id: 1,
          taskId: null,
          agentRole: "dev",
          category: "lesson",
          severity: "info",
          title: "Tagged entry",
          description: "Has tags",
          tags: "performance,testing",
          scope: "project",
          applied: false,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const siPath = exportSelfImprove(tempDir, entries);
      const content = readFileSync(siPath, "utf-8");

      expect(content).toContain("**Tags:** performance,testing");
    });

    it("handles empty entries list", () => {
      const siPath = exportSelfImprove(tempDir, []);
      const content = readFileSync(siPath, "utf-8");

      expect(content).toContain("# Self-Improvement Log");
      expect(content).toContain("0 entries");
    });
  });
});
