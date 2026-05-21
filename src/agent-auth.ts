/**
 * AgentAuth
 *
 * Authentication and account management for providers.
 * Handles OAuth login/logout, API key storage, and provider discovery.
 */

import {
  authStorage,
  session,
  getCurrentModelRegistry,
  refreshModelRegistryAuthState,
  setSession,
  setModelRegistry,
  setAuthStorage,
} from './agent-state.js';
import type { ModelRegistry } from '@earendil-works/pi-coding-agent';

// ─── Types ───────────────────────────────────────────────────────────────────

type ProviderAuthSource =
  | 'stored'
  | 'runtime'
  | 'environment'
  | 'fallback'
  | 'models_json_key'
  | 'models_json_command';

type ProviderCredentialType = 'oauth' | 'api_key';

const BEDROCK_PROVIDER_ID = 'amazon-bedrock';
const CLOUDFLARE_PROVIDER_ID = 'cloudflare-workers-ai';

/** Built-in provider display names mirrored from Pi's interactive /login flow. */
const API_KEY_PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  anthropic: 'Anthropic',
  [BEDROCK_PROVIDER_ID]: 'Amazon Bedrock',
  'azure-openai-responses': 'Azure OpenAI Responses',
  cerebras: 'Cerebras',
  [CLOUDFLARE_PROVIDER_ID]: 'Cloudflare Workers AI',
  deepseek: 'DeepSeek',
  fireworks: 'Fireworks',
  google: 'Google Gemini',
  'google-vertex': 'Google Vertex AI',
  groq: 'Groq',
  huggingface: 'Hugging Face',
  'kimi-coding': 'Kimi For Coding',
  mistral: 'Mistral',
  minimax: 'MiniMax',
  'minimax-cn': 'MiniMax（中国站）',
  opencode: 'OpenCode Zen',
  'opencode-go': 'OpenCode Go',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  'vercel-ai-gateway': 'Vercel AI Gateway',
  xai: 'xAI',
  zai: 'ZAI',
};

export interface ProviderAuthStatusInfo {
  configured: boolean;
  source?: ProviderAuthSource;
  label?: string;
}

export interface OAuthProviderInfo {
  id: string;
  name: string;
  loggedIn: boolean;
  authStatus: ProviderAuthStatusInfo;
}

export interface ApiKeyProviderInfo {
  name: string;
  id: string;
  hasKey: boolean;
  authStatus: ProviderAuthStatusInfo;
  setupHint?: string;
}

export interface LoginProviderInfo {
  id: string;
  name: string;
  authType: ProviderCredentialType;
  storedCredentialType: ProviderCredentialType | null;
  authStatus: ProviderAuthStatusInfo;
  setupHint?: string;
  setupOnly: boolean;
}

export interface StoredCredentialProviderInfo {
  id: string;
  name: string;
  authType: ProviderCredentialType;
}

export interface AuthModelReconciliationResult {
  selectedModel: { id: string; provider: string; contextWindow: number } | null;
  switchedModel: boolean;
  clearedModel: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function serializeModelInfo(model: { id: string; provider: string; contextWindow: number } | null) {
  return model
    ? { id: model.id, provider: model.provider, contextWindow: model.contextWindow }
    : null;
}

function getStoredCredentialType(providerId: string): ProviderCredentialType | null {
  const credential = authStorage?.get(providerId);
  if (credential?.type === 'oauth') return 'oauth';
  if (credential?.type === 'api_key') return 'api_key';
  return null;
}

function getProviderAuthStatus(providerId: string): ProviderAuthStatusInfo {
  const status = getCurrentModelRegistry()?.getProviderAuthStatus(providerId) ?? { configured: false };
  return {
    configured: !!status.configured,
    source: status.source as ProviderAuthSource | undefined,
    label: status.label,
  };
}

function getApiKeyProviderDisplayName(providerId: string): string {
  return API_KEY_PROVIDER_DISPLAY_NAMES[providerId] ?? providerId;
}

function isApiKeyLoginProvider(providerId: string, oauthProviderIds: Set<string>): boolean {
  if (providerId in API_KEY_PROVIDER_DISPLAY_NAMES) {
    return true;
  }
  return !oauthProviderIds.has(providerId);
}

function getProviderSetupHint(providerId: string): string | undefined {
  switch (providerId) {
    case BEDROCK_PROVIDER_ID:
      return '使用 AWS 凭证或 Bearer Token，而非单个 API 密钥。';
    case CLOUDFLARE_PROVIDER_ID:
      return '除了 API 密钥外，还需要在环境中设置 CLOUDFLARE_ACCOUNT_ID。';
    default:
      return undefined;
  }
}

// ─── Provider reconciliation ─────────────────────────────────────────────────

/**
 * After auth changes, ensure the active model still points to an available model.
 */
export async function reconcileModelAfterAuthChange(): Promise<AuthModelReconciliationResult> {
  if (!session) {
    return { selectedModel: null, switchedModel: false, clearedModel: false };
  }

  refreshModelRegistryAuthState();

  const availableModels = session.modelRegistry.getAvailable();
  const currentModel = session.model;
  const matchingModel = currentModel
    ? availableModels.find(
      (model) => model.id === currentModel.id && model.provider === currentModel.provider
    ) ?? null
    : null;

  if (matchingModel) {
    if (currentModel !== matchingModel) {
      session.state.model = matchingModel;
    }
    return {
      selectedModel: serializeModelInfo(matchingModel),
      switchedModel: false,
      clearedModel: false,
    };
  }

  const fallbackModel = availableModels[0] ?? null;
  if (fallbackModel) {
    await session.setModel(fallbackModel);
    return {
      selectedModel: serializeModelInfo(fallbackModel),
      switchedModel: true,
      clearedModel: false,
    };
  }

  if (currentModel) {
    (session.state as any).model = undefined;
  }

  return {
    selectedModel: null,
    switchedModel: false,
    clearedModel: !!currentModel,
  };
}

// ─── Provider queries ───────────────────────────────────────────────────────

/**
 * Get list of available OAuth providers with login status.
 */
export function getOAuthProviders(): OAuthProviderInfo[] {
  if (!authStorage) return [];
  const providers = authStorage.getOAuthProviders();
  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    loggedIn: getStoredCredentialType(provider.id) === 'oauth',
    authStatus: getProviderAuthStatus(provider.id),
  }));
}

