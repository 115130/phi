/**
 * Syntax Highlighter — 按需加载常用语言（~85 种），替代 shiki/bundle/full
 */
import { createHighlighterCore } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import darkPlusTheme from 'shiki/themes/dark-plus.mjs';

// ─── 常用语言（~85 种，覆盖主流编程/标记/配置语言）───
import langBash       from 'shiki/langs/bash.mjs';
import langBat        from 'shiki/langs/batch.mjs';       // .bat/.cmd
import langC          from 'shiki/langs/c.mjs';
import langClojure    from 'shiki/langs/clojure.mjs';
import langCmake      from 'shiki/langs/cmake.mjs';
import langCpp        from 'shiki/langs/cpp.mjs';
import langCsharp     from 'shiki/langs/csharp.mjs';
import langCss        from 'shiki/langs/css.mjs';
import langCsv        from 'shiki/langs/csv.mjs';
import langCypher     from 'shiki/langs/cypher.mjs';
import langD          from 'shiki/langs/d.mjs';
import langDart       from 'shiki/langs/dart.mjs';
import langDiff       from 'shiki/langs/diff.mjs';
import langDocker     from 'shiki/langs/docker.mjs';
import langDotenv     from 'shiki/langs/dotenv.mjs';
import langElixir     from 'shiki/langs/elixir.mjs';
import langElm        from 'shiki/langs/elm.mjs';
import langErlang     from 'shiki/langs/erlang.mjs';
import langFish       from 'shiki/langs/fish.mjs';
import langFsharp     from 'shiki/langs/fsharp.mjs';
import langGleam      from 'shiki/langs/gleam.mjs';
import langGo         from 'shiki/langs/go.mjs';
import langGraphql    from 'shiki/langs/graphql.mjs';
import langGroovy     from 'shiki/langs/groovy.mjs';
import langHaskell    from 'shiki/langs/haskell.mjs';
import langHcl        from 'shiki/langs/hcl.mjs';
import langHtml       from 'shiki/langs/html.mjs';
import langHttp       from 'shiki/langs/http.mjs';
import langIni        from 'shiki/langs/ini.mjs';
import langJava       from 'shiki/langs/java.mjs';
import langJavascript from 'shiki/langs/javascript.mjs';
import langJson       from 'shiki/langs/json.mjs';
import langJsonc      from 'shiki/langs/jsonc.mjs';
import langJson5      from 'shiki/langs/json5.mjs';
import langJsx        from 'shiki/langs/jsx.mjs';
import langJulia      from 'shiki/langs/julia.mjs';
import langKotlin     from 'shiki/langs/kotlin.mjs';
import langLatex      from 'shiki/langs/latex.mjs';
import langLess       from 'shiki/langs/less.mjs';
import langLog        from 'shiki/langs/log.mjs';
import langLua        from 'shiki/langs/lua.mjs';
import langMake       from 'shiki/langs/make.mjs';
import langMarkdown   from 'shiki/langs/markdown.mjs';
import langMdx        from 'shiki/langs/mdx.mjs';
import langNginx      from 'shiki/langs/nginx.mjs';
import langNim        from 'shiki/langs/nim.mjs';
import langNix        from 'shiki/langs/nix.mjs';
import langOcaml      from 'shiki/langs/ocaml.mjs';
import langPerl       from 'shiki/langs/perl.mjs';
import langPhp        from 'shiki/langs/php.mjs';
import langPrisma     from 'shiki/langs/prisma.mjs';
import langProto      from 'shiki/langs/proto.mjs';
import langPowershell from 'shiki/langs/powershell.mjs';
import langPython     from 'shiki/langs/python.mjs';
import langR          from 'shiki/langs/r.mjs';
import langRuby       from 'shiki/langs/ruby.mjs';
import langRust       from 'shiki/langs/rust.mjs';
import langSass       from 'shiki/langs/sass.mjs';
import langScala      from 'shiki/langs/scala.mjs';
import langScss       from 'shiki/langs/scss.mjs';
import langSql        from 'shiki/langs/sql.mjs';
import langStylus     from 'shiki/langs/stylus.mjs';
import langSvelte     from 'shiki/langs/svelte.mjs';
import langSwift      from 'shiki/langs/swift.mjs';
import langTerraform  from 'shiki/langs/terraform.mjs';
import langToml       from 'shiki/langs/toml.mjs';
import langTsx        from 'shiki/langs/tsx.mjs';
import langTypescript from 'shiki/langs/typescript.mjs';
import langVim        from 'shiki/langs/vim.mjs';
import langVue        from 'shiki/langs/vue.mjs';
import langXml        from 'shiki/langs/xml.mjs';
import langYaml       from 'shiki/langs/yaml.mjs';
import langZig        from 'shiki/langs/zig.mjs';

