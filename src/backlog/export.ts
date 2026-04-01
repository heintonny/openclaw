import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BacklogTask, SelfImproveEntry } from "./types.js";

export function exportBacklog(
  repoPath: string,
  tasks: BacklogTask[],
  deps: Array<{ taskId: string; dependsOn: string }>,
): string {
  const exportDir = path.join(repoPath, ".openclaw", "export");
  if (!existsSync(exportDir)) {
    mkdirSync(exportDir, { recursive: true });
  }

  // Generate backlog.md
  let md = "# Backlog\n\n";
  md += `> Generated ${new Date().toISOString()} — do not edit manually\n\n`;

  const byStatus: Record<string, BacklogTask[]> = {};
  for (const t of tasks) {
    (byStatus[t.status] ??= []).push(t);
  }

  // Summary table
  md += "## Summary\n\n";
  md += `| Status | Count |\n|---|---|\n`;
  for (const [status, items] of Object.entries(byStatus)) {
    md += `| ${status} | ${items.length} |\n`;
  }
  md += `| **Total** | **${tasks.length}** |\n\n`;

  // Task sections grouped by status
  const statusOrder = ["inProgress", "notStarted", "blocked", "inReview", "done", "cancelled"];
  for (const status of statusOrder) {
    const items = byStatus[status];
    if (!items || items.length === 0) {
      continue;
    }
    md += `## ${status} (${items.length})\n\n`;
    for (const t of items) {
      const taskDeps = deps.filter((d) => d.taskId === t.taskId).map((d) => d.dependsOn);
      md += `### ${t.taskId}: ${t.title}\n`;
      md += `- **Severity:** ${t.severity} | **Complexity:** ${t.complexity}\n`;
      if (t.agentRole) {
        md += `- **Agent:** ${t.agentRole}\n`;
      }
      if (taskDeps.length > 0) {
        md += `- **Depends on:** ${taskDeps.join(", ")}\n`;
      }
      if (t.touches.length > 0) {
        md += `- **Touches:** ${t.touches.join(", ")}\n`;
      }
      if (t.description) {
        md += `\n${t.description}\n`;
      }
      md += "\n";
    }
  }

  const backlogPath = path.join(exportDir, "backlog.md");
  writeFileSync(backlogPath, md, "utf-8");
  return backlogPath;
}

export function exportSelfImprove(repoPath: string, entries: SelfImproveEntry[]): string {
  const exportDir = path.join(repoPath, ".openclaw", "export");
  if (!existsSync(exportDir)) {
    mkdirSync(exportDir, { recursive: true });
  }

  let md = "# Self-Improvement Log\n\n";
  md += `> Generated ${new Date().toISOString()} — do not edit manually\n\n`;
  md += `${entries.length} entries\n\n`;

  for (const e of entries) {
    const icon =
      e.category === "anti_pattern"
        ? "⚠️"
        : e.category === "pattern"
          ? "💡"
          : e.category === "process"
            ? "🔧"
            : "📝";
    md += `### ${icon} ${e.title}\n`;
    md += `- **Category:** ${e.category} | **Severity:** ${e.severity} | **Scope:** ${e.scope}\n`;
    md += `- **Agent:** ${e.agentRole}`;
    if (e.taskId) {
      md += ` | **Task:** ${e.taskId}`;
    }
    md += `\n`;
    if (e.tags) {
      md += `- **Tags:** ${e.tags}\n`;
    }
    md += `\n${e.description}\n\n`;
  }

  const siPath = path.join(exportDir, "selfimprove.md");
  writeFileSync(siPath, md, "utf-8");
  return siPath;
}
