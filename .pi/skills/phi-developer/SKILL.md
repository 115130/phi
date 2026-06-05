---
name: phi-developer
description: Phi VS Code 扩展开发指南。在添加功能、修复 bug、测试或更新 Phi (pi-coding-agent) 扩展的 UI 时加载此技能。它解释了架构、IPC 和 VS Code 扩展约束。
---

# Phi 开发者技能

此技能为开发 **Phi VS Code 扩展**（Pi AI 编码助手的原生实现）提供基本指南和命令。

## 核心架构

Phi 运行在两个完全独立的沙箱环境中，它们**无法共享内存**：
1. **扩展主机** (`src/`)：运行 Node.js，可访问 Pi SDK (`@earendil-works/pi-coding-agent`) 和 VS Code API (`vscode`)。
2. **Webview UI** (`public/`)：运行在 Chromium 沙箱中。仅使用原生 JS 和 CSS（不使用 React、Vue 等）。无 Node.js API。

### Webview 模块结构
Webview UI 被拆分为专注的 ES6 类模块：
- `app.js` — 轻量级协调器（约 430 行）：事件循环、同步、消息队列、键盘快捷键
- `image-manager.js` — 图片粘贴、拖放、文件选择、预览渲染
- `model-picker.js` — 带搜索功能的模型下拉框、思考级别按钮
- `cost-monitor.js` — Session cost, token usage, context window visualization
- `command-palette.js` — Command palette overlay with skill injection
- `tree-panel.js` — Conversation tree rendering, navigation, labeling
- `prompt-autocomplete.js` — Slash-command autocomplete with keyboard navigation
- `panels.js` — Settings, About, Accounts, History, Skills panels

### The Golden Rules of Phi
- **Communication:** ALL data must pass back and forth via the `VscodeIPC` message bridge.
- **Theming:** Do NOT hardcode colors. Only use built-in `--vscode-*` CSS variables (e.g. `var(--vscode-editor-background)`).
- **Security:** The webview has a strict Content Security Policy (CSP). **No inline event handlers (`onclick="..."`)**. Always use `addEventListener`.

## Setup & Build Commands

Whenever you make a change to either the Extension Host (`src/`) or the Webview (`public/`), you must rebuild the project using `esbuild`.

```bash
# Install dependencies using pnpm
pnpm install

# Build everything (runs the version script, bundles extension, bundles webview)
pnpm run build

# Continuously watch and build on save
pnpm run watch

# Type-check the TypeScript files
pnpm run typecheck

# Package the extension into a standalone .vsix file
pnpm run package
```

## Adding New Features (The Pipeline)

When adding a new feature that requires UI and Backend interaction:

1. **Extension Host (`src/agent-manager.ts`):** 
   Expose the needed functionality from the Pi SDK.
2. **Message Protocol (`src/ipc-bridge.ts`):** 
   Add a new message type to `WebviewMessage` and handle the routing to `AgentManager`. Use `PanelManager.send()` to push data back to the UI.
3. **Webview UI (`public/`):**
   - For new UI components: create a new module in `public/` as an ES6 class, import and wire it in `app.js`.
   - Use `VscodeIPC.send({ type: 'your_event' })` to talk to the backend. Listen for responses with `VscodeIPC.on('your_response', (msg) => { ... })`.

## Testing Changes Locally

If you need to test the `.vsix` package in a clean VS Code instance:
```bash
# 1. Package the extension
pnpm run package

# 2. Install it in your local VS Code
code --install-extension phi-agent-0.2.0.vsix
```
*Alternatively, press **F5** inside VS Code to launch the Extension Development Host.*

## Key Documentation Files to Read
If you are modifying complex systems, ALWAYS read these files before starting:
- [AGENTS.md](../../../AGENTS.md) — The absolute master guide and ruleset for AI agents.
- [docs/architecture.md](../../../docs/architecture.md) — Full breakdown of the system design and IPC flow.
- [docs/ipc-protocol.md](../../../docs/ipc-protocol.md) — Documentation of all existing Webview ↔ Extension Host messages.
- [docs/ROADMAP.md](../../../docs/ROADMAP.md) / [TASKS.md](../../../docs/TASKS.md) — For updating the current project status.

## After Every Change — Mandatory Checklist

**You MUST do ALL of these after every code change. No exceptions.**

1. **Build** — Run `pnpm run build` and confirm it succeeds.
2. **Suggest commit** — Do NOT auto-commit. Mention that there are uncommitted changes and suggest a conventional commit message (`fix:`, `feat:`, `docs:`, etc.). Let the user decide when to commit. If the user's next request is related (follow-up fix, tweak), update the suggested commit. If unrelated, check `git status` first — if there are uncommitted changes, stop and ask to commit before starting new work.
3. **Update docs** — Check the table in AGENTS.md § "When You MUST Update Docs" and update every file that applies (AGENTS.md, TASKS.md, ROADMAP.md, ipc-protocol.md, etc.).