// ─── 所有预装语言 ───────────────────────────────────────────────────────────
const PRELOADED_LANGS = [
  langBash,       // bash / shellscript / sh / zsh
  langBat,        // batch / bat / cmd
  langC,
  langClojure,    // clojure / clj
  langCmake,
  langCpp,        // cpp / hpp / h++ / cc
  langCsharp,     // csharp / cs
  langCss,
  langCsv,
  langCypher,
  langD,
  langDart,
  langDiff,
  langDocker,     // dockerfile / docker
  langDotenv,
  langElixir,
  langElm,
  langErlang,     // erlang / erl
  langFish,
  langFsharp,     // fsharp / fs
  langGleam,
  langGo,         // go / golang
  langGraphql,    // graphql / gql
  langGroovy,
  langHaskell,    // haskell / hs
  langHcl,        // hcl / tf / tfvars
  langHtml,
  langHttp,
  langIni,
  langJava,
  langJavascript, // javascript / js
  langJson,
  langJsonc,
  langJson5,
  langJsx,
  langJulia,      // julia / jl
  langKotlin,     // kotlin / kt / kts
  langLatex,      // latex / tex
  langLess,
  langLog,
  langLua,        // lua / luau
  langMake,       // make / makefile
  langMarkdown,   // markdown / md
  langMdx,        // mdx / mdc
  langNginx,
  langNim,
  langNix,
  langOcaml,
  langPerl,
  langPhp,
  langPrisma,
  langProto,      // proto / protobuf
  langPowershell, // powershell / ps / ps1
  langPython,     // python / py
  langR,
  langRuby,       // ruby / rb
  langRust,       // rust / rs
  langSass,
  langScala,
  langScss,
  langSql,
  langStylus,     // stylus / styl
  langSvelte,
  langSwift,
  langTerraform,  // terraform / tf
  langToml,
  langTsx,
  langTypescript, // typescript / ts
  langVim,        // vim / viml / vimscript
  langVue,
  langXml,
  langYaml,       // yaml / yml
  langZig,
];

const THEME_NAME = 'phi-dark-plus-vars';

// Dark+ gives broad TextMate-scope coverage. Replace every bundled theme color
// with a VS Code CSS variable so the webview still follows the user's theme.
const DARK_PLUS_COLOR_REPLACEMENTS = new Map([
  ['#000080', 'var(--vscode-textLink-foreground)'],
  ['#4ec9b0', 'var(--vscode-symbolIcon-classForeground, var(--vscode-symbolIcon-typeParameterForeground, var(--vscode-textLink-foreground)))'],
  ['#4fc1ff', 'var(--vscode-symbolIcon-variableForeground, var(--vscode-textLink-foreground))'],
  ['#569cd6', 'var(--vscode-symbolIcon-keywordForeground, var(--vscode-textLink-foreground))'],
  ['#646695', 'var(--vscode-symbolIcon-propertyForeground, var(--vscode-descriptionForeground))'],
  ['#6796e6', 'var(--vscode-textLink-foreground)'],
  ['#6a9955', 'var(--vscode-descriptionForeground)'],
  ['#808080', 'var(--vscode-descriptionForeground)'],
  ['#9cdcfe', 'var(--vscode-symbolIcon-variableForeground, var(--vscode-editor-foreground))'],
  ['#b5cea8', 'var(--vscode-symbolIcon-numberForeground, var(--vscode-terminal-ansiYellow))'],
  ['#c586c0', 'var(--vscode-symbolIcon-keywordForeground, var(--vscode-textLink-foreground))'],
  ['#c8c8c8', 'var(--vscode-descriptionForeground)'],
  ['#ce9178', 'var(--vscode-symbolIcon-stringForeground, var(--vscode-terminal-ansiGreen))'],
  ['#d16969', 'var(--vscode-errorForeground)'],
  ['#d4d4d4', 'var(--vscode-descriptionForeground, var(--vscode-editor-foreground))'],
  ['#d7ba7d', 'var(--vscode-symbolIcon-propertyForeground, var(--vscode-textLink-foreground))'],
  ['#dcdcaa', 'var(--vscode-symbolIcon-functionForeground, var(--vscode-textLink-foreground))'],
  ['#f44747', 'var(--vscode-errorForeground)'],
]);

const theme = createPhiTheme();

