import * as vscode from 'vscode';
import * as PanelManager from './panel-manager.js';
import * as AgentManager from './agent-manager.js';
import * as IpcBridge from './ipc-bridge.js';
import * as EditorContext from './editor-context.js';
import * as EnvManager from './env-manager.js';

/**
 * Push updated accounts list to the webview.
 * Called after auth changes to auto-refresh the panel.
 */
function refreshAccountsList(): void {
  const providers = AgentManager.getOAuthProviders();
  const apiKeyProviders = AgentManager.getApiKeyProviders();
  PanelManager.send({ type: 'accounts_list', providers, apiKeyProviders });
}

function refreshAuthDependentUi(): void {
  const state = AgentManager.getState();
  PanelManager.send({ type: 'rpc_response', command: 'get_state', success: true, data: state });
}

async function handleAuthChange(): Promise<AgentManager.AuthModelReconciliationResult> {
  const result = await AgentManager.reconcileModelAfterAuthChange();
  refreshAccountsList();
  refreshAuthDependentUi();
  return result;
}

type LoginAuthType = 'oauth' | 'api_key';

function getProviderStatusDescription(provider: AgentManager.LoginProviderInfo): string {
  if (provider.authType === 'oauth') {
    if (provider.storedCredentialType === 'oauth') return '✓ 已登录';
    if (provider.storedCredentialType === 'api_key') return '已存储 API 密钥';
  } else {
    if (provider.storedCredentialType === 'api_key') return '✓ 已存储 API 密钥';
    if (provider.storedCredentialType === 'oauth') return '已存储订阅';
  }

  switch (provider.authStatus.source) {
    case 'environment':
      return provider.authStatus.label
        ? `通过 ${provider.authStatus.label} 配置`
        : '通过环境变量配置';
    case 'models_json_key':
      return '通过 ~/.pi/agent/models.json 配置';
    case 'models_json_command':
      return '通过 ~/.pi/agent/models.json 中的命令配置';
    case 'fallback':
      return provider.authStatus.label
        ? `通过 ${provider.authStatus.label} 配置`
        : '通过自定义提供商配置';
    case 'runtime':
      return provider.authStatus.label
        ? `通过 ${provider.authStatus.label} 配置`
        : '通过运行时配置';
    case 'stored':
      return provider.authType === 'oauth' ? '✓ 已登录' : '✓ 已存储 API 密钥';
    default:
      return provider.setupOnly ? '需要外部设置' : '';
  }
}

function getProviderDetail(provider: AgentManager.LoginProviderInfo): string | undefined {
  const parts: string[] = [];
  if (provider.authType === 'oauth') {
    parts.push('订阅/OAuth');
  } else if (provider.setupOnly) {
    parts.push('提供商设置');
  } else {
    parts.push('API 密钥');
  }
  if (provider.setupHint) {
    parts.push(provider.setupHint);
  }
  return parts.join(' • ') || undefined;
}

async function pickLoginAuthType(): Promise<LoginAuthType | undefined> {
  const picked = await vscode.window.showQuickPick([
    {
      label: '使用订阅',
      description: '浏览器登录 OAuth/订阅提供商',
      authType: 'oauth' as const,
    },
    {
      label: '使用 API 密钥或提供商设置',
      description: '保存 API 密钥或按提供商指引进行设置',
      authType: 'api_key' as const,
    },
  ], {
    placeHolder: '选择认证方式',
    title: 'Phi: 登录',
  });

  return picked?.authType;
}

async function pickLoginProvider(
  authType: LoginAuthType,
  options: {
    title: string;
    placeHolder: string;
    includeSetupOnly?: boolean;
    emptyMessage: string;
  }
): Promise<AgentManager.LoginProviderInfo | undefined> {
  let providers = AgentManager.getLoginProviders(authType);
  if (options.includeSetupOnly === false) {
    providers = providers.filter((provider) => !provider.setupOnly);
  }

  if (providers.length === 0) {
    vscode.window.showInformationMessage(options.emptyMessage);
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    providers.map((provider) => ({
      label: provider.name,
      description: getProviderStatusDescription(provider),
      detail: getProviderDetail(provider),
      provider,
    })),
    {
      placeHolder: options.placeHolder,
      title: options.title,
      matchOnDescription: true,
      matchOnDetail: true,
    }
  );

  return picked?.provider;
}

