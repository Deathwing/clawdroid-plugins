// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid Node.js runtime type declarations.
 *
 * Include this file in your Node.js plugin or script project's tsconfig.json:
 *
 *   "include": ["path/to/node.d.ts", "your-script.ts"]
 *
 * The embedded Node.js runtime (NodeEngine / bridge.js) is used for:
 *   - Script automations (.js files referenced by `AutomationEntity.scriptPath`)
 *   - Node-stdio MCP server transports
 *   - Direct node_eval / node_run tool invocations
 *
 * For script automations, bridge.js injects `global.clawdroid` and
 * `global.__vars` before your script is eval'd. Actions posted to
 * `global.clawdroid` are accumulated and dispatched by AutomationManager
 * after the script completes — they do NOT execute synchronously.
 *
 * You have access to the full Node.js standard library and any npm packages
 * installed in the workspace via `npm install`.
 */

/** Available in Node.js automation scripts as `global.clawdroid`. */
export interface ClawDroidAutomationApi {
  /**
   * Post a local Android notification.
   *
   * @example
   * clawdroid.notify("Task done", "The scheduled job completed successfully.");
   */
  notify(title: string, message: string): void;

  /**
   * Trigger another automation by its ID, optionally passing extra variables.
   * The target automation receives the variables on `global.__vars`.
   *
   * @example
   * clawdroid.triggerAutomation("send-daily-report", { date: new Date().toISOString() });
   */
  triggerAutomation(automationId: string, variables?: Record<string, any>): void;

  /**
   * Spawn a new LLM agent session in the specified container with the given prompt.
   * The agent runs to completion asynchronously after the script finishes.
   *
   * @example
   * clawdroid.spawnAgent("my-assistant", `Summarize this: ${content}`);
   */
  spawnAgent(containerId: string, prompt: string): void;

  /**
   * Send an SMS message.
   *
   * @example
   * clawdroid.sendSms("+1234567890", "Hello from ClawDroid!");
   */
  sendSms(to: string, message: string): void;
}

declare global {
  /**
   * ClawDroid automation API — injected by bridge.js before script eval.
   * Only available in Node.js automation scripts, NOT in QuickJS plugins.
   */
  // eslint-disable-next-line no-var
  var clawdroid: ClawDroidAutomationApi;

  /**
   * Trigger variables injected by AutomationManager before the script runs.
   * Shape depends on the trigger type that fired the automation.
   *
   * Common fields (all triggers):
   *   - `__vars.triggerId`   — automation ID
   *   - `__vars.triggerType` — e.g. "schedule", "sms_received", "notification"
   *
   * SMS trigger additional fields:
   *   - `__vars.sender`  — phone number of the sender
   *   - `__vars.message` — body of the received SMS
   *
   * Notification trigger additional fields:
   *   - `__vars.appPackage` — package name of the notifying app
   *   - `__vars.title`      — notification title
   *   - `__vars.text`       — notification body text
   */
  // eslint-disable-next-line no-var
  var __vars: Record<string, any>;
}
