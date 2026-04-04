import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openProjectRegistry } from "./registry.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "openclaw-registry-test-"));
  process.env.OPENCLAW_HOME = tmpDir;
});

afterEach(() => {
  delete process.env.OPENCLAW_HOME;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("openProjectRegistry", () => {
  it("registers and retrieves a project", () => {
    const reg = openProjectRegistry();
    reg.register("proj-1", "/repos/my-repo");
    const projects = reg.getProject("proj-1");
    expect(projects).toHaveLength(1);
    expect(projects[0].projectId).toBe("proj-1");
    expect(projects[0].repoPath).toBe("/repos/my-repo");
    expect(projects[0].displayName).toBeNull();
    expect(projects[0].repoUrl).toBeNull();
    expect(projects[0].sqlitePath).toBeNull();
    expect(projects[0].lastSeenAt).toBeNull();
    expect(projects[0].configJson).toBeNull();
    expect(projects[0].registeredAt).toBeGreaterThan(0);
    reg.close();
  });

  it("register is idempotent and updates fields on conflict", () => {
    const reg = openProjectRegistry();
    reg.register("proj-1", "/repos/my-repo");
    reg.register("proj-1", "/repos/my-repo", {
      displayName: "My Project",
      repoUrl: "https://github.com/user/repo",
    });
    const projects = reg.getProject("proj-1");
    expect(projects).toHaveLength(1);
    expect(projects[0].displayName).toBe("My Project");
    expect(projects[0].repoUrl).toBe("https://github.com/user/repo");
    reg.close();
  });

  it("unregisters a repo from a project", () => {
    const reg = openProjectRegistry();
    reg.register("proj-1", "/repos/my-repo");
    reg.unregister("proj-1", "/repos/my-repo");
    const projects = reg.getProject("proj-1");
    expect(projects).toHaveLength(0);
    reg.close();
  });

  it("supports multiple repos per project", () => {
    const reg = openProjectRegistry();
    reg.register("proj-multi", "/repos/repo-a");
    reg.register("proj-multi", "/repos/repo-b");
    reg.register("proj-multi", "/repos/repo-c");
    const projects = reg.getProject("proj-multi");
    expect(projects).toHaveLength(3);
    const paths = projects.map((p) => p.repoPath);
    expect(paths).toContain("/repos/repo-a");
    expect(paths).toContain("/repos/repo-b");
    expect(paths).toContain("/repos/repo-c");
    reg.close();
  });

  it("listProjects returns all projects with their repoPaths", () => {
    const reg = openProjectRegistry();
    reg.register("alpha", "/repos/alpha-1");
    reg.register("alpha", "/repos/alpha-2");
    reg.register("beta", "/repos/beta-1");

    const projects = reg.listProjects();
    expect(projects).toHaveLength(2);

    const alpha = projects.find((p) => p.projectId === "alpha")!;
    expect(alpha).toBeDefined();
    expect(alpha.repoPaths).toContain("/repos/alpha-1");
    expect(alpha.repoPaths).toContain("/repos/alpha-2");
    expect(alpha.registeredAt).toBeTruthy();

    const beta = projects.find((p) => p.projectId === "beta")!;
    expect(beta).toBeDefined();
    expect(beta.repoPaths).toEqual(["/repos/beta-1"]);

    reg.close();
  });

  it("getProject returns empty array for unknown project", () => {
    const reg = openProjectRegistry();
    const projects = reg.getProject("nonexistent");
    expect(projects).toEqual([]);
    reg.close();
  });

  it("listProjects returns empty array when no projects registered", () => {
    const reg = openProjectRegistry();
    expect(reg.listProjects()).toEqual([]);
    reg.close();
  });

  it("unregister only removes the specific repo, not others", () => {
    const reg = openProjectRegistry();
    reg.register("proj-x", "/repos/keep");
    reg.register("proj-x", "/repos/remove");
    reg.unregister("proj-x", "/repos/remove");
    const projects = reg.getProject("proj-x");
    expect(projects).toHaveLength(1);
    expect(projects[0].repoPath).toBe("/repos/keep");
    reg.close();
  });

  it("registers project with all optional fields", () => {
    const reg = openProjectRegistry();
    const now = Date.now();
    reg.register("proj-full", "/repos/full-repo", {
      displayName: "Full Project",
      repoUrl: "https://github.com/user/full-repo",
      sqlitePath: "/repos/full-repo/.openclaw/project.sqlite",
      lastSeenAt: now,
      configJson: JSON.stringify({ key: "value" }),
    });
    const projects = reg.getProject("proj-full");
    expect(projects).toHaveLength(1);
    expect(projects[0].displayName).toBe("Full Project");
    expect(projects[0].repoUrl).toBe("https://github.com/user/full-repo");
    expect(projects[0].sqlitePath).toBe("/repos/full-repo/.openclaw/project.sqlite");
    expect(projects[0].lastSeenAt).toBe(now);
    expect(projects[0].configJson).toBe(JSON.stringify({ key: "value" }));
    reg.close();
  });

  it("updates project fields", () => {
    const reg = openProjectRegistry();
    reg.register("proj-update", "/repos/update-repo");
    const now = Date.now();
    reg.updateProject("proj-update", "/repos/update-repo", {
      displayName: "Updated Name",
      repoUrl: "https://github.com/user/updated",
      lastSeenAt: now,
    });
    const projects = reg.getProject("proj-update");
    expect(projects).toHaveLength(1);
    expect(projects[0].displayName).toBe("Updated Name");
    expect(projects[0].repoUrl).toBe("https://github.com/user/updated");
    expect(projects[0].lastSeenAt).toBe(now);
    reg.close();
  });

  it("getProjectByPath returns project by repo path", () => {
    const reg = openProjectRegistry();
    reg.register("proj-by-path", "/repos/by-path", {
      displayName: "By Path Project",
    });
    const project = reg.getProjectByPath("/repos/by-path");
    expect(project).not.toBeNull();
    expect(project?.projectId).toBe("proj-by-path");
    expect(project?.displayName).toBe("By Path Project");
    reg.close();
  });

  it("getProjectByPath returns null for unknown path", () => {
    const reg = openProjectRegistry();
    const project = reg.getProjectByPath("/repos/unknown");
    expect(project).toBeNull();
    reg.close();
  });

  it("handles migration from old schema to new schema", () => {
    const reg = openProjectRegistry();
    const db = reg.db;

    db.exec("DROP TABLE IF EXISTS projects");
    db.exec(`
      CREATE TABLE projects (
        project_id TEXT NOT NULL,
        repo_path TEXT NOT NULL,
        registered_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (project_id, repo_path)
      );
    `);
    db.exec(
      "INSERT INTO projects (project_id, repo_path, registered_at) VALUES ('old-proj', '/repos/old', '2026-01-01 12:00:00')",
    );

    reg.close();

    const reg2 = openProjectRegistry();
    const projects = reg2.getProject("old-proj");
    expect(projects).toHaveLength(1);
    expect(typeof projects[0].registeredAt).toBe("number");
    expect(projects[0].registeredAt).toBeGreaterThan(0);
    reg2.close();
  });
});
