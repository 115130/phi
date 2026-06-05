# Phi 项目汉化清单

> 自动扫描 + 人工精炼。从 46 处扫描结果中排除内部日志、模板变量、已汉化内容后得到的清单。
> 方法：按清单逐项翻译，完成后从 ⬜ 改为 ✅。

---

## 🔴 确认需要翻译

| # | 文件 | 行号 | 原文 | 译文 | 状态 |
|---|------|------|------|------|------|
| 1 | `public/markdown.js` | 77 | `Copy` | `复制` | ✅ |
| 2 | `src/editor-context.ts` | 223 | `lines ${start}-${end}` | `第${start}-${end}行` | ✅ |
| 3 | `src/editor-context.ts` | 225 | `` In \`${file}\` ${lines} (${lang}) `` | `` 在 \`${file}\` ${lines} (${lang}) `` | ✅ |
| 4 | `src/env-manager.ts` | 394 | `${env.name} is required.` | `${env.name} 是必填项。` | ✅ |
| 5 | `src/env-manager.ts` | 533 | `${setup.name}: Environment setup` | `${setup.name}: 环境设置` | ✅ |
| 6 | `src/env-manager.ts` | 587 | `${setup.name}: Optional environment` | `${setup.name}: 可选环境变量` | ✅ |

## 🟡 待确认（可能不需要翻译）

| # | 文件 | 行号 | 原文 | 说明 | 状态 |
|---|------|------|------|------|------|
| 7 | `src/env-manager.ts` | 387 | `${providerName}: ${env.label}` | label 已为中文 | ✅ 无需翻译 |
| 8 | `src/env-manager.ts` | 388 | `${env.description} (${env.name})` | description 已为中文 | ✅ 无需翻译 |
| 9 | `src/env-manager.ts` | 437 | `${setup.name}: ${env.label}` | 同 #7 | ✅ 无需翻译 |
| 10 | `public/app.js` | 539-541 | `X tokens` / `Xk tokens` / `XM tokens` | tokens 是通用术语 | ✅ 无需翻译 |
| 11 | `public/message-renderer.js` | 112 | `$${cost}` | $ 是货币符号 | ✅ 无需翻译 |

## 🟢 已确认跳过

| # | 文件 | 行号 | 原文 | 原因 |
|---|------|------|------|------|
| — | `src/agent-session.ts` | 131 | `Session startup` | console 日志，内部运维 |
| — | `src/agent-session.ts` | 235 | `Session switch` | console 日志，内部运维 |
| — | `src/agent-session.ts` | 244 | `New session` | console 日志，内部运维 |
| — | `src/agent-state.ts` | 75 | `[Phi] ... diagnostic.message` | console 日志，内部运维 |
| — | `src/ipc-bridge.ts` | 293 | `[Phi] get_tree: ...` | console 日志，内部运维 |
| — | `src/ipc-bridge.ts` | 295 | `[Phi] get_tree: postMessage...` | console 日志，内部运维 |
| — | `public/syntax-highlighter.js` | 118 | `Phi: failed to highlight...` | console 日志，内部运维 |
| — | `public/syntax-highlighter.js` | 131 | `Phi: failed to load...` | console 日志，内部运维 |
| — | `public/app.js` | 96 | `v${PI_SDK_VERSION}` | 版本号 |
