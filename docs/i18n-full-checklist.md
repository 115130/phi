# Phi 项目汉化清单（智能精炼版）

> 扫描范围：webview UI + extension host + Pi SDK TUI + 技能 markdown
> 排除：系统错误比较值、OAuth 浏览器页面、技术术语、console 日志
> **共 68 项**

---

## `pi-sdk/coding-agent/src/modes/interactive/components/settings-selector.ts`（18 项）

- [ ] L323 | `选项文本` | `Color theme for the interface`
- [ ] L356 | `选项文本` | `Show images`
- [ ] L357 | `选项文本` | `Render images inline in terminal`
- [ ] L363 | `选项文本` | `Image width`
- [ ] L364 | `选项文本` | `Preferred inline image width in terminal cells`
- [ ] L374 | `选项文本` | `Resize large images to 2000x2000 max for better model compatibility`
- [ ] L383 | `选项文本` | `Block images`
- [ ] L384 | `选项文本` | `Prevent images from being sent to LLM providers`
- [ ] L393 | `选项文本` | `Skill commands`
- [ ] L394 | `选项文本` | `Register skills as /skill:name commands`
- [ ] L403 | `选项文本` | `Show hardware cursor`
- [ ] L404 | `选项文本` | `Show the terminal cursor while still positioning it for IME support`
- [ ] L414 | `选项文本` | `Horizontal padding for input editor (0-3)`
- [ ] L423 | `选项文本` | `Autocomplete max items`
- [ ] L424 | `选项文本` | `Max visible items in autocomplete dropdown (3-20)`
- [ ] L433 | `选项文本` | `Clear on shrink`
- [ ] L434 | `选项文本` | `Clear empty rows when content shrinks (may cause flicker)`
- [ ] L443 | `选项文本` | `Terminal progress`

## `pi-sdk/coding-agent/src/modes/interactive/interactive-mode.ts`（50 项）

- [ ] L743 | `TUI警告` | `Migrated credentials to auth.json: ${migratedProviders.join(`
- [ ] L748 | `TUI错误` | `models.json error: ${modelsJsonError}`
- [ ] L1514 | `TUI状态` | `Forked to new session`
- [ ] L1537 | `TUI状态` | `Navigated to selected point`
- [ ] L1667 | `TUI错误` | `Shortcut handler error: ${err instanceof Error ? err.message : String(err)}`
- [ ] L2597 | `TUI警告` | `A bash command is already running. Press Esc to cancel it first.`
- [ ] L2901 | `TUI错误` | `Compaction cancelled`
- [ ] L2903 | `TUI状态` | `Auto-compaction cancelled`
- [ ] L3204 | `TUI状态` | `Session compacted ${times}`
- [ ] L3358 | `TUI状态` | `Suspend to background is not supported on Windows`
- [ ] L3428 | `TUI状态` | `No queued messages to restore`
- [ ] L3430 | `TUI状态` | `Restored ${restored} queued message${restored > 1 ?`
- [ ] L3447 | `TUI状态` | `Current model does not support thinking`
- [ ] L3451 | `TUI状态` | `Thinking level: ${newLevel}`
- [ ] L3466 | `TUI状态` | `Switched to ${result.model.name || result.model.id}${thinkingStr}`
- [ ] L3507 | `TUI状态` | `Thinking blocks: ${this.hideThinkingBlock ?`
- [ ] L3514 | `TUI警告` | `No editor configured. Set $VISUAL or $EDITOR environment variable.`
- [ ] L3716 | `TUI状态` | `Queued message for after compaction`
- [ ] L4003 | `TUI状态` | `Model: ${model.id}`
- [ ] L4110 | `TUI状态` | `No models available`
- [ ] L4169 | `TUI状态` | `Model selection saved to settings`
- [ ] L4185 | `TUI状态` | `No messages to fork from`
- [ ] L4225 | `TUI状态` | `Nothing to clone yet`
- [ ] L4238 | `TUI状态` | `Cloned to new session`
- [ ] L4250 | `TUI状态` | `No entries in session`
- [ ] L4263 | `TUI状态` | `Already at this point`
- [ ] L4331 | `TUI状态` | `Branch summarization cancelled`
- [ ] L4336 | `TUI状态` | `Navigation cancelled`
- [ ] L4425 | `TUI状态` | `Resumed session`
- [ ] L4431 | `TUI状态` | `Resume cancelled`
- [ ] L4442 | `TUI状态` | `Resumed session in current cwd`
- [ ] L4592 | `TUI错误` | `Logout failed: ${error instanceof Error ? error.message : String(error)}`
- [ ] L4644 | `TUI状态` | `${actionLabel}. Selected ${selectedModel.id}. Credentials saved to ${getAuthPath()}`
- [ ] L4648 | `TUI状态` | `${actionLabel}. Credentials saved to ${getAuthPath()}`
- [ ] L4858 | `TUI警告` | `Wait for the current response to finish before reloading.`
- [ ] L4862 | `TUI警告` | `Wait for compaction to finish before reloading.`
- [ ] L4929 | `TUI状态` | `Reloaded keybindings, extensions, skills, prompts, themes`
- [ ] L4932 | `TUI错误` | `Reload failed: ${error instanceof Error ? error.message : String(error)}`
- [ ] L4942 | `TUI状态` | `Session exported to: ${filePath}`
- [ ] L4984 | `TUI错误` | `Usage: /import <path.jsonl>`
- [ ] L4990 | `TUI状态` | `Import cancelled`
- [ ] L5006 | `TUI状态` | `Session imported from: ${inputPath}`
- [ ] L5036 | `TUI错误` | `GitHub CLI is not logged in. Run 'gh auth login' first.`
- [ ] L5040 | `TUI错误` | `GitHub CLI (gh) is not installed. Install it from https://cli.github.com/`
- [ ] L5078 | `TUI状态` | `Share cancelled`
- [ ] L5116 | `TUI状态` | `Share URL: ${previewUrl}\nGist: ${gistUrl}`
- [ ] L5128 | `TUI错误` | `No agent messages to copy yet.`
- [ ] L5134 | `TUI状态` | `Copied last agent message to clipboard`
- [ ] L5148 | `TUI警告` | `Usage: /name <name>`
- [ ] L5516 | `TUI警告` | `Nothing to compact (no messages yet)`

