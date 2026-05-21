import {
  AuthStorage,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  ModelRegistry,
  SessionManager,
  type AgentSessionEvent,
  type CreateAgentSessionRuntimeFactory,
  type SessionEntry,
  type SessionInfo,
  type SessionStats,
} from '@earendil-works/pi-coding-agent';
import { legacyGoogleProvidersExtension } from './legacy-google/index.js';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import {
  runtime, session, cwd,
  setRuntime, setSession, setSessionUnsubscribe, setAuthStorage, setModelRegistry,
  setCwdDir, clearListeners,
  bindSession, logRuntimeDiagnostics, logModelFallbackMessage,
  setLoadedExtensions,
} from './agent-state.js';
import { reconcileModelAfterAuthChange } from './agent-auth.js';

/**
 * AgentSession
 *
 * Manages the Pi AgentSessionRuntime lifecycle:
 *   initialize() → prompt/steer/abort → dispose()
 */

// ─── Auth paths ──────────────────────────────────────────────────────────────

/** Phi's own config directory — separate from pi CLI's ~/.pi/agent/ */
const PHI_CONFIG_DIR = path.join(os.homedir(), '.phi');

/** Phi stores its API keys here, independent from the pi CLI */
const PHI_AUTH_FILE = path.join(PHI_CONFIG_DIR, 'auth.json');

// ─── Lifecycle ────────────────────────────────────────────────────────────────

/**
 * Boot the Pi session runtime for the given workspace directory.
 * Called once from extension.ts activate().
 *
 * Uses SessionManager.continueRecent() so users always resume
 * the most recent conversation for this project. Creates a new
 * session if none exists.
 */
export async function initialize(workspaceCwd: string): Promise<void> {
  setCwdDir(workspaceCwd);

  // Phi uses its own auth file, separate from the pi CLI.
  // Sessions are still shared (default ~/.pi/agent/sessions/).
  const agentDir = getAgentDir();
  const storage = AuthStorage.create(PHI_AUTH_FILE);
  const registry = ModelRegistry.create(storage);
  setAuthStorage(storage);
  setModelRegistry(registry);

  const createRuntime: CreateAgentSessionRuntimeFactory = async ({
    cwd: runtimeCwd,
    sessionManager,
    sessionStartEvent,
  }) => {
    const disabledIds = vscode.workspace.getConfiguration('phi').get<string[]>('disabledExtensions') || [];
    const disabledSet = new Set(disabledIds.filter((id) => !id.startsWith('<inline:')));

    const activeFactories = [];
    if (!disabledSet.has('phi-pi.legacy-google-providers')) {
      activeFactories.push(legacyGoogleProvidersExtension);
    }

    const services = await createAgentSessionServices({
      cwd: runtimeCwd,
      agentDir,
      authStorage: storage,
      modelRegistry: registry,
      resourceLoaderOptions: {
        extensionFactories: activeFactories,
        extensionsOverride: (base) => {
          const userExtensions = base.extensions.filter((ext) => !ext.path.startsWith('<inline:'));

          setLoadedExtensions([
            {
              id: 'phi-pi.legacy-google-providers',
              name: 'Google Cloud Code Assist 和 Antigravity（旧版）',
              enabled: !disabledSet.has('phi-pi.legacy-google-providers'),
              isBuiltIn: true,
            },
            ...userExtensions.map((ext) => ({
              id: ext.path,
              name: path.basename(ext.path),
              enabled: !disabledSet.has(ext.path),
              isBuiltIn: false,
            })),
          ]);

          return {
            ...base,
            extensions: base.extensions.filter((ext) => !disabledSet.has(ext.path)),
          };
        },
      },
    });

    return {
      ...(await createAgentSessionFromServices({
        services,
        sessionManager,
        sessionStartEvent,
      })),
      services,
      diagnostics: services.diagnostics,
    };
  };

  const agentDirPath = getAgentDir();
  const r = await createAgentSessionRuntime(createRuntime, {
    cwd,
    agentDir: agentDirPath,
    sessionManager: SessionManager.continueRecent(cwd),
  });
  setRuntime(r);

  bindSession(r.session);
  await reconcileModelAfterAuthChange();
  logRuntimeDiagnostics('Session startup', r.diagnostics);
  logModelFallbackMessage('Session startup', r.modelFallbackMessage);
}

/**
 * Update the CWD when the workspace changes.
 * Does NOT restart the session — the existing session keeps its history.
 * A full restart (new session) would require calling dispose() + initialize().
 */
export function setCwd(newCwd: string): void {
  setCwdDir(newCwd);
}

/**
 * Dispose the Pi session runtime. Called from extension.ts deactivate().
 * Failing to call this leaks the agent process.
 */
