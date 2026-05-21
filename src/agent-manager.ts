/**
 * AgentManager
 *
 * The ONLY module in Phi that imports from @earendil-works/pi-coding-agent.
 * All other files must go through this module's exported functions.
 *
 * This file re-exports everything from the sub-modules:
 *   - agent-state.ts     → shared state + helpers
 *   - agent-session.ts   → lifecycle, messaging, model/thinking
 *   - agent-auth.ts      → authentication & accounts
 *   - agent-tree.ts      → session tree operations
 *   - agent-extensions.ts → extensions & skills
 */

// Re-export everything from sub-modules
export * from './agent-state.js';
export * from './agent-session.js';
export * from './agent-auth.js';
export * from './agent-tree.js';
export * from './agent-extensions.js';
