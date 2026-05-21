/**
 * AgentTree
 *
 * Session tree navigation, serialization, and labeling.
 */

import { session } from './agent-state.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Local mirror of SessionTreeNode */
interface SessionTreeNode {
  entry: any;
  children: SessionTreeNode[];
  label?: string;
}

/**
 * Serialized tree node for IPC — flat structure (no nested children).
 * The webview reconstructs the hierarchy using parentId + childIds.
 */
export interface SerializedTreeNode {
  id: string;
  parentId: string | null;
  type: string;
  label?: string;
  preview: string;
  role?: string;
  childIds: string[];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the session tree structure + current leaf ID.
 * Returns a flat array of nodes (no nesting) to avoid structured clone
 * failures for deeply nested trees.
 */
export function getTree(): { nodes: SerializedTreeNode[]; leafId: string | null } {
  if (!session) return { nodes: [], leafId: null };
  const sm = session.sessionManager;
  const rawTree = sm.getTree();
  const leafId = sm.getLeafId();
  return {
    nodes: serializeTreeFlat(rawTree),
    leafId,
  };
}

/**
 * Navigate to a different point in the tree.
 */
export async function navigateTree(
  targetId: string,
  options: {
    summarize?: boolean;
    customInstructions?: string;
  } = {}
): Promise<{ cancelled: boolean }> {
  if (!session) return { cancelled: true };
  const result = await session.navigateTree(targetId, {
    summarize: options.summarize,
    customInstructions: options.customInstructions,
  });
  return { cancelled: result.cancelled };
}

/**
 * Set or clear a label on an entry.
 */
export function setLabel(entryId: string, label: string | undefined): void {
  if (!session) return;
  session.sessionManager.appendLabelChange(entryId, label ?? '');
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/**
 * Extract a short preview string from a tree node's entry.
 */
function getEntryPreview(entry: any): { preview: string; role?: string } {
  let preview = '';
  let role: string | undefined;

  switch (entry.type) {
    case 'message': {
      const msg = entry.message;
      role = msg.role;
      if (typeof msg.content === 'string') {
        preview = msg.content.substring(0, 120);
      } else if (Array.isArray(msg.content)) {
        const textParts: string[] = [];
        const toolNames: string[] = [];
        for (const block of msg.content as any[]) {
          if (block.type === 'text' && block.text) {
            textParts.push(block.text);
          } else if (block.type === 'tool_use' && block.name) {
            const argPreview = block.input?.path || block.input?.command?.substring(0, 50) || '';
            toolNames.push(argPreview ? `${block.name}(${argPreview})` : block.name);
          } else if (block.type === 'tool_result') {
            // Skip tool results in preview
          }
        }
        if (textParts.length > 0) {
          preview = textParts.join(' ').substring(0, 120);
        } else if (toolNames.length > 0) {
          preview = toolNames.join(', ').substring(0, 120);
        }
      }
      if (!preview) {
        preview = role === 'user' ? '（空）' : '（工具调用）';
      }
      break;
    }
    case 'compaction':
      preview = '上下文已压缩';
      break;
    case 'branch_summary':
      preview = entry.summary?.substring(0, 80) || '分支摘要';
      break;
    case 'model_change':
      preview = `模型 → ${entry.modelId}`;
      break;
    case 'thinking_level_change':
      preview = `Thinking → ${entry.thinkingLevel}`;
      break;
    case 'custom_message':
      preview = (entry as any).content?.substring(0, 80) || '自定义消息';
      break;
    default:
      preview = entry.type;
  }

  return { preview, role };
}

/**
 * Serialize the tree into a flat array of nodes.
 * Uses iterative DFS. Each node stores childIds instead of nested children,
 * keeping the payload flat so postMessage structured clone doesn't fail
 * on deeply nested sessions (~1,500+ depth crashes Chrome's cloner).
 */
function serializeTreeFlat(roots: SessionTreeNode[]): SerializedTreeNode[] {
  const result: SerializedTreeNode[] = [];
  const stack: SessionTreeNode[] = [];

  for (let i = roots.length - 1; i >= 0; i--) {
    stack.push(roots[i]);
  }

  while (stack.length > 0) {
    const node = stack.pop()!;
    const { preview, role } = getEntryPreview(node.entry);
    result.push({
      id: node.entry.id,
      parentId: node.entry.parentId,
      type: node.entry.type,
      label: node.label,
      preview,
      role,
      childIds: node.children.map(c => c.entry.id),
    });
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i]);
    }
  }

  return result;
}