/**
 * Get login-capable providers.
 */
export function getLoginProviders(
  authType?: ProviderCredentialType
): LoginProviderInfo[] {
  if (!authStorage || !session) return [];

  const oauthProviders = authStorage.getOAuthProviders();
  const oauthProviderIds = new Set(oauthProviders.map((provider) => provider.id));
  const providers: LoginProviderInfo[] = [];

  if (!authType || authType === 'oauth') {
    for (const provider of oauthProviders) {
      providers.push({
        id: provider.id,
        name: provider.name,
        authType: 'oauth',
        storedCredentialType: getStoredCredentialType(provider.id),
        authStatus: getProviderAuthStatus(provider.id),
        setupHint: undefined,
        setupOnly: false,
      });
    }
  }

  if (!authType || authType === 'api_key') {
    const modelProviders = new Set(session.modelRegistry.getAll().map((model) => model.provider));
    for (const providerId of modelProviders) {
      if (!isApiKeyLoginProvider(providerId, oauthProviderIds)) continue;
      providers.push({
        id: providerId,
        name: getApiKeyProviderDisplayName(providerId),
        authType: 'api_key',
        storedCredentialType: getStoredCredentialType(providerId),
        authStatus: getProviderAuthStatus(providerId),
        setupHint: getProviderSetupHint(providerId),
        setupOnly: providerId === BEDROCK_PROVIDER_ID,
      });
    }
  }

  return providers.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get stored credentials of a specific type.
 */
export function getStoredCredentialProviders(
  authType?: ProviderCredentialType
): StoredCredentialProviderInfo[] {
  if (!authStorage) return [];

  const oauthNameById = new Map(
    authStorage.getOAuthProviders().map((provider) => [provider.id, provider.name])
  );

  const providers: StoredCredentialProviderInfo[] = [];
  for (const providerId of authStorage.list()) {
    const credential = authStorage.get(providerId);
    if (!credential) continue;
    const credentialType = credential.type === 'oauth' ? 'oauth' : 'api_key';
    if (authType && credentialType !== authType) continue;

    providers.push({
      id: providerId,
      name: credentialType === 'oauth'
        ? (oauthNameById.get(providerId) ?? providerId)
        : getApiKeyProviderDisplayName(providerId),
      authType: credentialType,
    });
  }

  return providers.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get dynamic API-key providers with their stored-key status.
 */
export function getApiKeyProviders(): ApiKeyProviderInfo[] {
  return getLoginProviders('api_key').map((provider) => ({
    name: provider.name,
    id: provider.id,
    hasKey: provider.storedCredentialType === 'api_key',
    authStatus: provider.authStatus,
    setupHint: provider.setupHint,
  }));
}

// ─── Login / Logout ─────────────────────────────────────────────────────────

/**
 * Login to an OAuth provider.
 */
export async function login(
  providerId: string,
  callbacks: {
    onAuth: (info: { url: string; instructions?: string }) => void;
    onPrompt: (prompt: { message: string; placeholder?: string; allowEmpty?: boolean }) => Promise<string>;
    onProgress?: (message: string) => void;
    onManualCodeInput?: () => Promise<string>;
    signal?: AbortSignal;
  }
): Promise<void> {
  if (!authStorage) throw new Error('[Phi] AgentManager not initialized');
  await authStorage.login(providerId, callbacks);
  refreshModelRegistryAuthState();
}

/**
 * Logout from a provider (clears stored OAuth credentials).
 */
export function logout(providerId: string): void {
  if (!authStorage) return;
  authStorage.logout(providerId);
  refreshModelRegistryAuthState();
}

/**
 * Check if a provider has credentials (API key or OAuth).
 */
export function hasAuth(providerId: string): boolean {
  if (!authStorage) return false;
  return authStorage.hasAuth(providerId);
}

/**
 * Set an API key for a provider.
 */
export function setApiKey(providerId: string, key: string): void {
  if (!authStorage) throw new Error('[Phi] AgentManager not initialized');
  authStorage.set(providerId, { type: 'api_key', key });
  refreshModelRegistryAuthState();
}

/**
 * Remove an API key for a provider.
 */
export function removeApiKey(providerId: string): void {
  if (!authStorage) return;
  authStorage.remove(providerId);
  refreshModelRegistryAuthState();
}