function getEnvSetupSuffix(result: EnvManager.ProviderEnvSetupResult): string {
  if (!result.attempted) return '';
  if (result.completed) {
    const configured = [
      ...result.configuredGlobal.map((name) => `${name}（来自全局环境）`),
      ...result.configuredLocal.map((name) => `${name}（本地设置）`),
    ];
    return configured.length > 0
      ? ` 环境已配置: ${configured.join(', ')}。`
      : '';
  }
  return result.missingRequired.length > 0
    ? ` 环境设置未完成: 缺少 ${result.missingRequired.join(', ')}。`
    : ' 环境设置未完成。';
}

async function runProviderEnvSetup(provider: AgentManager.LoginProviderInfo): Promise<EnvManager.ProviderEnvSetupResult> {
  return await EnvManager.configureProviderEnvironment(provider.id, provider.name);
}

async function runOAuthLogin(provider: AgentManager.LoginProviderInfo): Promise<void> {
  const envResult = await runProviderEnvSetup(provider);
  if (!envResult.completed) {
    vscode.window.showWarningMessage(
      `${provider.name} 登录已取消。${getEnvSetupSuffix(envResult)}`
    );
    return;
  }

  const abortController = new AbortController();
  const manualCodeCts = new vscode.CancellationTokenSource();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `正在登录 ${provider.name}…`,
      cancellable: true,
    },
    async (progress, token) => {
      token.onCancellationRequested(() => abortController.abort());

      try {
        await AgentManager.login(provider.id, {
          onAuth: (info) => {
            vscode.env.openExternal(vscode.Uri.parse(info.url));
            if (info.instructions) {
              vscode.window.showInformationMessage(info.instructions);
            }
          },
          onPrompt: async (prompt) => {
            const value = await vscode.window.showInputBox({
              prompt: prompt.message,
              placeHolder: prompt.placeholder ?? '',
              ignoreFocusOut: true,
            });
            return value ?? '';
          },
          onProgress: (message) => {
            progress.report({ message });
          },
          onManualCodeInput: async () => {
            const code = await vscode.window.showInputBox({
              prompt: '从浏览器粘贴授权码',
              placeHolder: '授权码',
              ignoreFocusOut: true,
            }, manualCodeCts.token);
            return code ?? '';
          },
          signal: abortController.signal,
        });

        manualCodeCts.cancel();
        const authResult = await handleAuthChange();
        const selectedModelSuffix = authResult.switchedModel && authResult.selectedModel
          ? ` 已切换到 ${authResult.selectedModel.provider}/${authResult.selectedModel.id}.`
          : '';
        vscode.window.showInformationMessage(
          `✓ 已成功登录 ${provider.name}。${getEnvSetupSuffix(envResult)}${selectedModelSuffix}`
        );
      } catch (err) {
        manualCodeCts.cancel();
        if (abortController.signal.aborted) {
          vscode.window.showInformationMessage('登录已取消。');
        } else {
          vscode.window.showErrorMessage(`登录失败: ${(err as Error).message}`);
        }
      } finally {
        manualCodeCts.dispose();
      }
    }
  );
}

async function runApiKeySetup(provider: AgentManager.LoginProviderInfo): Promise<void> {
  if (provider.setupOnly) {
    const envResult = await runProviderEnvSetup(provider);
    const authResult = await handleAuthChange();
    const selectedModelSuffix = authResult.switchedModel && authResult.selectedModel
      ? ` 已切换到 ${authResult.selectedModel.provider}/${authResult.selectedModel.id}.`
      : authResult.clearedModel
        ? ' 没有可用的认证模型。'
        : '';
    vscode.window.showInformationMessage(
      `${provider.name} 设置完成。${getEnvSetupSuffix(envResult)}${selectedModelSuffix}`
    );
    return;
  }

  const apiKey = await vscode.window.showInputBox({
    prompt: `输入 ${provider.name} 的 API 密钥`,
    placeHolder: 'API 密钥',
    password: true,
    ignoreFocusOut: true,
  });
  if (!apiKey) return;

  AgentManager.setApiKey(provider.id, apiKey);
  const envResult = await runProviderEnvSetup(provider);
  const authResult = await handleAuthChange();

  const parts = [`✓ 已保存 ${provider.name} 的 API 密钥。`];
  const envSuffix = getEnvSetupSuffix(envResult).trim();
  if (envSuffix) {
    parts.push(envSuffix);
  }
  if (authResult.switchedModel && authResult.selectedModel) {
    parts.push(`已切换到 ${authResult.selectedModel.provider}/${authResult.selectedModel.id}。`);
  }

  vscode.window.showInformationMessage(parts.join(' '));
}

