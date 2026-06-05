# Phi (φ) — VS Code 版 Pi AI 助手

<p align="center">
  <img src="assets/phi-icon.png" alt="Phi Logo" width="128" height="128">
</p>

> AI 驱动开发的黄金比例。

<p align="center">
  <img src="https://img.shields.io/badge/version-0.7.1-blue" alt="Version">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
  <a href="https://github.com/gnassro/phi/stargazers"><img src="https://img.shields.io/github/stars/gnassro/phi?style=social" alt="Stars"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/VS%20Code-^1.85.0-007ACC?logo=visual-studio-code" alt="VS Code">
  <img src="https://img.shields.io/badge/Pi%20SDK-0.70.6-purple" alt="Pi SDK">
  <img src="https://img.shields.io/badge/TypeScript-ESM-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/vibe-coded%20🤙-ff69b4" alt="Vibe Coded">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome">
</p>

<p align="center">
  给 <a href="https://github.com/gnassro/phi">仓库</a> 点个 ⭐ 来表达支持吧！❤️
</p>

Phi 将 [Pi](https://github.com/badlogic/pi-mono) AI 编码助手作为原生扩展引入 VS Code。在侧边栏中直接与能够读取、编写和编辑代码的 AI 助手对话。

> **⚠️ 注意：** Phi 是一个社区构建的扩展，**尚未**覆盖 Pi 助手的全部功能。它仍在开发中，通过 vibe coding 构建，我们欢迎所有贡献来帮助实现完整的 Pi 功能对等。详见下方 [贡献指南](#contributing)。

<p align="center">
  <img src="assets/screenshots/scr1.png" alt="Phi in action" width="700">
</p>

---

## ✨ 功能特性

### 💬 侧边栏 AI 对话
直接在 VS Code 中的全功能对话界面。发送消息、接收流式响应、实时观察助手思考和工作。助手代码块支持多种编程语言的语法高亮，并遵循您的 VS Code 主题。

### 🛠️ 工具执行卡片
精确查看助手的操作 — read、write、edit 和 bash 工具调用渲染为可折叠卡片，支持实时输出流、编辑内联差异、复制按钮和完成后自动折叠。

### 🧠 思考块
当模型在回答前进行思考时，您可以直观看到。可折叠的思考块显示助手的推理过程，可在设置中切换。

### 📂 编辑器感知上下文
Phi 知道您在做什么：
- **将选中内容添加到对话** — 选中代码，按 `⌘+` (Mac) / `Ctrl++` (Win/Linux)，或右键 → "Phi: Add to Chat"
- **将文件添加到对话** — 在资源管理器中右键文件 → "Phi: Add File to Chat"
- **附加文件** — 点击输入区 📎 按钮通过原生文件选择器附加图片或任意类型文件
- **粘贴图片** — 从剪贴板粘贴图片 (`Cmd+V`) 以内联方式附加
- **询问选中内容** — 右键选中代码 → "Phi: Ask About Selection"

上下文引用以轻量级标签形式显示仅文件名 — Pi 会自行读取完整文件内容。

### 📜 会话历史
浏览和切换历史对话，按项目分组。按名称搜索会话。支持收藏功能。恢复的对话显示完整的当前分支并标记上下文压缩点，附带可展开的压缩摘要。

### 🌿 对话树
浏览对话分支、为条目设置标签、带可选上下文摘要创建分支。完整的树状可视化，带角色图标和分支计数徽章。

### 🔧 模型与设置
- **模型下拉框** 带搜索 — 切换所有可用模型
- **思考级别** — 循环切换 关闭 / 低 / 中 / 高
- **自动压缩** — 切换自动上下文压缩
- **手动压缩** — 通过命令面板触发，带进度指示
- **实验性任务提示音** — 可选的成功完成和失败运行的提示音（仍在开发/测试中）
- **管理 Pi 扩展** — 设置中打开专用扩展管理器，可启用/禁用已加载的 Pi 扩展（包括内置的旧版 Google 提供商）
- **会话费用与 Token 用量** — 页脚实时显示，带上下文窗口可视化

### 🔑 账户与认证
- **统一登录/设置流程** — 通过 OAuth 订阅加上从 Pi 模型注册表发现的 API 密钥提供商
- **引导式提供商环境设置** — 提供商可在登录/设置过程中逐步请求所需的环境变量
- **全局或 Phi 本地环境变量** — 如果 VS Code 检测到已有的环境变量，Phi 提供使用选项；否则值可保存在 VS Code SecretStorage 中仅对 Phi 生效
- **`Phi: Add API Key` 保留为快捷方式** — 适用于内置和自定义非 OAuth 提供商，但 `Phi: Login` 是主要入口
- 存储的凭据位于 `~/.phi/auth.json` — 与 Pi CLI 认证分离；环境和 `models.json` 认证方式同样有效
- **Cloudflare Workers AI & AI Gateway** — 引导式设置所需的 `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_GATEWAY_ID`
- **Amazon Bedrock** — 引导式设置 AWS 配置文件、IAM 密钥或 Bearer Token 环境变量
- **内置旧版 Google 提供商扩展** — Phi 通过内置 Pi 扩展保留 Google Cloud Code Assist (Gemini CLI) 和 Google Antigravity，即使在较新 Pi SDK 版本中这些提供商已被移除。发布版本可在构建时嵌入 Google OAuth 凭据以实现 Pi 风格的开箱即用登录；若未嵌入，请在 **登录/设置** 过程中配置您自己的客户端 ID/密钥。请负责任地使用并遵守 Google 账户条款；该扩展可从 **设置 → 管理 Pi 扩展** 中禁用。
- **没有可用模型？** — 标题栏模型控件变为 **登录** 按钮，点击打开账户面板

### 🖥️ 自定义提供商 (Ollama, vLLM, LM Studio…)
Phi inherits full custom provider support from the Pi SDK. Add any OpenAI-compatible local or remote model by editing `~/.pi/agent/models.json` — no extension restart needed, changes are picked up next time you open the model picker.

### 维护者说明：旧版 Google OAuth 默认值
要使发布的构建版本表现得像 Pi 0.70.6，打包前将这些设置为 CI/本地构建环境密钥。对于本地测试，`scripts/build-ext.mjs` 也会从 `.env` 加载它们。它们会被嵌入生成的 `.vsix` 中，但从不提交到源码：

```text
PHI_EMBEDDED_GOOGLE_GEMINI_CLI_OAUTH_CLIENT_ID
PHI_EMBEDDED_GOOGLE_GEMINI_CLI_OAUTH_CLIENT_SECRET
PHI_EMBEDDED_GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_ID
PHI_EMBEDDED_GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_SECRET
```

设置说明见 [自定义提供商](#-custom-providers)。

### ⌨️ 键盘快捷键

| 操作 | 快捷键 |
|---|---|
| 打开 Phi 对话 | `Cmd+Shift+L` / `Ctrl+Shift+L` |
| 将选中内容添加到对话 | Select code → `⌘+` (Mac) / `Ctrl++` (Windows/Linux) |
| 中止当前轮次 | `Escape` (when panel focused) |
| 聚焦对话输入 | 在 Phi 面板内按 `/` |

### 🎨 原生 VS Code 主题
无需自定义主题 — Phi 自动遵循您的 VS Code 主题（暗色、亮色、高对比度），使用内置的 `--vscode-*` CSS 变量。

---

## 📦 安装

### 从源码安装（开发）

```bash
git clone https://github.com/gnassro/phi.git
cd phi
pnpm install              # or: npm install
pnpm run build            # or: npm run build

# 在 VS Code 中按 F5 启动扩展开发主机
```

### 打包并本地安装

```bash
# 自动先运行构建
pnpm run package          # or: npm run package
code --install-extension phi-pi-0.1.0.vsix
```

---

## 🧰 使用指南

| 操作 | 方法 |
|---|---|
| 打开 Phi 对话 | `Cmd+Shift+L` / `Ctrl+Shift+L` |
| 询问选中代码 | 右键 → "Phi: Ask About Selection" |
| 将选中内容添加到对话 | 选中代码 → `Cmd+Shift+=` |
| 将文件添加到对话 | 资源管理器中右键文件 → "Phi: Add File to Chat" |
| 附加文件 | 点击输入区 📎（图片 + 任意文件类型）|
| 粘贴图片 | 剪贴板中有图片时 `Cmd+V` / `Ctrl+V` |
| 新建会话 | 命令面板 → "Phi: New Session" |
| 切换会话 | 点击 🕐 历史按钮 → 选择会话 |
| 切换模型 | 点击标题栏中的模型下拉框 |
| 压缩上下文 | 点击命令按钮（在对话输入区）→ "压缩" |
| 查看会话统计 | 点击命令按钮（在对话输入区）→ "会话统计" |
| 登录 / 提供商设置 | 命令面板 → "Phi: Login" 或账户面板按钮 |
| 添加 API 密钥（直接快捷方式）| 命令面板 → "Phi: Add API Key" |
| 添加自定义提供商 | 编辑 `~/.pi/agent/models.json`（参见 [自定义提供商](#-custom-providers)）|

---

## ⚠️ 免责声明

此扩展处于**早期开发阶段**，不提供任何保证。请注意：

- **并非所有功能都经过充分测试** — 某些功能可能出现意外行为
- **仅在 macOS 上测试过** — Windows 和 Linux 未经测试，可能存在兼容性问题
- **使用风险自负** — 始终在接受 AI 生成的代码更改之前进行审查

如果遇到任何 bug 或问题，请在 GitHub 上 [提交 issue](https://github.com/gnassro/phi/issues)。您的反馈有助于改进扩展。

---

## 🖥️ 自定义提供商

Phi 通过 Pi SDK 的 `models.json` 配置文件支持任何 OpenAI 兼容的模型服务器（Ollama、vLLM、LM Studio、OpenRouter、代理等）。无需修改代码，无需重启扩展 — 只需编辑文件并打开模型选择器即可。

### 设置

**1. 创建或编辑 `~/.pi/agent/models.json`**

此文件与 Pi CLI 共享，因此您添加的任何提供商在两个环境中都可用。

**2. 添加您的提供商**

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "apiKey": "OLLAMA_API_KEY",
      "api": "openai-completions",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false,
        "maxTokensField": "max_tokens"
      },
      "models": [
        {
          "id": "llama3.1:8b",
          "name": "Llama 3.1 8B (Local)",
          "reasoning": false,
          "input": ["text"],
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
          "contextWindow": 128000,
          "maxTokens": 32000
        }
      ]
    }
  }
}
```

**3. 在 Phi 中打开模型选择器并选择您的模型**

新模型将立即出现 — 无需重启。

### `compat` 配置块（对本地模型很重要）

大多数本地服务器（Ollama、vLLM、LM Studio、SGLang）并未完全实现 OpenAI 规范。没有 `compat` 块，系统提示词会以 `developer` 角色发送，而本地服务器会静默忽略它 — 导致模型表现为普通聊天而非编码助手。

| 标志 | 解决的问题 |
|---|---|
| `supportsDeveloperRole: false` | 将系统提示词以 `system` 角色发送（所有服务器均支持）|
| `supportsReasoningEffort: false` | 禁用 `reasoning_effort` 参数（本地服务器不支持）|
| `maxTokensField: "max_tokens"` | 使用 `max_tokens` 而非 `max_completion_tokens` |

> **对于 Ollama、vLLM、LM Studio 及类似服务器，务必包含 `compat` 配置块。**

### 支持的 API 类型

| `api` 值 | 适用于 |
|---|---|
| `openai-completions` | Ollama、vLLM、LM Studio、OpenRouter、大多数兼容服务器 |
| `anthropic-messages` | Anthropic Claude API 或兼容代理 |
| `openai-responses` | OpenAI Responses API |
| `google-generative-ai` | Google Gemini API |

### 自定义提供商的认证

Phi 的 **添加 API 密钥** 对话框仅管理内置提供商。对于自定义提供商，请直接在 `~/.pi/agent/models.json` 中通过提供商的 `apiKey` 字段配置认证。

`apiKey` 值可以是：
- 环境变量名称，如 `OPENROUTER_API_KEY`
- 本地或私有设置的明文值

对于不需要真实密钥的本地服务器（如 Ollama），在 `models.json` 中设置 `"apiKey": "ollama"`（任意非空值均可）。

### 多个提供商

您可以定义任意数量的提供商：

```json
{
  "providers": {
    "ollama": { ... },
    "lm-studio": {
      "baseUrl": "http://localhost:1234/v1",
      "apiKey": "lm-studio",
      "api": "openai-completions",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false,
        "maxTokensField": "max_tokens"
      },
      "models": [
        { "id": "qwen2.5-coder-32b", "name": "Qwen 2.5 Coder 32B", "reasoning": false, "input": ["text"], "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }, "contextWindow": 128000, "maxTokens": 32000 }
      ]
    },
    "openrouter": {
      "baseUrl": "https://openrouter.ai/api/v1",
      "apiKey": "OPENROUTER_API_KEY",
      "api": "openai-completions",
      "models": [
        { "id": "meta-llama/llama-3.1-8b-instruct", "name": "Llama 3.1 8B (OpenRouter)", "reasoning": false, "input": ["text"], "cost": { "input": 0.1, "output": 0.1, "cacheRead": 0, "cacheWrite": 0 }, "contextWindow": 131072, "maxTokens": 8192 }
      ]
    }
  }
}
```

> 完整的 `models.json` 参考文档，请参见 [Pi SDK 文档](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/models.md)。

---

## 🏗️ 架构

Phi 是用 TypeScript + 原生 JS 构建的 VS Code 扩展：

- **扩展主机** (Node.js) — 直接运行 Pi SDK，管理会话，处理认证
- **Webview** (Chromium 沙箱) — 对话 UI、工具卡片、设置面板
- **IPC** — 所有通信通过 VS Code 内置的消息传递 (`postMessage`)

Pi SDK 在与扩展主机相同的 Node.js 进程中运行 — 无需外部服务器、无需 WebSocket、无需 HTTP。会话存储在 `~/.pi/agent/sessions/`（与 Pi CLI 共享）。

---

## 🔗 与 Pi 的关系

| 项目 | 说明 |
|---|---|
| [**Pi**](https://github.com/badlogic/pi-mono) | CLI AI 编码助手（`pi` 命令）|
| **Phi** | 将 Pi 引入编辑器的 VS Code 扩展 |

Phi 使用 [Pi SDK](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) (`@earendil-works/pi-coding-agent@0.75.4`) 直接在 VS Code 扩展主机中运行助手。

> **Pi SDK 兼容性：** Phi 基于 Pi SDK `0.73.0` 构建和测试。更新版本可能兼容但不保证，需经测试确认。

---

## 🚧 当前状态

Phi 功能可用并覆盖了核心 Pi 助手体验，但**尚未完整实现**所有 Pi 功能。以下是已包含的内容：

### ✅ 已实现的功能
- 全功能对话与流式响应
- 工具执行（read、write、edit、bash）与实时输出
- 会话历史、切换与连续性
- 对话树与分支导航
- 模型切换、思考级别、上下文压缩
- 统一订阅登录/设置 + API 密钥管理
- 编辑器上下文集成（选中内容、文件、诊断信息）
- 费用和 Token 追踪与上下文窗口可视化

欢迎贡献更多功能！参见 [贡献指南](#contributing)。

---

## 🤝 贡献指南

**Phi 是一个 vibe-coded 项目** — 使用 AI 助手（通过 Pi）构建、迭代优化，并对所有人开放。

无论您想修复 bug、添加缺失的 Pi 功能、改进 UI 还是编写测试 — 都欢迎贡献！

### 如何贡献

1. **Fork** 仓库
2. **克隆** 并安装：`pnpm install`
3. **构建**：`pnpm run build`
4. **测试**：在 VS Code 中按 F5 启动扩展开发主机
5. **提交 PR** 并清晰描述您更改了什么以及为什么

### 需要帮助的领域
- 将更多 Pi 助手功能引入 Phi
- 在不同平台（Windows、Linux）上测试
- UI/UX 改进
- 文档
- 无障碍访问

完整技术参考见 `AGENTS.md` — 它同时为人类和在此代码库上工作的 AI 助手编写。

---

## 📝 许可证

本项目采用 [MIT 许可证](LICENSE)。

---

## 🙏 致谢

基于 [Mario Zechner](https://github.com/badlogic) 开发的 [Pi](https://github.com/badlogic/pi-mono) 助手构建。