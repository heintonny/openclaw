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
    const repos = reg.getProject("proj-1");
    expect(repos).toEqual(["/repos/my-repo"]);
    reg.close();
  });

  it("register is idempotent (INSERT OR IGNORE)", () => {
    const reg = openProjectRegistry();
    reg.register("proj-1", "/repos/my-repo");
    reg.register("proj-1", "/repos/my-repo");
    const repos = reg.getProject("proj-1");
    expect(repos).toHaveLength(1);
    reg.close();
  });

  it("unregisters a repo from a project", () => {
    const reg = openProjectRegistry();
    reg.register("proj-1", "/repos/my-repo");
    reg.unregister("proj-1", "/repos/my-repo");
    const repos = reg.getProject("proj-1");
    expect(repos).toHaveLength(0);
    reg.close();
  });

  it("supports multiple repos per project", () => {
    const reg = openProjectRegistry();
    reg.register("proj-multi", "/repos/repo-a");
    reg.register("proj-multi", "/repos/repo-b");
    reg.register("proj-multi", "/repos/repo-c");
    const repos = reg.getProject("proj-multi");
    expect(repos).toHaveLength(3);
    expect(repos).toContain("/repos/repo-a");
    expect(repos).toContain("/repos/repo-b");
    expect(repos).toContain("/repos/repo-c");
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
    const repos = reg.getProject("nonexistent");
    expect(repos).toEqual([]);
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
    const repos = reg.getProject("proj-x");
    expect(repos).toEqual(["/repos/keep"]);
    reg.close();
  });
});
