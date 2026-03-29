// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock globals that QuickJS injects ──────────────────

const mockFetch = vi.fn();
const mockHost = {
  getSecret: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  listDirectory: vi.fn(),
  httpFetch: vi.fn(),
  log: vi.fn(),
};

vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("host", mockHost);
vi.stubGlobal("console", { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

// ─── Import after global mocks ─────────────────────────

import { discoverTools, execute, matchEvent, formatLabel, buildConfig } from "../index";
import { required, optional } from "../params";

function mockCtx(token: string | null = "ghp_test123") {
  return { host: { ...mockHost, getSecret: vi.fn().mockResolvedValue(token) } as any };
}

function jsonResp(data: unknown, status = 200) {
  return { ok: status < 400, status, text: () => JSON.stringify(data), json: () => data };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── params.ts ──────────────────────────────────────────

describe("params", () => {
  it("required() returns string value", () => {
    expect(required({ name: "alice" }, "name")).toBe("alice");
  });

  it("required() throws on missing param", () => {
    expect(() => required({}, "name")).toThrow("Missing 'name' parameter");
  });

  it("required() throws on empty string", () => {
    expect(() => required({ name: "" }, "name")).toThrow("Missing 'name' parameter");
  });

  it("required() throws on null", () => {
    expect(() => required({ name: null }, "name")).toThrow("Missing 'name' parameter");
  });

  it("optional() returns value when present", () => {
    expect(optional({ count: 5 }, "count", 10)).toBe(5);
  });

  it("optional() returns default when missing", () => {
    expect(optional({}, "count", 10)).toBe(10);
  });

  it("optional() returns default for null", () => {
    expect(optional({ count: null }, "count", 10)).toBe(10);
  });

  it("optional() returns default for empty string", () => {
    expect(optional({ count: "" }, "count", 10)).toBe(10);
  });
});

// ─── discoverTools ──────────────────────────────────────

describe("discoverTools", () => {
  it("returns empty array (tools declared in manifest.json)", () => {
    expect(discoverTools()).toEqual([]);
  });
});

// ─── execute ────────────────────────────────────────────

describe("execute", () => {
  it("returns error when no token", async () => {
    const result = await execute("github_get_user", {}, mockCtx(null));
    expect(result).toEqual({
      error: true,
      message: "GitHub not connected. Connect in Settings first.",
    });
  });

  it("returns error for unknown tool", async () => {
    const result = await execute("github_nonexistent", {}, mockCtx());
    expect(result).toEqual({
      error: true,
      message: "Unknown GitHub tool: github_nonexistent",
    });
  });

  it("dispatches github_get_user correctly", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ login: "testuser", name: "Test", public_repos: 5, total_private_repos: 2 }),
    );
    const result = await execute("github_get_user", {}, mockCtx());
    expect(result).toHaveProperty("message");
    expect((result as any).message).toContain("testuser");
  });

  it("dispatches github_list_repos correctly", async () => {
    mockFetch.mockResolvedValue(
      jsonResp([{ full_name: "user/repo", private: false, stargazers_count: 10, description: "A repo" }]),
    );
    const result = await execute("github_list_repos", {}, mockCtx());
    expect((result as any).message).toContain("user/repo");
  });

  it("dispatches github_get_repo with owner/repo params", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        full_name: "octocat/hello", description: "Hello World", language: "JavaScript",
        stargazers_count: 100, forks_count: 50, open_issues_count: 3,
        default_branch: "main", private: false, html_url: "https://github.com/octocat/hello",
      }),
    );
    const result = await execute("github_get_repo", { owner: "octocat", repo: "hello" }, mockCtx());
    expect((result as any).message).toContain("octocat/hello");
  });

  it("dispatches github_search_repos", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ total_count: 1, items: [{ full_name: "test/repo", stargazers_count: 5, description: "Test" }] }),
    );
    const result = await execute("github_search_repos", { query: "test" }, mockCtx());
    expect((result as any).message).toContain("test/repo");
  });

  it("dispatches github_list_issues", async () => {
    mockFetch.mockResolvedValue(
      jsonResp([
        { number: 1, title: "Bug", user: { login: "dev" }, labels: [{ name: "bug" }], state: "open" },
      ]),
    );
    const result = await execute("github_list_issues", { owner: "o", repo: "r" }, mockCtx());
    expect((result as any).message).toContain("#1 Bug");
  });

  it("dispatches github_create_issue", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ number: 42, html_url: "https://github.com/o/r/issues/42" }),
    );
    const result = await execute("github_create_issue", { owner: "o", repo: "r", title: "New" }, mockCtx());
    expect((result as any).message).toContain("#42");
  });

  it("dispatches github_list_branches", async () => {
    mockFetch.mockResolvedValue(
      jsonResp([{ name: "main", commit: { sha: "abc1234567890" } }]),
    );
    const result = await execute("github_list_branches", { owner: "o", repo: "r" }, mockCtx());
    expect((result as any).message).toContain("main");
  });

  it("dispatches github_search_code", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ total_count: 1, items: [{ name: "test.js", path: "src/test.js", html_url: "https://...", repository: { full_name: "o/r" } }] }),
    );
    const result = await execute("github_search_code", { query: "function" }, mockCtx());
    expect((result as any).message).toContain("test.js");
  });
});

// ─── matchEvent ─────────────────────────────────────────

describe("matchEvent", () => {
  it("returns event when no repo filter", () => {
    const event = { title: "Test", repo: "user/repo", type: "Issue" };
    expect(matchEvent("github_notification", {}, event)).toEqual(event);
  });

  it("returns event when repo filter matches", () => {
    const event = { title: "Test", repo: "User/Repo", type: "Issue" };
    expect(matchEvent("github_notification", { repo_filter: "user/repo" }, event)).toEqual(event);
  });

  it("returns null when repo filter doesn't match", () => {
    const event = { title: "Test", repo: "other/repo", type: "Issue" };
    expect(matchEvent("github_notification", { repo_filter: "user/repo" }, event)).toBeNull();
  });
});

// ─── formatLabel ────────────────────────────────────────

describe("formatLabel", () => {
  it("formats github_notification with repo filter", () => {
    expect(formatLabel("github_notification", { repo_filter: "user/repo" })).toBe(
      "GitHub notification (user/repo)",
    );
  });

  it("formats github_notification without repo filter", () => {
    expect(formatLabel("github_notification", {})).toBe("GitHub notification (any repo)");
  });

  it("formats github_issue_opened", () => {
    expect(formatLabel("github_issue_opened", {})).toBe("New issue (any repo)");
  });

  it("formats github_pr_opened", () => {
    expect(formatLabel("github_pr_opened", {})).toBe("New PR (any repo)");
  });

  it("returns default for unknown trigger", () => {
    expect(formatLabel("unknown", {})).toBe("GitHub");
  });
});

// ─── buildConfig ────────────────────────────────────────

describe("buildConfig", () => {
  it("returns empty config when no input", () => {
    expect(buildConfig("github_notification", {})).toEqual({});
  });

  it("includes repo_filter when provided", () => {
    expect(buildConfig("github_notification", { repo_filter: "user/repo" })).toEqual({
      repo_filter: "user/repo",
    });
  });
});
