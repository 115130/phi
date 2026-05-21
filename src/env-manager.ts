import * as vscode from 'vscode';
import { hasEmbeddedLegacyGoogleOAuthCredentials } from './legacy-google/oauth-credentials.js';

type EnvPreference = 'global' | 'local';

interface EnvVarDefinition {
  name: string;
  label?: string;
  description: string;
  placeholder?: string;
  sensitive?: boolean;
}

interface EnvChoiceDefinition {
  label: string;
  description: string;
  env: EnvVarDefinition[];
}

interface EnvChoiceGroupDefinition {
  prompt: string;
  choices: EnvChoiceDefinition[];
}

interface ProviderEnvSetupDefinition {
  providerId: string;
  name: string;
  intro?: string;
  requiredEnv?: EnvVarDefinition[];
  requiredChoiceGroup?: EnvChoiceGroupDefinition;
  optionalEnv?: EnvVarDefinition[];
}

export interface ProviderEnvSetupResult {
  attempted: boolean;
  completed: boolean;
  changed: boolean;
  configuredLocal: string[];
  configuredGlobal: string[];
  missingRequired: string[];
}

const PROVIDER_ENV_SETUPS: Record<string, ProviderEnvSetupDefinition> = {
  'cloudflare-ai-gateway': {
    providerId: 'cloudflare-ai-gateway',
    name: 'Cloudflare AI Gateway',
    intro: 'Cloudflare AI Gateway 除了 API 密钥外，还需要账户 ID 和网关 ID。',
    requiredEnv: [
      {
        name: 'CLOUDFLARE_ACCOUNT_ID',
        label: 'Cloudflare 账户 ID',
        description: 'Cloudflare AI Gateway 请求所需的账户 ID。',
        placeholder: 'Cloudflare 账户 ID',
      },
      {
        name: 'CLOUDFLARE_GATEWAY_ID',
        label: 'Cloudflare 网关 ID',
        description: '在 Cloudflare 控制面板中配置的网关 ID。',
        placeholder: 'my-ai-gateway',
      },
    ],
  },

  'cloudflare-workers-ai': {
    providerId: 'cloudflare-workers-ai',
    name: 'Cloudflare Workers AI',
    intro: 'Cloudflare Workers AI 除了 API 密钥外，还需要账户 ID。',
    requiredEnv: [
      {
        name: 'CLOUDFLARE_ACCOUNT_ID',
        label: 'Cloudflare 账户 ID',
        description: 'Cloudflare Workers AI 请求所需的账户 ID。',
        placeholder: 'Cloudflare 账户 ID',
      },
    ],
  },

  'azure-openai-responses': {
    providerId: 'azure-openai-responses',
    name: 'Azure OpenAI Responses',
    intro: 'Azure OpenAI 除了 API 密钥外，还需要提供基础 URL 或资源名称。',
    requiredChoiceGroup: {
      prompt: '选择如何配置 Azure OpenAI 端点。',
      choices: [
        {
          label: '使用 Azure OpenAI 基础 URL',
          description: '设置 AZURE_OPENAI_BASE_URL，例如 https://my-resource.openai.azure.com',
          env: [
            {
              name: 'AZURE_OPENAI_BASE_URL',
              label: 'Azure OpenAI 基础 URL',
              description: 'Azure OpenAI 或 Cognitive Services 端点 URL。',
              placeholder: 'https://your-resource.openai.azure.com',
            },
          ],
        },
        {
          label: '使用 Azure 资源名称',
          description: '设置 AZURE_OPENAI_RESOURCE_NAME 替代完整的基础 URL',
          env: [
            {
              name: 'AZURE_OPENAI_RESOURCE_NAME',
              label: 'Azure OpenAI 资源名称',
              description: '用于推导端点的 Azure OpenAI 资源名称。',
              placeholder: 'your-resource-name',
            },
          ],
        },
      ],
    },
    optionalEnv: [
      {
        name: 'AZURE_OPENAI_API_VERSION',
        label: 'Azure OpenAI API 版本',
        description: '可选的 API 版本覆盖。',
        placeholder: '2024-02-01',
      },
      {
        name: 'AZURE_OPENAI_DEPLOYMENT_NAME_MAP',
        label: 'Azure 部署映射',
        description: '可选的 model=deployment 映射，逗号分隔。',
        placeholder: 'gpt-4=my-gpt4,gpt-4o=my-gpt4o',
      },
    ],
  },

  'amazon-bedrock': {
    providerId: 'amazon-bedrock',
    name: 'Amazon Bedrock',
    intro: 'Amazon Bedrock 使用 AWS 凭证而非单个 API 密钥。',
    requiredChoiceGroup: {
      prompt: '选择 Amazon Bedrock 的认证方式。',
      choices: [
        {
          label: '使用 AWS 配置文件',
          description: '设置 AWS_PROFILE，可选设置 AWS_REGION。',
          env: [
            {
              name: 'AWS_PROFILE',
              label: 'AWS 配置文件',
              description: '用于 Bedrock 的 AWS 配置文件名称。',
              placeholder: 'default',
            },
          ],
        },
        {
          label: '使用 IAM 访问密钥',
          description: '设置 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY。',
          env: [
            {
              name: 'AWS_ACCESS_KEY_ID',
              label: 'AWS 访问密钥 ID',
              description: '用于 Bedrock 的 AWS 访问密钥 ID。',
              placeholder: 'AKIA...',
              sensitive: true,
            },
            {
              name: 'AWS_SECRET_ACCESS_KEY',
              label: 'AWS 秘密访问密钥',
              description: '用于 Bedrock 的 AWS 秘密访问密钥。',
              placeholder: 'AWS 秘密访问密钥',
              sensitive: true,
            },
          ],
        },
        {
          label: '使用 Bedrock Bearer Token',
          description: '设置 AWS_BEARER_TOKEN_BEDROCK。',
          env: [
            {
              name: 'AWS_BEARER_TOKEN_BEDROCK',
              label: 'Bedrock Bearer 令牌',
              description: '用于 Bedrock Converse API 访问的 Bearer 令牌。',
              placeholder: 'Bearer 令牌',
              sensitive: true,
            },
          ],
        },
      ],
    },
    optionalEnv: [
      {
        name: 'AWS_REGION',
        label: 'AWS 区域',
        description: '可选的 Bedrock AWS 区域。',
        placeholder: 'us-east-1',
      },
    ],
  },

  'google-vertex': {
    providerId: 'google-vertex',
    name: 'Google Vertex AI',
    intro: 'Google Vertex AI 需要一个 Google Cloud 项目。也可以在此处设置区域和凭证。',
    requiredEnv: [
      {
        name: 'GOOGLE_CLOUD_PROJECT',
        label: 'Google Cloud 项目',
        description: 'Vertex AI 所需的 Google Cloud 项目 ID。',
        placeholder: 'your-project-id',
      },
    ],
    optionalEnv: [
      {
        name: 'GOOGLE_CLOUD_LOCATION',
        label: 'Google Cloud 区域',
        description: '可选的 Vertex AI 区域。',
        placeholder: 'us-central1',
      },
      {
        name: 'GOOGLE_APPLICATION_CREDENTIALS',
        label: '应用凭证文件',
        description: '可选的服务账号 JSON 文件路径。',
        placeholder: '/path/to/service-account.json',
      },
    ],
  },

  'google-gemini-cli': {
    providerId: 'google-gemini-cli',
    name: 'Google Cloud Code Assist（Gemini CLI）',
    intro: 'Phi 未内置 Google OAuth 客户端凭证。请配置你自己的 OAuth 客户端 ID 和密钥来使用旧版 Google Cloud Code Assist 提供商。',
    requiredEnv: [
      {
        name: 'PHI_GOOGLE_GEMINI_CLI_OAUTH_CLIENT_ID',
        label: 'OAuth 客户端 ID',
        description: '用于 Google Cloud Code Assist / Gemini CLI 流程的 OAuth 客户端 ID。',
        placeholder: 'OAuth 客户端 ID',
        sensitive: true,
      },
      {
        name: 'PHI_GOOGLE_GEMINI_CLI_OAUTH_CLIENT_SECRET',
        label: 'OAuth 客户端密钥',
        description: '用于 Google Cloud Code Assist / Gemini CLI 流程的 OAuth 客户端密钥。',
        placeholder: 'OAuth 客户端密钥',
        sensitive: true,
      },
    ],
    optionalEnv: [
      {
        name: 'GOOGLE_CLOUD_PROJECT',
        label: 'Google Cloud 项目',
        description: '付费版 Cloud Code Assist 可选的 Google Cloud 项目。',
        placeholder: 'your-project-id',
      },
    ],
  },

  'google-antigravity': {
    providerId: 'google-antigravity',
    name: 'Google Antigravity',
    intro: 'Phi 未内置 Google OAuth 客户端凭证。请配置你自己的 OAuth 客户端 ID 和密钥来使用旧版 Google Antigravity 提供商。',
    requiredEnv: [
      {
        name: 'PHI_GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_ID',
        label: 'OAuth 客户端 ID',
        description: '用于 Google Antigravity 流程的 OAuth 客户端 ID。',
        placeholder: 'OAuth 客户端 ID',
        sensitive: true,
      },
      {
        name: 'PHI_GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_SECRET',
        label: 'OAuth 客户端密钥',
        description: '用于 Google Antigravity 流程的 OAuth 客户端密钥。',
        placeholder: 'OAuth 客户端密钥',
        sensitive: true,
      },
    ],
  },
};

