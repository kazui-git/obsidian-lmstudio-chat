# LM Studio Chat

An [Obsidian](https://obsidian.md) plugin that adds a sidebar chat panel for talking to a **locally-hosted LLM** running in [LM Studio](https://lmstudio.ai/).

No cloud, no API keys, no data leaving your machine — your model runs on your own hardware, and Obsidian just talks to it over a local HTTP endpoint.

## Status

🚧 **Early development (v0.1.0).** The chat panel, thread management, and LM Studio integration are being built out. Not yet ready for general use.

## Features (planned for v1)

- 💬 Chat panel in Obsidian's right sidebar
- 🧵 Thread management — start new, switch between, and delete conversations
- 🏠 Talks to any OpenAI-compatible local server (LM Studio by default)
- ⚙️ Configurable endpoint, port, model, system prompt, and temperature
- 💾 Threads persist across Obsidian restarts

## Requirements

- [Obsidian](https://obsidian.md) 1.0.0 or newer
- [LM Studio](https://lmstudio.ai/) (or any OpenAI-compatible local server) running on your machine

## Development setup

This plugin is built with the standard Obsidian toolchain: TypeScript + esbuild.

### Prerequisites

- [Node.js](https://nodejs.org/) LTS
- A running LM Studio server (default: `http://127.0.0.1:1234`)
- An Obsidian vault to test against

### Install & build

```bash
# 1. Install dependencies
npm install

# 2. Tell the build where your vault lives.
#    Copy the example and edit it with your vault's absolute path:
cp dev-config.example.json dev-config.json
#    Then edit dev-config.json:
#    { "vaultPath": "C:\\path\\to\\your\\vault" }

# 3. Build (one-shot production build)
npm run build

#    Or start watch mode (rebuilds on every file save)
npm run dev
```

The build emits `main.js`, `manifest.json`, and `styles.css` **directly into your vault** at `<vault>/.obsidian/plugins/lmstudio-chat/`. Reload Obsidian (or toggle the plugin off/on) to pick up changes.

### Manual installation (for end users, later)

Once a release exists, copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/lmstudio-chat/` and enable the plugin in Obsidian's Community Plugins settings.

## License

MIT