async function runLoginFlow(options: {
  authType?: LoginAuthType;
  title: string;
  placeHolder: string;
  includeSetupOnly?: boolean;
  emptyMessage: string;
}): Promise<void> {
  const authType = options.authType ?? await pickLoginAuthType();
  if (!authType) return;

  const provider = await pickLoginProvider(authType, {
    title: options.title,
    placeHolder: options.placeHolder,
    includeSetupOnly: options.includeSetupOnly,
    emptyMessage: options.emptyMessage,
  });
  if (!provider) return;

  if (provider.authType === 'oauth') {
    await runOAuthLogin(provider);
  } else {
    await runApiKeySetup(provider);
  }
}

async function pickStoredCredentialProvider(
  authType: LoginAuthType,
  options: {
    title: string;
    placeHolder: string;
    emptyMessage: string;
  }
): Promise<AgentManager.StoredCredentialProviderInfo | undefined> {
  const providers = AgentManager.getStoredCredentialProviders(authType);
  if (providers.length === 0) {
    vscode.window.showInformationMessage(options.emptyMessage);
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    providers.map((provider) => ({
      label: provider.name,
      providerId: provider.id,
      provider,
    })),
    {
      placeHolder: options.placeHolder,
      title: options.title,
    }
  );

  return picked?.provider;
}

function getStoredCredentialProvider(
  authType: LoginAuthType,
  providerId: string,
  providerName?: string
): AgentManager.StoredCredentialProviderInfo | undefined {
  const provider = AgentManager.getStoredCredentialProviders(authType)
    .find((candidate) => candidate.id === providerId);
  if (!provider) return undefined;
  return providerName ? { ...provider, name: providerName } : provider;
}

async function confirmProviderCredentialAction(
  actionLabel: string,
  message: string
): Promise<boolean> {
  const confirmed = await vscode.window.showWarningMessage(
    message,
    { modal: true },
    actionLabel
  );
  return confirmed === actionLabel;
}

/**
 * registerCommands
 *
 * Registers all VS Code commands contributed by Phi.
 * Called once from extension.ts activate().
 *
 * NOTE: IpcBridge.initialize() is called once in extension.ts activate(),
 * NOT here. Commands just open the panel and send messages.
 */
