{
  description = "Phi-Pi VS Code extension development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in
      {
        devShells.default = pkgs.mkShell {
          name = "phi-pi-dev";

          packages = with pkgs; [
            nodejs_24
            pnpm
            typescript
            esbuild
          ];

          shellHook = ''
            # 修复 pnpm 的 esbuild shim（pnpm 用 node 执行 Go 二进制，会 GG）
            if [ -f node_modules/.bin/esbuild ] && head -1 node_modules/.bin/esbuild | grep -q "^#!/bin/sh"; then
              SYSTEM_ESBUILD="$(which esbuild 2>/dev/null)"
              if [ -n "$SYSTEM_ESBUILD" ]; then
                rm -f node_modules/.bin/esbuild
                ln -s "$SYSTEM_ESBUILD" node_modules/.bin/esbuild
              fi
            fi

            echo "✦ Phi-Pi 开发环境已激活"
            echo "  node:   $(node --version)"
            echo "  pnpm:   $(pnpm --version)"
            echo "  tsc:    $(tsc --version)"
            echo "  esbuild: $(esbuild --version)"
            echo ""
            echo "  常用命令："
            echo "    pnpm run build        # 完整构建"
            echo "    pnpm run typecheck    # 类型检查"
            echo "    pnpm run watch        # 监听模式"
            echo "    pnpm run package      # 打包 VSIX"
          '';
        };
      });
}