let context: vscode.ExtensionContext | null = null;
const originalEnv = new Map<string, string | undefined>();

function ensureInitialized(): vscode.ExtensionContext {
  if (!context) {
    throw new Error('[Phi] EnvManager not initialized');
  }
  return context;
}

function getAllEnvNames(): string[] {
  const names = new Set<string>();
  for (const setup of Object.values(PROVIDER_ENV_SETUPS)) {
    for (const env of setup.requiredEnv ?? []) names.add(env.name);
    for (const env of setup.optionalEnv ?? []) names.add(env.name);
    for (const choice of setup.requiredChoiceGroup?.choices ?? []) {
      for (const env of choice.env) names.add(env.name);
    }
  }
  return [...names];
}

function getPreferenceKey(providerId: string, envName: string): string {
  return `phi.env.preference.${providerId}.${envName}`;
}

function getSecretKey(providerId: string, envName: string): string {
  return `phi.env.local.${providerId}.${envName}`;
}

function getEffectiveSetup(baseSetup: ProviderEnvSetupDefinition): ProviderEnvSetupDefinition {
  if (baseSetup.providerId === 'google-gemini-cli' && hasEmbeddedLegacyGoogleOAuthCredentials('google-gemini-cli')) {
    return {
      ...baseSetup,
      intro: 'Paid Cloud Code Assist can use GOOGLE_CLOUD_PROJECT.',
      requiredEnv: [],
    };
  }

  if (baseSetup.providerId === 'google-antigravity' && hasEmbeddedLegacyGoogleOAuthCredentials('google-antigravity')) {
    return {
      ...baseSetup,
      intro: undefined,
      requiredEnv: [],
    };
  }

  return baseSetup;
}

