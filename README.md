# ClawDroid Community

Community content library for [ClawDroid](https://clawdroid.dev) — the autonomous AI agent workstation for Android.

This repo contains three types of community contributions:

- **Plugins** — TypeScript modules that add tools, triggers, or model providers to the AI agent
- **Skills** — Markdown system prompt files that specialize the agent for a specific role
- **MCPs** — Curated catalog of MCP (Model Context Protocol) servers ready to connect

## Structure

```
clawdroid-community/
├── plugins/                      ← JS/TS plugin packages
│   ├── clawdroid.d.ts            ← shared TypeScript type definitions
│   ├── manifest.schema.json      ← JSON Schema for manifest.json
│   ├── builtin.json              ← which plugins are pre-bundled with the app
│   └── packages/                 ← one directory per plugin
│       ├── github/
│       ├── instagram/
│       └── ...
├── skills/                       ← Markdown skill files (YAML frontmatter + system prompt)
│   ├── coding-assistant.md
│   ├── writing-editor.md
│   └── ...
├── mcps/                         ← MCP server catalog
│   └── catalog.json
└── .github/workflows/
    ├── ci.yml                    ← plugin build, typecheck, release
    └── community.yml             ← skills/mcps validation and catalog generation
```

---

## Plugins

A plugin is a TypeScript module that runs inside a sandboxed QuickJS engine on the device. Each plugin consists of:

- **`manifest.json`** — metadata, auth configuration, tool/trigger definitions
- **`src/index.ts`** — implementation (bundled to `dist/index.js` at build time)

### Built-in plugins

The following plugins are pre-shipped with ClawDroid (defined in [`plugins/builtin.json`](plugins/builtin.json)):

| Plugin | Category | Description |
|--------|----------|-------------|
| [github](plugins/packages/github/) | Developer | Repos, issues, PRs, branches, file contents |
| [instagram](plugins/packages/instagram/) | Social | Posts, media, comments, insights |
| [matrix](plugins/packages/matrix/) | Messaging | Rooms, messages, profiles |
| [outlook](plugins/packages/outlook/) | Productivity | Mail, Calendar, Teams via Microsoft Graph |
| [slack](plugins/packages/slack/) | Messaging | Channels, messages, users, search |
| [spotify](plugins/packages/spotify/) | Entertainment | Playback, playlists, library, search |
| [telegram](plugins/packages/telegram/) | Messaging | Messages, chats, photos, bots |
| [youtube](plugins/packages/youtube/) | Entertainment | Search, videos, channels, playlists |

### Contributing a plugin

1. Fork this repo
2. Copy an existing plugin as a template: `cp -r plugins/packages/github plugins/packages/myservice`
3. Update `manifest.json` — set a unique `id`, fill in auth, tools, and trigger definitions. The `$schema` field gives editor autocomplete automatically.
4. Implement `src/index.ts`
5. Build locally: `cd plugins/packages/myservice && npm install && npm run build`
6. Test: `npm test`
7. Open a pull request

### Plugin API

```typescript
export function discoverTools(config: PluginConfig): ToolDefinition[]
export async function execute(toolName: string, params: Record<string, unknown>, config: PluginConfig): Promise<ToolResult>
export async function checkTrigger(triggerType: string, config: PluginConfig, state: TriggerState): Promise<TriggerCheckResult>
export function matchEvent(triggerType: string, event: Record<string, unknown>, config: PluginConfig): boolean
export function formatLabel(triggerType: string, config: PluginConfig): string
export function buildConfig(triggerType: string): ConfigField[]
```

See [`plugins/clawdroid.d.ts`](plugins/clawdroid.d.ts) for full type definitions.

---

## Skills

A skill is a Markdown file with YAML frontmatter that provides a specialized system prompt. Users install skills into their containers from the in-app skill browser.

### Format

```markdown
---
id: my-skill
name: My Skill
description: One-line description shown in the app
author: YourName
category: development   # development | productivity | research | creative | general
featured: false
---

Your system prompt content goes here...
```

### Available skills

| Skill | Category | Description |
|-------|----------|-------------|
| [Coding Assistant](skills/coding-assistant.md) | development | Expert coding help with debugging, code review, and best practices |
| [Writing Editor](skills/writing-editor.md) | productivity | Professional writing assistance with grammar, style, and tone |
| [Research Analyst](skills/research-analyst.md) | research | Deep research and analysis with source synthesis |
| [Linux System Admin](skills/linux-sysadmin.md) | development | Linux server administration, shell scripting, and DevOps |
| [Creative Writer](skills/creative-writer.md) | creative | Creative writing, storytelling, and narrative crafting |
| [Data Analyst](skills/data-analyst.md) | research | Data analysis, visualization, and statistical insights |

### Contributing a skill

1. Fork this repo
2. Create `skills/my-skill.md` with the frontmatter and your system prompt
3. Open a pull request — CI will validate the frontmatter and regenerate `skills.json`

---

## MCPs

The MCP catalog ([`mcps/catalog.json`](mcps/catalog.json)) is a curated list of [Model Context Protocol](https://modelcontextprotocol.io) servers that users can browse and connect directly from the ClawDroid app.

Each entry includes the server name, description, transport type, and the command needed to run it (executed via the embedded Node.js runtime — no Termux required).

### Contributing an MCP entry

Add an entry to `mcps/catalog.json` following the existing format:

```json
{
  "id": "my-server",
  "name": "My Server",
  "description": "What it does",
  "author": "Author",
  "category": "utilities",
  "transport": "node-stdio",
  "command": "npx -y my-mcp-server",
  "env": { "MY_API_KEY": "" },
  "featured": false,
  "icon_url": null
}
```

---

## Releases

Publishing is fully automatic.

| Event | What happens |
|-------|-------------|
| PR opened | CI typechecks and tests changed plugins; validates skill/MCP files |
| PR merged to `main` | CI builds changed plugins and regenerates catalogs; publishes everything to the [rolling `latest` release](../../releases/tag/latest) — immediately available in the app |
| `v*` tag pushed (maintainer) | CI builds all plugins and publishes a pinned stable release |


**For contributors:** open a PR, get it reviewed and merged — your plugin is live. That's it.

The [rolling `latest` release](../../releases/tag/latest) always reflects the current state of `main` and includes:
- Per-plugin zips (`github.zip`, `telegram.zip`, etc.) + SHA-256 checksums
- `plugins.zip` — combined zip used by the ClawDroid Android build system
- `plugins.json` — the full plugin catalog consumed by the app

## License

MIT — see [LICENSE](LICENSE). By submitting a pull request, you agree that your contribution is licensed under MIT and you assign copyright to Robert Lehmann (Deathwing) per the [Contributor License Agreement](../CLA.md).
