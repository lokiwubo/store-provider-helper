/**
 * @fileoverview 统一使用pnpm 命令安装依赖
 */
if (process.env.npm_execpath.indexOf('pnpm') === -1) {
  console.error('请使用 pnpm 进行安装');
  process.exit(1);
}
