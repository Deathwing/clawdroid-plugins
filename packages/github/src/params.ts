// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/** Parameter extraction helpers with validation */

export function required(input: Record<string, unknown>, name: string): string {
  const v = input[name];
  if (v === undefined || v === null || v === "") {
    throw new Error(`Missing '${name}' parameter`);
  }
  return String(v);
}

export function optional<T>(input: Record<string, unknown>, name: string, defaultVal: T): T {
  const v = input[name];
  if (v === undefined || v === null || v === "") return defaultVal;
  return v as T;
}
