import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/queue/index.ts',
    'src/queue/internal.ts',
    'src/testing/index.ts',
    'src/cli/index.ts'
  ],
  outDir: 'dist',
  format: ['esm'],
  target: 'node18',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  treeshake: true,
  skipNodeModulesBundle: true
});
