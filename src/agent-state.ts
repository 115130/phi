import type {
  AgentSession,
  AgentSessionEvent,
  AgentSessionRuntime,
  AgentSessionRuntimeDiagnostic,
  AuthStorage,
  ModelRegistry,
} from '@earendil-works/pi-coding-agent';

/**
 * AgentState
 *
 * Shared mutable state and helper functions used by all agent-* modules.
 * This is the base layer — other modules import from here, not vice versa.
 */

// ─── Shared mutable state ───────────────────────────────────────────────────

export let runtime: AgentSessionRuntime | null = null;
export let session: AgentSession | null = null;
export let sessionUnsubscribe: (() => void) | null = null;
export let authStorage: AuthStorage | null = null;
export let modelRegistry: ModelRegistry | null = null;
export let cwd: string = process.cwd();
export const listeners: Array<(event: AgentSessionEvent) => void> = [];
export let loadedExtensions: Array<{ id: string; name: string; enabled: boolean; isBuiltIn: boolean }> = [];

// ─── State setters ──────────────────────────────────────────────────────────

export function setRuntime(r: AgentSessionRuntime | null): void { runtime = r; }
export function setSession(s: AgentSession | null): void { session = s; }
export function setSessionUnsubscribe(fn: (() => void) | null): void { sessionUnsubscribe = fn; }
export function setAuthStorage(s: AuthStorage | null): void { authStorage = s; }
export function setModelRegistry(r: ModelRegistry | null): void { modelRegistry = r; }
export function setCwdDir(wd: string): void { cwd = wd; }
export function clearListeners(): void { listeners.length = 0; }
export function setLoadedExtensions(exts: typeof loadedExtensions): void { loadedExtensions = exts; }

// ─── Listener management ────────────────────────────────────────────────────

/**
 * Register a listener for Pi AgentSessionEvents.
 * Used by IpcBridge to forward events to the webview.
 * Returns an unsubscribe function.
 */
export function subscribe(
  listener: (event: AgentSessionEvent) => void
): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

// ─── Helper functions ───────────────────────────────────────────────────────

export function forwardEvent(event: AgentSessionEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

export function bindSession(nextSession: AgentSession): void {
  sessionUnsubscribe?.();
  session = nextSession;
  sessionUnsubscribe = nextSession.subscribe(forwardEvent);
}

export function logRuntimeDiagnostics(
  source: string,
  diagnostics: readonly AgentSessionRuntimeDiagnostic[]
): void {
  for (const diagnostic of diagnostics) {
    const prefix = `[Phi] ${source}: ${diagnostic.message}`;
    if (diagnostic.type === 'error') {
      console.error(prefix);
    } else if (diagnostic.type === 'warning') {
      console.warn(prefix);
    } else {
      console.info(prefix);
    }
  }
}

export function logModelFallbackMessage(source: string, message?: string): void {
  if (message) {
    console.warn(`[Phi] ${source}: ${message}`);
  }
}

export function getCurrentModelRegistry(): ModelRegistry | null {
  return modelRegistry ?? session?.modelRegistry ?? null;
}

export function refreshModelRegistryAuthState(): void {
  getCurrentModelRegistry()?.refresh();
}
