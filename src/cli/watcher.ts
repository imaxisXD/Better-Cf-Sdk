import chokidar, { type FSWatcher } from 'chokidar';

export interface WatcherOptions {
  ignored: string[];
  onRelevantChange: (filePath: string) => Promise<void>;
}

const WATCH_GLOBS = [
  '**/*.ts',
  '**/*.tsx',
  'better-cf.config.ts',
  'wrangler.toml',
  'wrangler.json',
  'wrangler.jsonc',
  'tsconfig.json'
];

export function createProjectWatcher(rootDir: string, options: WatcherOptions): FSWatcher {
  const watcher = chokidar.watch(WATCH_GLOBS, {
    cwd: rootDir,
    ignored: options.ignored.map((entry) => `${entry}/**`),
    ignoreInitial: true,
    usePolling: true,
    interval: 100,
    awaitWriteFinish: {
      stabilityThreshold: 150,
      pollInterval: 25
    }
  });

  const handler = async (filePath: string): Promise<void> => {
    await options.onRelevantChange(filePath);
  };

  watcher.on('add', handler);
  watcher.on('change', handler);
  watcher.on('unlink', handler);
  watcher.on('ready', () => {
    void options.onRelevantChange('__watcher_ready__');
  });

  return watcher;
}
