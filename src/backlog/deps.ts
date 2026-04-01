import type { BacklogDependency, BacklogTask } from "./types.js";

// Check for cycles using DFS
export function hasCycle(dependencies: BacklogDependency[]): boolean {
  const graph = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (!graph.has(dep.taskId)) {
      graph.set(dep.taskId, []);
    }
    graph.get(dep.taskId)!.push(dep.dependsOn);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string): boolean {
    if (inStack.has(node)) {
      return true;
    }
    if (visited.has(node)) {
      return false;
    }
    visited.add(node);
    inStack.add(node);
    for (const neighbor of graph.get(node) || []) {
      if (dfs(neighbor)) {
        return true;
      }
    }
    inStack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (dfs(node)) {
      return true;
    }
  }
  return false;
}

// Topological sort (Kahn's algorithm)
export function topologicalSort(dependencies: BacklogDependency[]): string[] {
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  const allNodes = new Set<string>();

  for (const dep of dependencies) {
    allNodes.add(dep.taskId);
    allNodes.add(dep.dependsOn);
    if (!graph.has(dep.dependsOn)) {
      graph.set(dep.dependsOn, new Set());
    }
    graph.get(dep.dependsOn)!.add(dep.taskId);
    inDegree.set(dep.taskId, (inDegree.get(dep.taskId) || 0) + 1);
  }

  const queue: string[] = [];
  for (const node of allNodes) {
    if (!inDegree.has(node) || inDegree.get(node) === 0) {
      queue.push(node);
    }
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    for (const neighbor of graph.get(node) || []) {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }
  return result;
}

// Plan next batch: find tasks that are notStarted and have all dependencies done
export function planBatch(
  tasks: BacklogTask[],
  dependencies: BacklogDependency[],
  maxBatchSize: number = 5,
): BacklogTask[] {
  const taskMap = new Map(tasks.map((t) => [t.taskId, t]));
  const depsByTask = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (!depsByTask.has(dep.taskId)) {
      depsByTask.set(dep.taskId, []);
    }
    depsByTask.get(dep.taskId)!.push(dep.dependsOn);
  }

  const ready: BacklogTask[] = [];
  for (const task of tasks) {
    if (task.status !== "notStarted") {
      continue;
    }
    const deps = depsByTask.get(task.taskId) || [];
    const allDepsDone = deps.every((depId) => {
      const depTask = taskMap.get(depId);
      return depTask && depTask.status === "done";
    });
    if (allDepsDone) {
      ready.push(task);
    }
  }

  // Sort by severity (critical first), then by topological order
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  ready.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

  return ready.slice(0, maxBatchSize);
}