function getPreference(providerId: string, envName: string): EnvPreference | undefined {
  return context?.globalState.get<EnvPreference>(getPreferenceKey(providerId, envName));
}

async function setPreference(providerId: string, envName: string, preference: EnvPreference): Promise<void> {
  const ctx = ensureInitialized();
  await ctx.globalState.update(getPreferenceKey(providerId, envName), preference);
}

function getGlobalEnvValue(envName: string): string | undefined {
  return originalEnv.get(envName);
}

function applyGlobalEnvValue(envName: string): void {
  const value = getGlobalEnvValue(envName);
  if (value) {
    process.env[envName] = value;
  } else {
    delete process.env[envName];
  }
}

async function getLocalEnvValue(providerId: string, envName: string): Promise<string | undefined> {
  const ctx = ensureInitialized();
  return await ctx.secrets.get(getSecretKey(providerId, envName));
}

async function setLocalEnvValue(providerId: string, envName: string, value: string): Promise<void> {
  const ctx = ensureInitialized();
  await ctx.secrets.store(getSecretKey(providerId, envName), value);
  await setPreference(providerId, envName, 'local');
  process.env[envName] = value;
}

async function useGlobalEnvValue(providerId: string, envName: string): Promise<void> {
  const ctx = ensureInitialized();
  await ctx.secrets.delete(getSecretKey(providerId, envName));
  await setPreference(providerId, envName, 'global');
  applyGlobalEnvValue(envName);
}

function hasEffectiveEnv(envName: string): boolean {
  return !!process.env[envName];
}

function isChoiceConfigured(choice: EnvChoiceDefinition): boolean {
  return choice.env.every((env) => hasEffectiveEnv(env.name));
}

function getConfiguredChoice(group: EnvChoiceGroupDefinition): EnvChoiceDefinition | undefined {
  return group.choices.find(isChoiceConfigured);
}

function note(result: ProviderEnvSetupResult, envName: string, source: EnvPreference, changed: boolean): void {
  if (source === 'global') result.configuredGlobal.push(envName);
  else result.configuredLocal.push(envName);
  result.changed = result.changed || changed;
}

