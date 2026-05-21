import * as vscode from 'vscode';
import { getNonce } from './utils.js';

/**
 * PanelManager
 *
 * Manages the Phi chat as a WebviewViewProvider (sidebar view).
 * This ensures Phi lives in the sidebar — files never open inside it.
 *
 * Rules:
 * - Registered as a WebviewViewProvider for the "phi-pi.chatView" view.
 * - All assets (JS, CSS) are loaded from extensionUri (local files, no CDN).
 * - The webview HTML must include a CSP nonce on all <script> tags.
 */

let extensionCtx: vscode.ExtensionContext | null = null;
let currentView: vscode.WebviewView | null = null;

// Listeners registered for when the view sends a message to the extension host
type MessageHandler = (message: Record<string, unknown>) => void;
const messageHandlers: MessageHandler[] = [];

/**
 * The WebviewViewProvider that VS Code calls when the view container is shown.
 */
class PhiChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'phi-pi.chatView';

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _extensionMode: vscode.ExtensionMode
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    currentView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'dist', 'public'),
      ],
    };

    webviewView.webview.html = buildWebviewHtml(
      webviewView.webview,
      this._extensionUri,
      this._extensionMode
    );

    // Route inbound messages to registered handlers
    webviewView.webview.onDidReceiveMessage((message: Record<string, unknown>) => {
      for (const handler of messageHandlers) {
        handler(message);
      }
    });

    // Clean up reference when view is disposed
    webviewView.onDidDispose(() => {
      currentView = null;
    });
  }
}

/**
 * Initialize PanelManager. Must be called once from extension.ts activate().
 * Registers the WebviewViewProvider for the sidebar.
 */
export function initialize(ctx: vscode.ExtensionContext): void {
  extensionCtx = ctx;

  const provider = new PhiChatViewProvider(ctx.extensionUri, ctx.extensionMode);
  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      PhiChatViewProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );
}

/**
 * Open / reveal the Phi chat view.
 * Focuses the sidebar view; VS Code will call resolveWebviewView if needed.
 */
export function openPanel(): void {
  // This command focuses the view container, triggering resolveWebviewView
  vscode.commands.executeCommand('phi-pi.chatView.focus');
}

/**
 * Get the current webview view, or null if not resolved.
 */
export function getView(): vscode.WebviewView | null {
  return currentView;
}

/**
 * Send a message from the extension host to the webview.
 * Silently does nothing if the view is not open.
 * Returns a promise that resolves to true if delivered.
 */
export async function send(message: Record<string, unknown>): Promise<boolean> {
  if (!currentView) return false;
  return currentView.webview.postMessage(message);
}

/**
 * Register a handler for messages coming FROM the webview TO the extension host.
 * Used by IpcBridge to receive user actions (prompt, abort, etc.).
 */
