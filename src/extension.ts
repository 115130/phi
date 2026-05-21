import * as vscode from 'vscode';
import * as AgentManager from './agent-manager.js';
import * as PanelManager from './panel-manager.js';
import * as IpcBridge from './ipc-bridge.js';
import { registerCommands } from './commands.js';
import * as EditorContext from './editor-context.js';
import * as EnvManager from './env-manager.js';

/**
 * Called by VS Code when the extension activates.
 * Activation is triggered by "onStartupFinished" — runs shortly after
 * VS Code finishes loading the workspace.
 *
 * Boot order:
 *  1. Determine the workspace CWD
 *  2. Initialize Phi-local provider environment variables
 *  3. Initialize AgentManager (boots Pi SDK runtime)
 *  4. Initialize PanelManager (registers webview factory)
 *  5. Wire Pi events → IpcBridge → Webview
 *  6. Register all VS Code commands
 */
export async function activate(ctx: vscode.ExtensionContext): Promise<void> {
  console.log('[Phi] Activating...');

  // Determine CWD — use first workspace folder, fall back to process.cwd()
  const cwd =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

  // 1. Apply Phi-local provider environment before the Pi SDK boots
  try {
    await EnvManager.initialize(ctx);
  } catch (err) {
    vscode.window.showWarningMessage(
      `[Phi] 无法应用提供商环境设置: ${(err as Error).message}`
    );
  }

  // 2. Boot the Pi agent runtime
  try {
    await AgentManager.initialize(cwd);
    console.log(`[Phi] Pi runtime ready. CWD: ${cwd}`);
  } catch (err) {
    vscode.window.showErrorMessage(
      `[Phi] 启动 Pi 会话失败: ${(err as Error).message}`
    );
    return;
  }

  // 3. Initialize the webview panel factory (pass extensionUri for asset loading)
  PanelManager.initialize(ctx);

  // 4. Initialize IPC bridge IMMEDIATELY so it's ready when the webview opens
  // (The sidebar view can open before any command is called)
  IpcBridge.initialize();

  // 5. Wire Pi SDK events → IpcBridge so they reach the webview
  AgentManager.subscribe((event) => {
    IpcBridge.forwardPiEvent(event);
  });

  // 6. Register all commands (phi-pi.openChat, phi-pi.askAboutSelection, etc.)
  registerCommands(ctx);

  // 7. Register floating "Chat ⌘+" button on text selection
  const selectionButtonDisposables = EditorContext.registerSelectionButton();
  ctx.subscriptions.push(...selectionButtonDisposables);

  // 8. Add a status bar button to quickly open Phi chat
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    1000
  );
  statusBarItem.text = '$(comment-discussion) Phi';
  statusBarItem.tooltip = '打开 Phi 聊天';
  statusBarItem.command = 'phi-pi.openChat';
  statusBarItem.show();
  ctx.subscriptions.push(statusBarItem);

  // 9. On first activation, move Phi to the secondary (right) sidebar
  const hasMovedToRight = ctx.globalState.get<boolean>('phi.movedToSecondarySidebar');
  if (!hasMovedToRight) {
    ctx.globalState.update('phi.movedToSecondarySidebar', true);
    setTimeout(async () => {
      try {
        // Focus the Phi view (creates it if needed)
        await vscode.commands.executeCommand('phi-pi.chatView.focus');
        // Small delay for the view to render
        await new Promise(r => setTimeout(r, 300));
        // Move the focused view to the secondary sidebar
        await vscode.commands.executeCommand(
          'workbench.action.moveFocusedView',
          { destination: 'workbench.auxiliarybar' }
        );
      } catch {
        // If programmatic move fails, show a tip
        vscode.window.showInformationMessage(
          '提示：右键点击侧边栏的 Phi 图标 → 「移动到辅助侧边栏」可将其放在右侧。',
          '知道了'
        );
      }
    }, 1500);
  }

  // 10. Watch for workspace folder changes (user adds/removes a folder)
  ctx.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      const newCwd =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
      AgentManager.setCwd(newCwd);
    })
  );

  console.log('[Phi] Activation complete.');
}

/**
 * Called by VS Code when the extension deactivates (VS Code closing,
 * extension disabled, or developer reloads the Extension Host).
 *
 * Must dispose the Pi runtime to avoid leaking agent processes.
 */
export async function deactivate(): Promise<void> {
  console.log('[Phi] Deactivating — disposing Pi session runtime...');
  await AgentManager.dispose();
}