async function promptForLocalEnv(
  providerName: string,
  env: EnvVarDefinition,
  required: boolean
): Promise<string | undefined> {
  const value = await vscode.window.showInputBox({
    title: `${providerName}: ${env.label ?? env.name}`,
    prompt: `${env.description} (${env.name})`,
    placeHolder: env.placeholder ?? env.name,
    password: !!env.sensitive,
    ignoreFocusOut: true,
    validateInput: (input) => {
      if (required && input.trim().length === 0) {
        return `${env.name} is required.`;
      }
      return undefined;
    },
  });

  const trimmed = value?.trim();
  return trimmed || undefined;
}

async function configureEnvVar(
  setup: ProviderEnvSetupDefinition,
  env: EnvVarDefinition,
  required: boolean,
  result: ProviderEnvSetupResult
): Promise<boolean> {
  const globalValue = getGlobalEnvValue(env.name);
  const currentPreference = getPreference(setup.providerId, env.name);
  const localValue = await getLocalEnvValue(setup.providerId, env.name);

  if (globalValue) {
    const picked = await vscode.window.showQuickPick([
      {
        label: `使用全局 ${env.name}`,
        description: '在 VS Code 进程环境中检测到',
        action: 'global' as const,
      },
      ...(localValue ? [{
        label: `保留 Phi 本地的 ${env.name}`,
        description: '使用 Phi 已存储的值',
        action: 'keep-local' as const,
      }] : []),
      {
        label: `设置 Phi 本地的 ${env.name}`,
        description: '由 Phi 存储，仅在此扩展内生效',
        action: 'local' as const,
      },
      ...(!required ? [{
        label: `跳过 ${env.name}`,
        description: '保持此可选变量不变',
        action: 'skip' as const,
      }] : []),
    ], {
      title: `${setup.name}: ${env.label ?? env.name}`,
      placeHolder: `${env.description} (${env.name})`,
      ignoreFocusOut: true,
    });

    if (!picked) {
      if (required) result.missingRequired.push(env.name);
      return !required;
    }

    if (picked.action === 'global') {
      const changed = currentPreference !== 'global' || !!localValue;
      await useGlobalEnvValue(setup.providerId, env.name);
      note(result, env.name, 'global', changed);
      return true;
    }

    if (picked.action === 'keep-local') {
      process.env[env.name] = localValue!;
      note(result, env.name, 'local', false);
      return true;
    }

    if (picked.action === 'skip') {
      return true;
    }
  } else if (localValue) {
    const picked = await vscode.window.showQuickPick([
      {
        label: `保留 Phi 本地的 ${env.name}`,
        description: '使用 Phi 已存储的值',
        action: 'keep-local' as const,
      },
      {
        label: `Replace Phi-local ${env.name}`,
        description: '输入并存储新的 Phi 本地值',
        action: 'local' as const,
      },
      ...(!required ? [{
        label: `跳过 ${env.name}`,
        description: '保持此可选变量不变',
        action: 'skip' as const,
      }] : []),
    ], {
      title: `${setup.name}: ${env.label ?? env.name}`,
      placeHolder: `${env.description} (${env.name})`,
      ignoreFocusOut: true,
    });

    if (!picked) {
      if (required) result.missingRequired.push(env.name);
      return !required;
    }

    if (picked.action === 'keep-local') {
      process.env[env.name] = localValue;
      note(result, env.name, 'local', false);
      return true;
    }

    if (picked.action === 'skip') {
      return true;
    }
  }

  const value = await promptForLocalEnv(setup.name, env, required);
  if (!value) {
    if (required) result.missingRequired.push(env.name);
    return !required;
  }

  const changed = currentPreference !== 'local' || localValue !== value;
  await setLocalEnvValue(setup.providerId, env.name, value);
  note(result, env.name, 'local', changed);
  return true;
}

async function configureRequiredChoiceGroup(
  setup: ProviderEnvSetupDefinition,
  group: EnvChoiceGroupDefinition,
  result: ProviderEnvSetupResult
): Promise<boolean> {
  const configuredChoice = getConfiguredChoice(group);
  if (configuredChoice) {
    const picked = await vscode.window.showQuickPick([
      {
        label: `Use existing ${configuredChoice.label}`,
        description: configuredChoice.description,
        action: 'use-existing' as const,
      },
      {
        label: '配置其他设置',
        description: '覆盖或添加 Phi 本地环境变量',
        action: 'configure' as const,
      },
    ], {
      title: `${setup.name}: Environment setup`,
      placeHolder: '检测到现有的环境变量值。',
      ignoreFocusOut: true,
    });

    if (!picked || picked.action === 'use-existing') {
      return true;
    }
  }

  const pickedChoice = await vscode.window.showQuickPick(
    group.choices.map((choice) => ({
      label: choice.label,
      description: choice.description,
      choice,
    })),
    {
      title: `${setup.name}: Environment setup`,
      placeHolder: group.prompt,
      ignoreFocusOut: true,
      matchOnDescription: true,
    }
  );

  if (!pickedChoice) {
    const envNames = group.choices.flatMap((choice) => choice.env.map((env) => env.name));
    result.missingRequired.push(...envNames);
    return false;
  }

  for (const env of pickedChoice.choice.env) {
    const ok = await configureEnvVar(setup, env, true, result);
    if (!ok) return false;
  }

  return true;
}