export function registerCommands(ctx: vscode.ExtensionContext): void {
  // ── phi-pi.openChat ──────────────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phi-pi.openChat', () => {
      PanelManager.openPanel();
    })
  );

  // ── phi-pi.addSelectionToChat ────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phi-pi.addSelectionToChat', () => {
      const contextBlock = EditorContext.buildSelectionContext();
      if (!contextBlock) {
        vscode.window.showInformationMessage('[Phi] 请先选中代码。');
        return;
      }
      PanelManager.openPanel();
      PanelManager.send({ type: 'add_context', context: contextBlock });
    })
  );

  // ── phi-pi.addFileToChat ─────────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phi-pi.addFileToChat', (uri?: vscode.Uri) => {
      if (!uri) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showInformationMessage('[Phi] 未选中任何文件。');
          return;
        }
        uri = editor.document.uri;
      }
      const contextBlock = EditorContext.buildFileContext(uri);
      if (!contextBlock) {
        vscode.window.showInformationMessage('[Phi] 无法读取文件。');
        return;
      }
      PanelManager.openPanel();
      PanelManager.send({ type: 'add_context', context: contextBlock });
    })
  );

  // ── phi-pi.askAboutSelection ─────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phi-pi.askAboutSelection', async () => {
      const selectionPrompt = EditorContext.buildSelectionPrompt();
      if (!selectionPrompt) {
        vscode.window.showInformationMessage(
          '[Phi] 请先选中代码，然后使用「询问选中内容」。'
        );
        return;
      }
      PanelManager.openPanel();
      PanelManager.send({ type: 'prefill_input', text: selectionPrompt });
    })
  );

  // ── phi-pi.newSession ────────────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phi-pi.newSession', async () => {
      const confirmed = await vscode.window.showWarningMessage(
        '开始新的 Pi 会话？当前对话将被保存。',
        { modal: true },
        '新建会话'
      );
      if (confirmed === '新建会话') {
        await AgentManager.newSession();
        IpcBridge.sendSync();
        vscode.window.showInformationMessage('[Phi] 新会话已创建。');
      }
    })
  );

  // ── phi-pi.deleteSession ─────────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phi-pi.deleteSession', async (sessionPath?: string) => {
      if (!sessionPath) return;
      const answer = await vscode.window.showWarningMessage(
        "确定要删除此会话吗？它将移至系统回收站。",
        { modal: true },
        "移到回收站"
      );

      if (answer === "移到回收站") {
        try {
          const fileUri = vscode.Uri.file(sessionPath);
          await vscode.workspace.fs.delete(fileUri, { useTrash: true });
          
          // If the deleted session is the currently active one, start a new session
          const activeSessionPath = AgentManager.getSessionFile();
          if (activeSessionPath && activeSessionPath === sessionPath) {
            await AgentManager.newSession();
            IpcBridge.sendSync();
          }

          // Always refresh the sessions list
          const sessions = await AgentManager.getSessions();
          PanelManager.send({ type: 'sessions_list', sessions });
        } catch (err: any) {
          vscode.window.showErrorMessage(`删除会话失败: ${err.message}`);
        }
      }
    })
  );

  // ── phi-pi.abortSession ──────────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phi-pi.abortSession', async () => {
      if (!AgentManager.isStreaming()) return;
      await AgentManager.abort();
    })
  );

  // ── phi-pi.login ─────────────────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phi-pi.login', async () => {
      await runLoginFlow({
        title: 'Phi: 登录',
        placeHolder: '选择一个提供商',
        includeSetupOnly: true,
        emptyMessage: '[Phi] 没有可登录的提供商。',
      });
    })
  );

  // ── phi-pi.logout ────────────────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phi-pi.logout', async (providerId?: string, providerName?: string) => {
      const picked = providerId
        ? getStoredCredentialProvider('oauth', providerId, providerName)
        : await pickStoredCredentialProvider('oauth', {
          title: 'Phi: 退出登录',
          placeHolder: '选择要退出登录的提供商',
          emptyMessage: '[Phi] 尚未登录任何提供商。',
        });
      if (!picked) {
        if (providerId) vscode.window.showInformationMessage(`[Phi] ${providerName ?? providerId} 未登录。`);
        return;
      }

      if (providerId) {
        const confirmed = await confirmProviderCredentialAction(
          '退出登录',
          `确定要退出登录 ${picked.name} 吗？`
        );
        if (!confirmed) return;
      }

      AgentManager.logout(picked.id);
      const authResult = await handleAuthChange();
      const suffix = authResult.switchedModel && authResult.selectedModel
        ? ` 已切换到 ${authResult.selectedModel.provider}/${authResult.selectedModel.id}.`
        : authResult.clearedModel
          ? ' 没有可用的认证模型。'
          : '';
      vscode.window.showInformationMessage(`已退出登录: ${picked.name}。${suffix}`);
    })
  );

  // ── phi-pi.addApiKey ─────────────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phi-pi.addApiKey', async () => {
      await runLoginFlow({
        authType: 'api_key',
        title: 'Phi: 添加 API 密钥',
        placeHolder: '选择要添加 API 密钥的提供商',
        includeSetupOnly: false,
        emptyMessage: '[Phi] 没有可用的 API 密钥提供商。',
      });
    })
  );

  // ── phi-pi.removeApiKey ──────────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phi-pi.removeApiKey', async (providerId?: string, providerName?: string) => {
      const picked = providerId
        ? getStoredCredentialProvider('api_key', providerId, providerName)
        : await pickStoredCredentialProvider('api_key', {
          title: 'Phi: 删除 API 密钥',
          placeHolder: '选择要删除 API 密钥的提供商',
          emptyMessage: '[Phi] 未配置 API 密钥。',
        });
      if (!picked) {
        if (providerId) vscode.window.showInformationMessage(`[Phi] ${providerName ?? providerId} 未存储 API 密钥。`);
        return;
      }

      if (providerId) {
        const confirmed = await confirmProviderCredentialAction(
          '删除 API 密钥',
          `确定要删除 ${picked.name} 的 API 密钥吗？`
        );
        if (!confirmed) return;
      }

      AgentManager.removeApiKey(picked.id);
      const authResult = await handleAuthChange();
      const suffix = authResult.switchedModel && authResult.selectedModel
        ? ` 已切换到 ${authResult.selectedModel.provider}/${authResult.selectedModel.id}.`
        : authResult.clearedModel
          ? ' 没有可用的认证模型。'
          : '';
      vscode.window.showInformationMessage(`已删除 ${picked.name} 的 API 密钥。${suffix}`);
    })
  );

  // ── phi-pi.openTree ──────────────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phi-pi.openTree', () => {
      PanelManager.openPanel();
      // Small delay to ensure webview is ready
      setTimeout(() => {
        PanelManager.send({ type: 'open_tree' });
      }, 200);
    })
  );
}
