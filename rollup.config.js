import { uglify } from 'rollup-plugin-uglify';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import nodePolyfill from 'rollup-plugin-polyfill-node';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/ihop.js',
      format: 'iife',
      name: 'IHOP',
    }, {
      file: 'dist/ihop.min.js',
      format: 'iife',
      name: 'IHOP',
      plugins: [uglify()],
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
  ],
  //external: ['same-origin']
};