const LANGUAGE_ALIASES = new Map([
  ['plain', 'text'],
  ['plaintext', 'text'],
  ['txt', 'text'],
  // JavaScript 家族
  ['js', 'javascript'],
  ['cjs', 'javascript'],
  ['mjs', 'javascript'],
  ['ts', 'typescript'],
  ['mts', 'typescript'],
  ['cts', 'typescript'],
  // C 家族
  ['h++', 'cpp'],
  ['hpp', 'cpp'],
  ['cc', 'cpp'],
  ['cs', 'csharp'],
  ['fs', 'fsharp'],
  ['objective-c', 'objective-c'],
  ['objc', 'objective-c'],
  // Go
  ['golang', 'go'],
  // Shell
  ['shell', 'bash'],
  ['shellscript', 'bash'],
  ['sh', 'bash'],
  ['zsh', 'bash'],
  // Python
  ['py', 'python'],
  // Ruby
  ['rb', 'ruby'],
  // Rust
  ['rs', 'rust'],
  // Kotlin
  ['kt', 'kotlin'],
  ['kts', 'kotlin'],
  // Julia
  ['jl', 'julia'],
  // Erlang
  ['erl', 'erlang'],
  // Clojure
  ['clj', 'clojure'],
  // Haskell
  ['hs', 'haskell'],
  // Java
  ['java', 'java'],
  // Docker
  ['dockerfile', 'docker'],
  // GraphQL
  ['gql', 'graphql'],
  // LaTeX
  ['tex', 'latex'],
  // Markdown
  ['md', 'markdown'],
  ['mdc', 'markdown'],
  ['mdx', 'mdx'],
  // Batch
  ['bat', 'batch'],
  ['cmd', 'batch'],
  // Powershell
  ['ps', 'powershell'],
  ['ps1', 'powershell'],
  // Vim
  ['viml', 'vim'],
  ['vimscript', 'vim'],
  // Stylus
  ['styl', 'stylus'],
  // YAML
  ['yml', 'yaml'],
  // HCL / Terraform
  ['tf', 'terraform'],
  ['tfvars', 'hcl'],
  // Protocol Buffers
  ['protobuf', 'proto'],
  // Make
  ['makefile', 'make'],
  // Lua
  ['luau', 'lua'],
]);

let highlighter = null;
let highlighterPromise = null;

/**
 * 异步初始化高亮器，返回 Promise。多次调用安全。
 */
function getHighlighter() {
  if (highlighter) return Promise.resolve(highlighter);
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [theme],
      langs: PRELOADED_LANGS,
      engine: createJavaScriptRegexEngine(),
    }).then((instance) => {
      highlighter = instance;
      return instance;
    }).catch((error) => {
      console.warn('[Phi] 无法初始化语法高亮器', error);
      highlighterPromise = null;
      return null;
    });
  }
  return highlighterPromise;
}

export function getLanguageLabel(languageInfo = '', highlightedLanguage = '') {
  return extractLanguageToken(languageInfo) || highlightedLanguage || 'code';
}

export function normalizeLanguage(languageInfo = '') {
  const token = extractLanguageToken(languageInfo).toLowerCase();
  if (!token) return '';
  return LANGUAGE_ALIASES.get(token) || token;
}

export async function highlightRenderedCodeBlocks(root = document) {
  if (!root?.querySelectorAll) return;

  const wrappers = Array.from(
    root.querySelectorAll('.code-block-wrapper:not([data-shiki-highlighted="true"])')
  );
  if (wrappers.length === 0) return;

  const instance = await getHighlighter();
  if (!instance) return;

  for (const wrapper of wrappers) {
    highlightWrapper(instance, wrapper);
  }
}

function highlightWrapper(instance, wrapper) {
  const codeEl = wrapper.querySelector('pre code');
  if (!codeEl) return;

  const language = normalizeLanguage(wrapper.dataset.language || '');
  if (!language || language === 'text') return;

  try {
    const highlightedHtml = instance.codeToHtml(codeEl.textContent || '', {
      lang: language,
      theme: THEME_NAME,
    });

    const template = document.createElement('template');
    template.innerHTML = highlightedHtml.trim();
    const highlightedPre = template.content.firstElementChild;
    if (!highlightedPre) return;

    highlightedPre.classList.add('code-block-pre');
    wrapper.querySelector('pre')?.replaceWith(highlightedPre);
    wrapper.dataset.shikiHighlighted = 'true';
  } catch {
    // 语言不在预装列表中，保留无高亮状态
  }
}

function createPhiTheme() {
  const cloned = JSON.parse(JSON.stringify(darkPlusTheme));
  cloned.name = THEME_NAME;
  cloned.colors = {
    ...(cloned.colors || {}),
    'editor.background': 'var(--vscode-editor-background)',
    'editor.foreground': 'var(--vscode-descriptionForeground, var(--vscode-editor-foreground))',
  };

  for (const tokenColor of cloned.tokenColors || []) {
    if (tokenColor.settings?.foreground) {
      tokenColor.settings.foreground = mapThemeColor(tokenColor.settings.foreground);
    }
  }

  return cloned;
}

function mapThemeColor(color) {
  return DARK_PLUS_COLOR_REPLACEMENTS.get(String(color).toLowerCase()) ||
    'var(--vscode-editor-foreground)';
}

function extractLanguageToken(languageInfo = '') {
  const raw = String(languageInfo || '').trim();
  if (!raw) return '';

  return raw.split(/\s+/)[0]
    .replace(/^\{/, '')
    .replace(/\}$/, '')
    .replace(/^\./, '')
    .replace(/^language-/i, '')
    .trim();
}
