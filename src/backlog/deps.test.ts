import { describe, expect, it } from "vitest";
import { hasCycle, planBatch, topologicalSort } from "./deps.js";
import type { BacklogDependency, BacklogTask } from "./types.js";

function makeTask(
  issueId: string,
  status: BacklogTask["status"] = "notStarted",
  severity: BacklogTask["severity"] = "medium",
): BacklogTask {
  return {
    issueId,
    title: `Task ${issueId}`,
    description: "",
    status,
    severity,
    complexity: "m",
    labels: [],
    assignee: null,
    sourceType: "internal",
    sourceExternalId: null,
    sourceExternalUrl: null,
    sourceSyncedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };
}

describe("hasCycle", () => {
  it("returns true for A→B→A (direct cycle)", () => {
    const deps: BacklogDependency[] = [
      { issueId: "A", dependsOn: "B" },
      { issueId: "B", dependsOn: "A" },
    ];
    expect(hasCycle(deps)).toBe(true);
  });

  it("returns true for A→B→C→A (indirect cycle)", () => {
    const deps: BacklogDependency[] = [
      { issueId: "A", dependsOn: "B" },
      { issueId: "B", dependsOn: "C" },
      { issueId: "C", dependsOn: "A" },
    ];
    expect(hasCycle(deps)).toBe(true);
  });

  it("returns false for A→B→C (linear, no cycle)", () => {
    const deps: BacklogDependency[] = [
      { issueId: "A", dependsOn: "B" },
      { issueId: "B", dependsOn: "C" },
    ];
    expect(hasCycle(deps)).toBe(false);
  });

  it("returns false for empty dependencies", () => {
    expect(hasCycle([])).toBe(false);
  });

  it("returns false for diamond shape (A→B, A→C, B→D, C→D)", () => {
    const deps: BacklogDependency[] = [
      { issueId: "A", dependsOn: "B" },
      { issueId: "A", dependsOn: "C" },
      { issueId: "B", dependsOn: "D" },
      { issueId: "C", dependsOn: "D" },
    ];
    expect(hasCycle(deps)).toBe(false);
  });
});

describe("topologicalSort", () => {
  it("produces valid ordering for linear chain A→B→C", () => {
    const deps: BacklogDependency[] = [
      { issueId: "A", dependsOn: "B" },
      { issueId: "B", dependsOn: "C" },
    ];
    const order = topologicalSort(deps);
    expect(order.indexOf("C")).toBeLessThan(order.indexOf("B"));
    expect(order.indexOf("B")).toBeLessThan(order.indexOf("A"));
  });

  it("produces valid ordering for diamond (A→B, A→C, B→D, C→D)", () => {
    const deps: BacklogDependency[] = [
      { issueId: "A", dependsOn: "B" },
      { issueId: "A", dependsOn: "C" },
      { issueId: "B", dependsOn: "D" },
      { issueId: "C", dependsOn: "D" },
    ];
    const order = topologicalSort(deps);
    // D must come before B and C, B and C before A
    expect(order.indexOf("D")).toBeLessThan(order.indexOf("B"));
    expect(order.indexOf("D")).toBeLessThan(order.indexOf("C"));
    expect(order.indexOf("B")).toBeLessThan(order.indexOf("A"));
    expect(order.indexOf("C")).toBeLessThan(order.indexOf("A"));
  });

  it("returns empty array for empty dependencies", () => {
    expect(topologicalSort([])).toEqual([]);
  });

  it("includes all nodes", () => {
    const deps: BacklogDependency[] = [{ issueId: "X", dependsOn: "Y" }];
    const order = topologicalSort(deps);
    expect(order).toContain("X");
    expect(order).toContain("Y");
    expect(order).toHaveLength(2);
  });
});

describe("planBatch", () => {
  it("returns tasks with no dependencies (free tasks)", () => {
    const tasks = [makeTask("T1"), makeTask("T2"), makeTask("T3")];
    const result = planBatch(tasks, []);
    expect(result).toHaveLength(3);
  });

  it("returns only tasks with all deps satisfied (done)", () => {
    const tasks = [
      makeTask("T1", "notStarted"),
      makeTask("T2", "done"),
      makeTask("T3", "notStarted"),
    ];
    const deps: BacklogDependency[] = [
      { issueId: "T1", dependsOn: "T2" }, // T1 depends on T2 (done) → ready
      { issueId: "T3", dependsOn: "T1" }, // T3 depends on T1 (notStarted) → blocked
    ];
    const result = planBatch(tasks, deps);
    const ids = result.map((t) => t.issueId);
    expect(ids).toContain("T1");
    expect(ids).not.toContain("T3");
  });

  it("excludes tasks that are not notStarted", () => {
    const tasks = [
      makeTask("T1", "inProgress"),
      makeTask("T2", "done"),
      makeTask("T3", "cancelled"),
      makeTask("T4", "notStarted"),
    ];
    const result = planBatch(tasks, []);
    expect(result).toHaveLength(1);
    expect(result[0].issueId).toBe("T4");
  });

  it("respects maxBatchSize", () => {
    const tasks = [
      makeTask("T1"),
      makeTask("T2"),
      makeTask("T3"),
      makeTask("T4"),
      makeTask("T5"),
      makeTask("T6"),
    ];
    const result = planBatch(tasks, [], 3);
    expect(result).toHaveLength(3);
  });

  it("sorts by severity: critical first", () => {
    const tasks = [
      makeTask("low-task", "notStarted", "low"),
      makeTask("critical-task", "notStarted", "critical"),
      makeTask("medium-task", "notStarted", "medium"),
      makeTask("high-task", "notStarted", "high"),
    ];
    const result = planBatch(tasks, []);
    expect(result[0].issueId).toBe("critical-task");
    expect(result[1].issueId).toBe("high-task");
    expect(result[2].issueId).toBe("medium-task");
    expect(result[3].issueId).toBe("low-task");
  });

  it("returns empty array when no tasks are ready", () => {
    const tasks = [makeTask("T1", "notStarted")];
    const deps: BacklogDependency[] = [
      { issueId: "T1", dependsOn: "T2" }, // T2 doesn't exist in tasks
    ];
    const result = planBatch(tasks, deps);
    expect(result).toHaveLength(0);
  });

  it("defaults maxBatchSize to 5", () => {
    const tasks = Array.from({ length: 10 }, (_, i) => makeTask(`T${i + 1}`));
    const result = planBatch(tasks, []);
    expect(result).toHaveLength(5);
  });
});
