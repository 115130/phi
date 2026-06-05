/**
 * command-palette.js — Command Palette
 *
 * Manages the command palette overlay with built-in and skill commands.
 */

import { VscodeIPC } from './vscode-ipc.js';

export class CommandPalette {
  constructor({ onCompact, onSessionStats, onOpenTree, onExpandAllTools, onCollapseAllTools }) {
    this.baseCommands = [
      { icon: '🗜️', label: '压缩', desc: '压缩上下文以节省 Token', action: onCompact },
      { icon: '📊', label: '会话统计', desc: '显示会话统计信息', action: onSessionStats },
      { icon: '🌿', label: '对话树', desc: '浏览和导航对话分支', action: onOpenTree },
      { icon: '🔀', label: 'Fork 会话', desc: '从当前位置分叉为新会话', action: () => { VscodeIPC.send({ type: 'fork_session' }); } },
      { icon: '📋', label: '复制最后回复', desc: '复制最后一条助手消息到剪贴板', action: () => this._copyLastAssistant() },
      { icon: '⬇️', label: '展开全部工具', desc: '展开所有工具卡片', action: onExpandAllTools },
      { icon: '⬆️', label: '折叠全部工具', desc: '折叠所有工具卡片', action: onCollapseAllTools },
    ];
    this.commands = [...this.baseCommands];
    this.loadedSkills = [];

    // DOM refs
    this.palette = document.getElementById('command-palette');
    this.overlay = document.getElementById('command-palette-overlay');
    this.list = document.getElementById('command-list');
    this.btn = document.getElementById('command-btn');

    this._init();
  }

  _init() {
    this.btn.addEventListener('click', () => this.open());
    this.overlay.addEventListener('click', () => this.close());
  }

  getBaseCommands() { return this.baseCommands; }
  getLoadedSkills() { return this.loadedSkills; }

  updateSkills(skills) {
    this.loadedSkills = skills || [];
    this.commands = [...this.baseCommands];
    if (this.loadedSkills.length > 0) {
      this.loadedSkills.forEach(skill => {
        this.commands.push({
          icon: '✨',
          label: `/skill:${skill.name}`,
          desc: skill.description,
          action: () => {
            const inputEl = document.getElementById('message-input');
            inputEl.textContent = `/skill:${skill.name} `;
            inputEl.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(inputEl);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        });
      });
    }
  }

  open() {
    this.list.innerHTML = '';
    this.commands.forEach(cmd => {
      const el = document.createElement('div');
      el.className = 'command-item';
      el.innerHTML = `<div class="command-icon">${cmd.icon}</div><div><div class="command-label">${cmd.label}</div><div class="command-desc">${cmd.desc}</div></div>`;
      el.addEventListener('click', () => { this.close(); cmd.action(); });
      this.list.appendChild(el);
    });
    this.palette.classList.remove('hidden');
    this.overlay.classList.remove('hidden');
  }

  close() {
    this.palette.classList.add('hidden');
    this.overlay.classList.add('hidden');
  }

  isOpen() {
    return !this.palette.classList.contains('hidden');
  }

  _copyLastAssistant() {
    const last = [...document.querySelectorAll('.message.assistant')].pop();
    if (!last) return;
    const text = last.querySelector('.message-content')?.textContent || '';
    if (!text.trim()) return;
    const copy = (t) => {
      if (navigator.clipboard) return navigator.clipboard.writeText(t);
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve();
    };
    copy(text).then(() => {
      // 简要反馈
      const el = document.createElement('div');
      el.className = 'system-message';
      el.textContent = '📋 已复制最后回复到剪贴板';
      document.getElementById('messages')?.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    });
  }
}
