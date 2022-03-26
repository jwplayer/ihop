import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import nodePolyfill from 'rollup-plugin-polyfill-node';
import injectProcessEnv from 'rollup-plugin-inject-process-env';

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/ihop.js',
        format: 'umd',
        name: 'IHop',
        sourcemap: true
      }
    ],
    plugins: [
      nodePolyfill(),
      nodeResolve({
        browser: true
      }),
      commonjs({
        exclude: ["src/**"],
        include: ["node_modules/**"],
      }),
      injectProcessEnv({
        NODE_ENV: 'dev'
      })
    ]
  }, {
    input: 'test/unit/index.js',
    output: [
      {
        file: 'test/dist/ihop.unit.js',
        format: 'umd',
        name: 'IHopUnit',
        sourcemap: true
      }
    ],
    plugins: [
      nodePolyfill(),
      nodeResolve({
        browser: true
      }),
      commonjs({
        exclude: ["src/**"],
        include: ["node_modules/**"],
      }),
      injectProcessEnv({
        NODE_ENV: 'dev'
      })
    ]
  }
];
