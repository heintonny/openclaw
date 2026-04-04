import type { IssueDependency, Issue } from "./types.js";

// Check for cycles using DFS
export function hasCycle(dependencies: IssueDependency[]): boolean {
  const graph = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (!graph.has(dep.issueId)) {
      graph.set(dep.issueId, []);
    }
    graph.get(dep.issueId)!.push(dep.dependsOn);
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
export function topologicalSort(dependencies: IssueDependency[]): string[] {
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  const allNodes = new Set<string>();

  for (const dep of dependencies) {
    allNodes.add(dep.issueId);
    allNodes.add(dep.dependsOn);
    if (!graph.has(dep.dependsOn)) {
      graph.set(dep.dependsOn, new Set());
    }
    graph.get(dep.dependsOn)!.add(dep.issueId);
    inDegree.set(dep.issueId, (inDegree.get(dep.issueId) || 0) + 1);
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

// Plan next batch: find issues that are notStarted and have all dependencies done
export function planBatch(
  issues: Issue[],
  dependencies: IssueDependency[],
  maxBatchSize: number = 5,
): Issue[] {
  const issueMap = new Map(issues.map((t) => [t.issueId, t]));
  const depsByIssue = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (!depsByIssue.has(dep.issueId)) {
      depsByIssue.set(dep.issueId, []);
    }
    depsByIssue.get(dep.issueId)!.push(dep.dependsOn);
  }

  const ready: Issue[] = [];
  for (const issue of issues) {
    if (issue.status !== "notStarted") {
      continue;
    }
    const deps = depsByIssue.get(issue.issueId) || [];
    const allDepsDone = deps.every((depId) => {
      const depIssue = issueMap.get(depId);
      return depIssue && depIssue.status === "done";
    });
    if (allDepsDone) {
      ready.push(issue);
    }
  }

  // Sort by severity (critical first), then by topological order
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  ready.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

  return ready.slice(0, maxBatchSize);
}
