import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import path from 'path';

const production = !process.env.ROLLUP_WATCH;
const fl = "output";

export default {
  input: 'src/main.js',
  output: {
    file: fl + '/build/bundle.js',
    format: 'iife',
    name: 'app',
    sourcemap: false,
    inlineDynamicImports: true,
  },
  plugins: [
    svelte({
      compilerOptions: {
        dev: !production
      }
    }),
    postcss(),
    resolve({
      browser: true,
      dedupe: ['svelte'],
      exportConditions: ['svelte'],
      mainFields: ['svelte', 'module', 'browser', 'main']
    }),
    commonjs(),

    babel({
      babelHelpers: 'inline',
      exclude: 'node_modules/**',
      presets: [
        [
          '@babel/preset-env',
          {
            targets: '> 0.25%, not dead, IE 11',
            useBuiltIns: 'usage',
            corejs: 3
          }
        ]
      ],
      plugins: [
        '@babel/plugin-syntax-dynamic-import'
      ]
    }),

    !production && serve({
      open: true,
      contentBase: fl,
      historyApiFallback: true,
      port: 5000,
      host: '0.0.0.0'
    }),
    !production && livereload(fl),

    production && terser({
      keep_fnames: true,
      mangle: { keep_fnames: true }
    })
  ]
};
