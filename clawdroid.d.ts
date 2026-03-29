// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid JS Plugin Host API type declarations.
 * These globals are injected by the QuickJS runtime before plugin code runs.
 */

/** Host bridge — Kotlin methods exposed to JS via quickjs-kt asyncFunction bindings */
export interface HostApi {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<string>;
  listDirectory(path: string): Promise<string>;
  httpFetch(url: string, method: string, headersJson: string, body?: string | null): Promise<string>;
  getSecret(name: string): Promise<string | null>;
  log(level: "INFO" | "WARN" | "ERROR" | "DEBUG", message: string): void;
}

/** Simplified fetch response returned by the global fetch() wrapper */
export interface FetchResponse {
  ok: boolean;
  status: number;
  text(): string;
  json(): any;
}

/** Options for the global fetch() wrapper */
export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | object;
}

/** Execution context passed to execute() */
export interface PluginContext {
  host: HostApi;
}

/** Tool definition for discoverTools() */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParam[];
}

/** Tool parameter definition */
export interface ToolParam {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

/** Standard result shape returned from execute() */
export interface ToolResult {
  message: string;
  error?: boolean;
}

/** Standard error result */
export interface ToolError {
  error: true;
  message: string;
}

// ─── Globals injected by JsPluginGlobals.kt ─────────────

declare global {
  /** The host API bridge object — bound by quickjs-kt */
  const host: HostApi;

  /** Simplified fetch wrapper routed through host.httpFetch */
  function fetch(url: string, options?: FetchOptions): Promise<FetchResponse>;

  /** Console shim routed through host.log */
  const console: {
    log(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    debug(...args: any[]): void;
  };

  /** Base64 decode (available in QuickJS) */
  function atob(encoded: string): string;
  /** Base64 encode (available in QuickJS) */
  function btoa(data: string): string;
  /** URL encode */
  function encodeURIComponent(str: string): string;
}
