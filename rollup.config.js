import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      resolve(), // 用于解析模块
      commonjs(), // 用于转换 CommonJS 模块为 ES6 模块
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
      terser({
        compress: true, // 启用压缩
        mangle: true, // 启用混淆
      }),
    ],
    external: ['lodash-es', 'ts-utils-helper', 'zod'],
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/index.d.ts', format: 'es', sourcemap: true }],
    plugins: [dts.default()],
  },
];
