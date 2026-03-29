// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid type declarations barrel — re-exports both runtimes for backwards
 * compatibility. Existing plugin tsconfig.json files that reference this file
 * will continue to work unchanged.
 *
 * For new projects, prefer importing only the file you need:
 *   - `plugin.d.ts`     — QuickJS plugin runtime (host, fetch, console, tool types)
 *   - `automation.d.ts` — Node.js automation runtime (global.clawdroid, __vars)
 */

/// <reference path="./plugin.d.ts" />
/// <reference path="./automation.d.ts" />