async function configureOptionalEnv(setup: ProviderEnvSetupDefinition, result: ProviderEnvSetupResult): Promise<void> {
  const optionalEnv = setup.optionalEnv ?? [];
  if (optionalEnv.length === 0) return;

  const shouldConfigure = await vscode.window.showQuickPick([
    {
      label: '跳过可选环境变量',
      description: '你可以稍后通过运行 登录/设置 再次配置。',
      action: 'skip' as const,
    },
    {
      label: '配置可选环境变量',
      description: optionalEnv.map((env) => env.name).join(', '),
      action: 'configure' as const,
    },
  ], {
    title: `${setup.name}: Optional environment`,
    placeHolder: '是否要配置可选的提供商环境变量？',
    ignoreFocusOut: true,
  });

  if (shouldConfigure?.action !== 'configure') return;

  for (const env of optionalEnv) {
    await configureEnvVar(setup, env, false, result);
  }
}

export async function initialize(ctx: vscode.ExtensionContext): Promise<void> {
  context = ctx;
  if (originalEnv.size === 0) {
    for (const envName of getAllEnvNames()) {
      originalEnv.set(envName, process.env[envName]);
    }
  }
  await applyConfiguredEnvironment();
}

export async function applyConfiguredEnvironment(): Promise<void> {
  ensureInitialized();

  for (const setup of Object.values(PROVIDER_ENV_SETUPS)) {
    const allEnv = [
      ...(setup.requiredEnv ?? []),
      ...(setup.optionalEnv ?? []),
      ...(setup.requiredChoiceGroup?.choices.flatMap((choice) => choice.env) ?? []),
    ];

    for (const env of allEnv) {
      const preference = getPreference(setup.providerId, env.name);
      if (preference === 'local') {
        const value = await getLocalEnvValue(setup.providerId, env.name);
        if (value) process.env[env.name] = value;
      } else if (preference === 'global') {
        applyGlobalEnvValue(env.name);
      }
    }
  }
}

export function hasProviderEnvironmentSetup(providerId: string): boolean {
  return providerId in PROVIDER_ENV_SETUPS;
}

export async function configureProviderEnvironment(
  providerId: string,
  providerName?: string
): Promise<ProviderEnvSetupResult> {
  const baseSetup = PROVIDER_ENV_SETUPS[providerId];
  const result: ProviderEnvSetupResult = {
    attempted: !!baseSetup,
    completed: true,
    changed: false,
    configuredLocal: [],
    configuredGlobal: [],
    missingRequired: [],
  };

  if (!baseSetup) return result;
  const effectiveSetup = getEffectiveSetup(baseSetup);
  const setup: ProviderEnvSetupDefinition = providerName && providerName !== effectiveSetup.name
    ? { ...effectiveSetup, name: providerName }
    : effectiveSetup;

  if (setup.intro) {
    const proceed = await vscode.window.showInformationMessage(
      setup.intro,
      { modal: false },
      '继续设置',
      '跳过'
    );
    if (proceed !== '继续设置') {
      const requiredNames = [
        ...(setup.requiredEnv ?? []).map((env) => env.name),
        ...(setup.requiredChoiceGroup?.choices.flatMap((choice) => choice.env.map((env) => env.name)) ?? []),
      ];
      result.missingRequired.push(...requiredNames);
      result.completed = requiredNames.length === 0;
      return result;
    }
  }

  for (const env of setup.requiredEnv ?? []) {
    const ok = await configureEnvVar(setup, env, true, result);
    if (!ok) {
      result.completed = false;
      return result;
    }
  }

  if (setup.requiredChoiceGroup) {
    const ok = await configureRequiredChoiceGroup(setup, setup.requiredChoiceGroup, result);
    if (!ok) {
      result.completed = false;
      return result;
    }
  }

  await configureOptionalEnv(setup, result);
  result.completed = result.missingRequired.length === 0;
  return result;
}