export function onMessage(handler: MessageHandler): void {
  messageHandlers.push(handler);
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  extensionMode: vscode.ExtensionMode
): string {
  const nonce = getNonce();
  const cacheBust = Date.now();
  const webviewMode = extensionMode === vscode.ExtensionMode.Development ? 'development' : 'production';

  // Convert local file URIs to webview-safe URIs
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'public', 'app.js')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'public', 'style.css')
  );

  return /* html */ `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="
      default-src 'none';
      script-src 'nonce-${nonce}';
      style-src ${webview.cspSource} 'unsafe-inline';
      img-src ${webview.cspSource} data: blob:;
      font-src ${webview.cspSource};
    ">
  <link rel="stylesheet" href="${styleUri}?v=${cacheBust}">
  <title>Phi-Pi（φ）</title>
</head>
<body data-extension-mode="${webviewMode}">
  <div class="app-layout">

    <!-- ── Header ── -->
    <div class="header">
      <div class="header-left">
        <div class="model-dropdown" id="model-dropdown">
          <button class="model-dropdown-btn" id="model-dropdown-btn" title="切换模型">
            <span class="model-dropdown-label" id="model-dropdown-label">模型</span>
            <svg class="model-dropdown-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="model-dropdown-menu hidden" id="model-dropdown-menu"></div>
        </div>
        <button class="thinking-tag" id="thinking-btn" title="切换推理级别">关</button>
      </div>

      <div class="header-right">
        <button class="icon-btn has-tooltip" id="new-chat-btn" aria-label="新建聊天" data-tooltip="新建聊天">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14"/><path d="M5 12h14"/>
          </svg>
        </button>
        <button class="icon-btn has-tooltip" id="history-btn" aria-label="会话历史" data-tooltip="历史">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
          </svg>
        </button>
        <button class="icon-btn has-tooltip" id="tree-btn" aria-label="对话树" data-tooltip="对话树">
          <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"></path>
          </svg>
        </button>
        <button class="icon-btn has-tooltip" id="skills-btn" aria-label="已加载技能" data-tooltip="技能">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5Z"></path>
            <path d="m2 17 10 5 10-5"></path>
            <path d="m2 12 10 5 10-5"></path>
          </svg>
        </button>
        <button class="icon-btn has-tooltip" id="settings-btn" aria-label="设置" data-tooltip="设置">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="icon-btn has-tooltip" id="accounts-btn" aria-label="账户" data-tooltip="账户">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/>
            <path d="M12.1207 12.78C12.0507 12.77 11.9607 12.77 11.8807 12.78C10.1207 12.72 8.7207 11.28 8.7207 9.50998C8.7207 7.69998 10.1807 6.22998 12.0007 6.22998C13.8107 6.22998 15.2807 7.69998 15.2807 9.50998C15.2707 11.28 13.8807 12.72 12.1207 12.78Z"/>
            <path d="M18.7398 19.3801C16.9598 21.0101 14.5998 22.0001 11.9998 22.0001C9.39977 22.0001 7.03977 21.0101 5.25977 19.3801C5.35977 18.4401 5.95977 17.5201 7.02977 16.8001C9.76977 14.9801 14.2498 14.9801 16.9698 16.8001C18.0398 17.5201 18.6398 18.4401 18.7398 19.3801Z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Messages area ── -->
    <div class="messages" id="messages">
      <div class="typing-indicator hidden" id="typing-indicator">
        <span class="typing-text" id="typing-text">思考中</span>
        <div class="typing-dots">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>

    <!-- ── Scroll to bottom ── -->
    <button class="scroll-bottom-btn hidden" id="scroll-bottom-btn">
      <span class="scroll-bottom-badge hidden" id="scroll-bottom-badge">新消息</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
      </svg>
    </button>

    <!-- ── Input area ── -->
    <div class="input-area">
      <div class="queued-messages hidden" id="queued-messages"></div>
      <div class="image-previews hidden" id="image-previews"></div>
      
      <div id="autocomplete-popup" class="autocomplete-popup hidden"></div>

      <form id="chat-form">
        <div class="input-left-actions">
          <button type="button" class="input-icon-btn" id="command-btn"
            title="命令" aria-label="打开命令" tabindex="-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/>
              <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>
            </svg>
          </button>
          <button type="button" class="input-icon-btn" id="attach-btn"
            title="附件" aria-label="附件" tabindex="-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input type="file" id="file-input" multiple style="display:none">
        </div>

        <div class="input-bubble">
          <div id="message-input" contenteditable="true"
            aria-placeholder="给 Pi 发消息…（Enter 发送，Shift+Enter 换行）">
          </div>
        </div>

        <div class="input-actions">
          <button type="submit" id="send-btn" title="发送消息" tabindex="-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
          <button type="button" id="abort-btn" class="hidden" title="中断（Esc）" tabindex="-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          </button>
        </div>
      </form>

      <!-- Keybinding hints -->
      <div class="keybinding-hints" id="keybinding-hints">
        <span class="hint-item"><kbd>Esc</kbd> 中止</span>
        <span class="hint-item"><kbd>⌘L</kbd> 打开</span>
        <span class="hint-item"><kbd>⌘⇧=</kbd> 添加选中</span>
        <span class="hint-item"><kbd>↑</kbd> 编辑上条消息</span>
      </div>

      <!-- Context usage footer -->
      <div class="input-footer">
        <div class="pill session-cost" id="session-cost" title="会话费用"></div>
        <div class="input-footer-ctx" id="input-footer-ctx">
          <button class="ctx-usage-btn" id="token-usage" title="点击查看上下文详情"></button>
          <div class="context-viz hidden" id="context-viz">
            <div class="context-viz-title">上下文窗口</div>
            <div class="context-bar" id="context-bar"></div>
            <div class="context-legend" id="context-legend"></div>
            <div class="context-viz-footer">
              <span id="context-viz-used"></span>
              <span id="context-viz-total"></span>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- ── Settings Overlay ── -->
  <div class="settings-overlay hidden" id="settings-overlay"></div>
  <div class="settings-panel hidden" id="settings-panel">
    <div class="settings-header">
      <h3>设置</h3>
      <button class="settings-close" id="settings-close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="settings-body">
      <div class="settings-section">
        <div class="settings-section-title">代理</div>
        <div class="settings-row">
          <span class="settings-label">自动压缩</span>
          <button class="settings-toggle" id="toggle-auto-compact"></button>
        </div>
        <div class="settings-row">
          <span class="settings-label">推理级别</span>
          <button class="settings-value-btn" id="btn-thinking-level"></button>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">显示</div>
        <div class="settings-row">
          <span class="settings-label">显示思考</span>
          <button class="settings-toggle on" id="toggle-show-thinking"></button>
        </div>
        <div class="settings-row settings-row-stack">
          <div class="settings-row-text">
            <span class="settings-label">任务提示音</span>
            <span class="settings-meta">实验性 — 仍在开发和测试中</span>
          </div>
          <button class="settings-toggle" id="toggle-completion-sound"></button>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">扩展</div>
        <button class="settings-nav-row" id="manage-extensions-btn">
          <span class="settings-label">管理 Pi 扩展</span>
          <span class="settings-nav-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </span>
        </button>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">关于</div>
        <div class="settings-row" style="cursor: pointer;" id="about-info-btn">
          <span class="settings-label">扩展信息</span>
          <span style="opacity: 0.5; font-size: 12px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Extensions Overlay ── -->
  <div class="settings-overlay hidden" id="extensions-overlay"></div>
  <div class="settings-panel hidden" id="extensions-panel">
    <div class="settings-header">
      <h3>Pi 扩展</h3>
      <button class="settings-close" id="extensions-close" aria-label="关闭 Pi 扩展">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="settings-body extensions-body">
      <div id="settings-extensions-list" class="extensions-list">
        <div class="extensions-loading">正在加载扩展…</div>
      </div>
    </div>
  </div>

  <!-- ── About Modal ── -->
  <div class="settings-overlay hidden" id="about-overlay"></div>
  <div class="about-modal hidden" id="about-modal">
    <div class="settings-header">
      <h3>关于 Phi</h3>
      <button class="settings-close" id="about-close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="about-body">
      <div class="about-name">Phi-Pi（φ）— AI 编码助手</div>
      <div class="about-desc">Pi 编码助手，原生集成在 VS Code 中。</div>
      <div class="about-table">
        <div class="about-row"><span class="about-key">版本</span><span class="about-val" id="about-version">—</span></div>
        <div class="about-row"><span class="about-key">Pi SDK</span><span class="about-val" id="about-pi-version">—</span></div>
        <div class="about-row"><span class="about-key">作者</span><span class="about-val">Pi 社区（原 gnassro）</span></div>
        <div class="about-row"><span class="about-key">许可证</span><span class="about-val">MIT</span></div>
        <div class="about-row"><span class="about-key">引擎</span><span class="about-val">VS Code ≥1.85</span></div>
      </div>
      <div class="about-links">
        <button class="about-link-btn" id="about-report-issue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          报告问题
        </button>
        <button class="about-link-btn" id="about-github">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
          GitHub
        </button>
      </div>
    </div>
  </div>

  <!-- ── Accounts Overlay ── -->
  <div class="settings-overlay hidden" id="accounts-overlay"></div>
  <div class="settings-panel hidden" id="accounts-panel">
    <div class="settings-header">
      <h3>账户</h3>
      <button class="settings-close" id="accounts-close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="settings-body" style="padding: 0;">
      <div id="accounts-list" class="accounts-list"></div>
      <div class="accounts-actions">
        <button class="accounts-action-btn" id="btn-login">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          登录 / 设置
        </button>
      </div>
    </div>
  </div>

  <!-- ── Skills Overlay ── -->
  <div class="settings-overlay hidden" id="skills-overlay"></div>
  <div class="settings-panel hidden" id="skills-panel">
    <div class="settings-header">
      <h3>已加载技能</h3>
      <button class="icon-btn" id="close-skills-btn" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
    </div>
    <div class="settings-body" id="skills-list" style="padding: 12px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto;">
      <div style="opacity:0.5; text-align:center; padding: 20px 0;">正在加载技能…</div>
    </div>
  </div>

  <!-- ── History Overlay ── -->
  <div class="settings-overlay hidden" id="history-overlay"></div>
  <div class="settings-panel hidden" id="history-panel">
    <div class="settings-header">
      <h3>会话历史</h3>
      <button class="settings-close" id="history-close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="settings-body" style="padding: 0;">
      <div style="padding: 8px; border-bottom: 1px solid var(--vscode-widget-border, rgba(127,127,127,0.15));">
        <input type="text" id="session-search-input" class="sidebar-search-input" placeholder="搜索会话…" autocomplete="off" />
      </div>
      <div class="session-list" id="session-list" style="flex:1; overflow-y:auto; padding:8px;">
        <div class="session-loading">正在加载会话…</div>
      </div>
    </div>
  </div>

  <!-- ── Tree Panel ── -->
  <div class="settings-overlay hidden" id="tree-overlay"></div>
  <div class="settings-panel hidden" id="tree-panel">
    <div class="settings-header">
      <h3>对话树</h3>
      <button class="settings-close" id="tree-close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="settings-body" style="padding: 0;">
      <div class="tree-toolbar">
        <select id="tree-filter" class="tree-filter-select">
          <option value="default">用户 + 助手</option>
          <option value="user-only">仅用户</option>
          <option value="labeled-only">仅标记</option>
          <option value="all">全部</option>
        </select>
      </div>
      <div class="tree-view" id="tree-view">
        <div class="tree-loading">正在加载对话树…</div>
      </div>
    </div>
  </div>

  <!-- ── Command Palette ── -->
  <div class="command-palette-overlay hidden" id="command-palette-overlay"></div>
  <div class="command-palette hidden" id="command-palette">
    <div class="command-palette-header">命令</div>
    <div class="command-list" id="command-list"></div>
  </div>

  <script type="module" nonce="${nonce}" src="${scriptUri}?v=${cacheBust}"></script>
</body>
</html>`;
}