export async function dispose(): Promise<void> {
  setSessionUnsubscribe(null);

  const currentRuntime = runtime;
  setRuntime(null);
  setSession(null);
  setAuthStorage(null);
  setModelRegistry(null);
  clearListeners();

  await currentRuntime?.dispose();
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export interface ImagePayload {
  type: 'image';
  data: string;     // raw base64 (NO data: prefix)
  mimeType: string; // 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
}

export interface ExtensionInfo {
  id: string;
  name: string;
  enabled: boolean;
  isBuiltIn: boolean;
}

/**
 * Send a user prompt to Pi.
 *
 * If the agent is idle → sends immediately via session.prompt()
 * If the agent is streaming → queues via session.steer() (interrupts current turn)
 *
 * Images: strips the "data:mime;base64," prefix before sending to the SDK.
 */
export async function prompt(
  text: string,
  images?: ImagePayload[]
): Promise<void> {
  if (!session) throw new Error('[Phi] AgentManager not initialized');

  const imagePayloads = images?.map((img) => ({
    type: 'image' as const,
    data: img.data.replace(/^data:[^;]+;base64,/, ''),
    mimeType: img.mimeType,
  }));

  if (session.isStreaming) {
    await session.steer(text);
  } else {
    await session.prompt(text, { images: imagePayloads });
  }
}

/**
 * Queue a message to be delivered only after the agent fully finishes.
 */
export async function followUp(text: string): Promise<void> {
  if (!session) throw new Error('[Phi] AgentManager not initialized');
  await session.followUp(text);
}

/**
 * Abort the current Pi turn immediately.
 */
export async function abort(): Promise<void> {
  if (!session) return;
  await session.abort();
}

// ─── Session management ───────────────────────────────────────────────────────

export async function getSessions(): Promise<SessionInfo[]> {
  return await SessionManager.list(cwd);
}

export async function switchSession(sessionPath: string): Promise<void> {
  if (!runtime) throw new Error('[Phi] AgentManager not initialized');
  await runtime.switchSession(sessionPath);
  bindSession(runtime.session);
  await reconcileModelAfterAuthChange();
  logRuntimeDiagnostics('Session switch', runtime.diagnostics);
  logModelFallbackMessage('Session switch', runtime.modelFallbackMessage);
}

export async function newSession(): Promise<void> {
  if (!runtime) throw new Error('[Phi] AgentManager not initialized');
  await runtime.newSession();
  bindSession(runtime.session);
  await reconcileModelAfterAuthChange();
  logRuntimeDiagnostics('New session', runtime.diagnostics);
  logModelFallbackMessage('New session', runtime.modelFallbackMessage);
}

// ─── State accessors ──────────────────────────────────────────────────────────

export function isStreaming(): boolean {
  return session?.isStreaming ?? false;
}

export function getMessages() {
  return session?.messages ?? [];
}

export function getHistoryEntries(): SessionEntry[] {
  return session?.sessionManager.getBranch() ?? [];
}

export function getSessionFile(): string {
  return session?.sessionFile ?? '';
}

export function getModel(): string {
  return session?.model?.id ?? 'unknown';
}

export function getCwd(): string {
  return cwd;
}

function serializeModelInfo(model: { id: string; provider: string; contextWindow: number } | null) {
  return model
    ? { id: model.id, provider: model.provider, contextWindow: model.contextWindow }
    : null;
}

function resolveCurrentAvailableModel() {
  if (!session) return null;
  const currentModel = session.model;
  if (!currentModel) return null;
  return session.modelRegistry.getAvailable().find(
    (model) => model.id === currentModel.id && model.provider === currentModel.provider
  ) ?? null;
}

// ─── Model & thinking ─────────────────────────────────────────────────────────

export function getState() {
  if (!session) return null;
  const model = resolveCurrentAvailableModel();
  return {
    model: serializeModelInfo(model),
    thinkingLevel: session.thinkingLevel,
    autoCompactionEnabled: session.autoCompactionEnabled,
    sessionName: session.sessionName ?? null,
  };
}

export function getAvailableModels() {
  if (!session) return [];
  return session.modelRegistry.getAvailable().map((m) => ({
    id: m.id,
    provider: m.provider,
    contextWindow: m.contextWindow,
  }));
}

export async function setModel(provider: string, modelId: string): Promise<boolean> {
  if (!session) return false;
  const models = session.modelRegistry.getAvailable();
  const target = models.find((m) => m.id === modelId && m.provider === provider);
  if (!target) return false;
  await session.setModel(target);
  return true;
}

export function cycleThinkingLevel(): string | undefined {
  if (!session) return undefined;
  return session.cycleThinkingLevel();
}

export function getSessionStats(): SessionStats | null {
  if (!session) return null;
  const stats = session.getSessionStats();

  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCacheWrite = 0;
  let totalCost = 0;

  for (const entry of session.sessionManager.getEntries()) {
    if (entry.type === 'message' && entry.message.role === 'assistant') {
      const usage = entry.message.usage;
      if (usage) {
        totalInput += usage.input || 0;
        totalOutput += usage.output || 0;
        totalCacheRead += usage.cacheRead || 0;
        totalCacheWrite += usage.cacheWrite || 0;
        if (usage.cost && usage.cost.total) {
          totalCost += usage.cost.total;
        }
      }
    }
  }

  return {
    ...stats,
    tokens: {
      input: totalInput,
      output: totalOutput,
      cacheRead: totalCacheRead,
      cacheWrite: totalCacheWrite,
      total: totalInput + totalOutput + totalCacheRead + totalCacheWrite,
    },
    cost: totalCost,
  };
}

export function getContextUsage() {
  if (!session) return null;
  return session.getContextUsage() ?? null;
}

/**
 * Rename the current session.
 */
export function setSessionName(name: string): void {
  if (!session) return;
  session.setSessionName(name);
}

/**
 * Trigger manual context compaction.
 */
export async function compact(): Promise<any> {
  if (!session) return;
  return await session.compact();
}

export function setAutoCompaction(enabled: boolean): void {
  if (!session) return;
  session.setAutoCompactionEnabled(enabled);
}
