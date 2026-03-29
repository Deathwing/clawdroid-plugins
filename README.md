# ClawDroid Plugins

Community plugin library for [ClawDroid](https://github.com/Deathwing/clawdroid) — the autonomous AI agent workstation for Android.

## Structure

```
clawdroid-plugins/
├── clawdroid.d.ts        ← shared TypeScript type definitions (globals injected by the runtime)
├── manifest.schema.json  ← JSON Schema for manifest.json (enables editor validation)
├── builtin.json          ← which plugins are pre-bundled with the app
├── packages/             ← one directory per plugin
│   ├── github/
│   │   ├── manifest.json
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   └── ...
└── .github/workflows/release.yml
```

## What is a plugin?

A plugin is a TypeScript module that adds tools, triggers, or model providers to ClawDroid. Plugins run inside a sandboxed QuickJS engine on the device. Each plugin consists of:

- **`manifest.json`** — metadata, auth configuration, tool/trigger definitions
- **`src/index.ts`** — implementation (bundled to `index.js` at build time)

## Built-in plugins

The following plugins are pre-shipped with the ClawDroid app (defined in [`builtin.json`](builtin.json)):

| Plugin | Category | Description |
|--------|----------|-------------|
| [github](packages/github/) | Developer | Repos, issues, PRs, branches, file contents |
| [instagram](packages/instagram/) | Social | Posts, media, comments, insights |
| [matrix](packages/matrix/) | Messaging | Rooms, messages, profiles |
| [outlook](packages/outlook/) | Productivity | Mail, Calendar, Teams via Microsoft Graph |
| [slack](packages/slack/) | Messaging | Channels, messages, users, search |
| [spotify](packages/spotify/) | Entertainment | Playback, playlists, library, search |
| [telegram](packages/telegram/) | Messaging | Messages, chats, photos, bots |

## Contributing a new plugin

1. Fork this repo
2. Copy an existing plugin directory as a template (e.g. `cp -r packages/github packages/myservice`)
3. Update `manifest.json` — set a unique `id` (e.g. `"community:myservice"`), fill in name, description, auth, and tool/trigger definitions. The `$schema` field gives you editor autocomplete and validation automatically.
4. Copy `../../tsconfig.json` pattern — your `tsconfig.json` should include `"../../clawdroid.d.ts"` so you get types for the injected globals.
4. Implement `src/index.ts`
5. Build locally: `npm install && npm run build` inside your plugin directory
6. Test: `npm test`
7. Open a pull request — fill in the PR template

## Plugin API

Your plugin exports these functions from `src/index.ts`:

```typescript
// Required — return the tools this plugin provides
export function discoverTools(config: PluginConfig): ToolDefinition[]

// Required — execute a tool call
export async function execute(toolName: string, params: Record<string, unknown>, config: PluginConfig): Promise<ToolResult>

// Optional — check if a trigger condition is met (for trigger plugins)
export async function checkTrigger(triggerType: string, config: PluginConfig, state: TriggerState): Promise<TriggerCheckResult>

// Optional — match an incoming event to a trigger (for event-driven triggers)
export function matchEvent(triggerType: string, event: Record<string, unknown>, config: PluginConfig): boolean

// Optional — return a human-readable label for a trigger's current config
export function formatLabel(triggerType: string, config: PluginConfig): string

// Optional — return UI config fields for configuring the trigger
export function buildConfig(triggerType: string): ConfigField[]
```

See [clawdroid.d.ts](clawdroid.d.ts) for full type definitions.

## Building locally

```bash
# Build a single plugin (outputs to packages/{name}/dist/index.js)
cd packages/github
npm install
npm run build:release

# Build all plugins for release
npm run build:release   # from repo root (uses npm workspaces)
```

## Releases

Publishing is fully automatic — no manual steps needed.

| Event | What happens |
|-------|-------------|
| PR opened | CI typechecks and tests your plugin |
| PR merged to `main` | CI builds changed plugins, publishes to the [rolling `latest` release](../../releases/tag/latest) — immediately available in the ClawDroid app catalog |
| `v*` tag pushed (maintainer) | CI builds all plugins, publishes a pinned stable versioned release |

**For contributors:** open a PR, get it reviewed and merged — your plugin is live. That's it.

The [rolling `latest` release](../../releases/tag/latest) always reflects the current state of `main` and includes:
- Per-plugin zips (`github.zip`, `telegram.zip`, etc.) + SHA-256 checksums
- `plugins.zip` — combined zip used by the ClawDroid Android build system
- `plugins.json` — the full plugin catalog consumed by the app

## License

MIT — see [LICENSE](LICENSE). By submitting a pull request, you agree that your contribution is licensed under MIT and you assign copyright to Robert Lehmann (Deathwing) per the [Contributor License Agreement](../CLA.md).
