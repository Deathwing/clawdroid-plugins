// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid QuickJS plugin runtime type declarations.
 *
 * Include this file in your plugin's tsconfig.json:
 *
 *   "include": ["../../plugin.d.ts", "src/**\/*.ts"]
 *
 * These globals are injected by JsPluginGlobals.kt before your plugin code runs
 * inside the QuickJS sandbox (JsPluginEngine).
 */

// ─── Host Bridge ─────────────────────────────────────────────────────────────

/**
 * Host bridge — Kotlin methods exposed to JS via quickjs-kt asyncFunction bindings.
 * Available as the global `host` object inside your plugin.
 *
 * All file paths are workspace-relative and sandboxed — escaping the workspace is blocked.
 * HTTP requests are SSRF-protected (loopback/private IPs are blocked).
 */
export interface HostApi {
  /** Read a workspace-relative file. Max 512 KB. */
  readFile(path: string): Promise<string>;
  /** Write a workspace-relative file (creates parent dirs). Max 512 KB content. */
  writeFile(path: string, content: string): Promise<string>;
  /** List directory entries, newline-separated. Directories are suffixed with `/`. */
  listDirectory(path: string): Promise<string>;
  /**
   * Make an HTTP request. Returns a `STATUS:<code>:<body>` envelope string.
   * Prefer using the global `fetch()` wrapper instead.
   */
  httpFetch(url: string, method: string, headersJson: string, body?: string | null): Promise<string>;
  /**
   * Resolve a plugin credential by name. Handles OAuth token refresh automatically.
   * Returns the secret value, or `null` if not configured.
   */
  getSecret(name: string): Promise<string | null>;
  /** Log a message to Android Logcat. */
  log(level: "INFO" | "WARN" | "ERROR" | "DEBUG", message: string): void;
}

// ─── Fetch Wrapper ────────────────────────────────────────────────────────────

/** Simplified fetch response returned by the global `fetch()` wrapper. */
export interface FetchResponse {
  ok: boolean;
  status: number;
  /** Returns the response body as text. */
  text(): string;
  /** Parses and returns the response body as JSON. */
  json(): any;
}

/** Options for the global `fetch()` wrapper. */
export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  /** If an object is provided it will be JSON-serialized automatically. */
  body?: string | object;
}

// ─── Plugin Contract Types ────────────────────────────────────────────────────

/** Execution context passed to `execute()`. */
export interface PluginContext {
  host: HostApi;
}

/** Tool definition returned by `discoverTools()`. */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParam[];
}

/** Parameter definition within a ToolDefinition. */
export interface ToolParam {
  name: string;
  /** JSON Schema primitive type: "string" | "number" | "boolean" | "array" | "object" */
  type: string;
  description: string;
  required: boolean;
}

/** Successful result shape returned from `execute()`. */
export interface ToolResult {
  message: string;
  error?: boolean;
}

/** Error result shape returned from `execute()`. */
export interface ToolError {
  error: true;
  message: string;
}

// ─── Globals injected by JsPluginGlobals.kt ──────────────────────────────────

declare global {
  /** The host API bridge object. Bound by quickjs-kt before plugin code runs. */
  const host: HostApi;

  /**
   * Simplified fetch wrapper routed through `host.httpFetch`.
   * SSRF-protected — loopback and private-range IPs are blocked.
   * 30 s timeout, 1 MB response cap.
   */
  function fetch(url: string, options?: FetchOptions): Promise<FetchResponse>;

  /** Console shim routed through `host.log`. */
  const console: {
    log(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    debug(...args: any[]): void;
  };

  /** Base64 decode — built into the QuickJS runtime. */
  function atob(encoded: string): string;
  /** Base64 encode — built into the QuickJS runtime. */
  function btoa(data: string): string;
  /** URL-encode a string component — built into the QuickJS runtime. */
  function encodeURIComponent(str: string): string;
}
