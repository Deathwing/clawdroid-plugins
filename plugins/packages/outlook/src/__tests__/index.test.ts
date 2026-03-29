// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Outlook uses host.httpFetch directly (not global fetch)
const mockHost = {
  getSecret: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  listDirectory: vi.fn(),
  httpFetch: vi.fn(),
  log: vi.fn(),
};
vi.stubGlobal("host", mockHost);
vi.stubGlobal("fetch", vi.fn());
vi.stubGlobal("console", { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

import { discoverTools, execute, matchEvent, formatLabel, buildConfig } from "../index";

function mockCtx(token: string | null = "outlook_test_token") {
  return { host: { ...mockHost, getSecret: vi.fn().mockResolvedValue(token) } as any };
}

function graphResp(data: unknown, status = 200) {
  return { status, body: JSON.stringify(data), json: () => data };
}

beforeEach(() => vi.clearAllMocks());

// ─── discoverTools ──────────────────────────────────────

describe("discoverTools", () => {
  it("returns empty array", () => {
    expect(discoverTools()).toEqual([]);
  });
});

// ─── execute ────────────────────────────────────────────

describe("execute", () => {
  it("returns error when no token", async () => {
    const result = await execute("outlook_list_mail", {}, mockCtx(null));
    expect(result).toEqual({ error: true, message: "Microsoft not connected. Sign in via Plugin settings." });
  });

  it("returns error for unknown tool", async () => {
    const result = await execute("outlook_nonexistent", {}, mockCtx());
    expect(result).toEqual({ error: true, message: "Unknown Outlook tool: outlook_nonexistent" });
  });

  it("dispatches outlook_list_mail", async () => {
    mockHost.httpFetch.mockResolvedValue(
      graphResp({ value: [{ subject: "Hello", from: { emailAddress: { address: "bob@test.com" } }, receivedDateTime: "2024-01-01", isRead: false, bodyPreview: "Hi there" }] }),
    );
    const result = await execute("outlook_list_mail", { limit: 5 }, mockCtx());
    expect((result as any).message).toContain("Hello");
  });

  it("dispatches outlook_read_mail", async () => {
    mockHost.httpFetch.mockResolvedValue(
      graphResp({ subject: "Test", from: { emailAddress: { address: "a@b.com" } }, receivedDateTime: "2024-01-01", isRead: true, body: { content: "Body text" } }),
    );
    const result = await execute("outlook_read_mail", { message_id: "msg123" }, mockCtx());
    expect((result as any).message).toContain("Test");
  });

  it("dispatches outlook_send_mail", async () => {
    mockHost.httpFetch.mockResolvedValue(graphResp({}, 202));
    const result = await execute("outlook_send_mail", { to: "bob@test.com", subject: "Hi", body: "Hello" }, mockCtx());
    expect((result as any).message).toBeDefined();
  });

  it("dispatches teams_list_teams", async () => {
    mockHost.httpFetch.mockResolvedValue(
      graphResp({ value: [{ id: "t1", displayName: "Team Alpha", description: "Dev team" }] }),
    );
    const result = await execute("teams_list_teams", {}, mockCtx());
    expect((result as any).message).toContain("Team Alpha");
  });
});

// ─── matchEvent ─────────────────────────────────────────

describe("matchEvent", () => {
  describe("outlook_mail_received", () => {
    it("returns event when no filters", () => {
      const event = { from: "bob@test.com", subject: "Hello" };
      expect(matchEvent("outlook_mail_received", {}, event)).toEqual(event);
    });

    it("returns event when from_filter matches (case-insensitive)", () => {
      const event = { from: "Bob@test.com", subject: "Hello" };
      expect(matchEvent("outlook_mail_received", { from_filter: "bob" }, event)).toEqual(event);
    });

    it("returns null when from_filter doesn't match", () => {
      const event = { from: "alice@test.com", subject: "Hello" };
      expect(matchEvent("outlook_mail_received", { from_filter: "bob" }, event)).toBeNull();
    });

    it("returns null when subject_filter doesn't match", () => {
      const event = { from: "bob@test.com", subject: "Goodbye" };
      expect(matchEvent("outlook_mail_received", { subject_filter: "hello" }, event)).toBeNull();
    });

    it("returns event when subject_filter matches (case-insensitive)", () => {
      const event = { from: "bob@test.com", subject: "Hello World" };
      expect(matchEvent("outlook_mail_received", { subject_filter: "hello" }, event)).toEqual(event);
    });
  });

  describe("outlook_event_starting", () => {
    it("always returns event data", () => {
      const event = { event_title: "Meeting", start_time: "2024-01-01T10:00" };
      expect(matchEvent("outlook_event_starting", {}, event)).toEqual(event);
    });
  });

  it("returns null for unknown trigger type", () => {
    expect(matchEvent("unknown_trigger", {}, { data: "test" })).toBeNull();
  });
});

// ─── formatLabel ────────────────────────────────────────

describe("formatLabel", () => {
  it("formats mail with from filter", () => {
    expect(formatLabel("outlook_mail_received", { from_filter: "boss@company.com" })).toBe(
      "Outlook Mail from boss@company.com",
    );
  });

  it("formats mail with subject filter", () => {
    expect(formatLabel("outlook_mail_received", { subject_filter: "urgent" })).toBe(
      "Outlook Mail re: urgent",
    );
  });

  it("formats mail with both filters", () => {
    const label = formatLabel("outlook_mail_received", { from_filter: "boss", subject_filter: "urgent" });
    expect(label).toContain("from boss");
    expect(label).toContain("re: urgent");
  });

  it("formats mail with no filters", () => {
    expect(formatLabel("outlook_mail_received", {})).toBe("Outlook Mail (any email)");
  });

  it("formats calendar trigger", () => {
    expect(formatLabel("outlook_event_starting", { minutes_before: "15" })).toBe("Outlook event (15min before)");
  });

  it("formats calendar trigger with default", () => {
    expect(formatLabel("outlook_event_starting", {})).toBe("Outlook event (10min before)");
  });

  it("returns default for unknown trigger", () => {
    expect(formatLabel("unknown", {})).toBe("Microsoft 365");
  });
});

// ─── buildConfig ────────────────────────────────────────

describe("buildConfig", () => {
  it("builds mail config with from_filter", () => {
    expect(buildConfig("outlook_mail_received", { from_filter: "bob" })).toEqual({ from_filter: "bob" });
  });

  it("builds mail config with subject_filter", () => {
    expect(buildConfig("outlook_mail_received", { subject_filter: "urgent" })).toEqual({ subject_filter: "urgent" });
  });

  it("builds empty mail config", () => {
    expect(buildConfig("outlook_mail_received", {})).toEqual({});
  });

  it("builds calendar config with minutes_before", () => {
    expect(buildConfig("outlook_event_starting", { minutes_before: 15 })).toEqual({ minutes_before: "15" });
  });

  it("returns empty for unknown trigger", () => {
    expect(buildConfig("unknown", {})).toEqual({});
  });
});
