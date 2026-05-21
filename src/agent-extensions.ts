/**
 * AgentExtensions
 *
 * Pi extension and skill management.
 */

import { session } from './agent-state.js';
import { loadedExtensions, setLoadedExtensions } from './agent-state.js';
import { dispose, initialize } from './agent-session.js';
import * as vscode from 'vscode';

// ─── Extensions ──────────────────────────────────────────────────────────────

/**
 * Get all loaded extensions.
 */
export function getExtensionsList(): Array<{ id: string; name: string; enabled: boolean; isBuiltIn: boolean }> {
  return loadedExtensions;
}

/**
 * Toggle an extension's enabled state and restart the runtime to apply changes.
 */
export async function toggleExtension(id: string, enabled: boolean): Promise<void> {
  const config = vscode.workspace.getConfiguration('phi');
  let disabledIds = [...(config.get<string[]>('disabledExtensions') || [])]
    .filter((x) => !x.startsWith('<inline:'));

  if (enabled) {
    disabledIds = disabledIds.filter((x) => x !== id);
  } else if (!disabledIds.includes(id)) {
    disabledIds.push(id);
  }

  await config.update('disabledExtensions', disabledIds, vscode.ConfigurationTarget.Global);

  // Restart runtime to apply extension changes
  await dispose();
  await initialize(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd());
}

// ─── Skills ──────────────────────────────────────────────────────────────────

/**
 * Get all available skills.
 */
export function getSkills() {
  if (!session) return [];
  return session.resourceLoader.getSkills().skills;
}
