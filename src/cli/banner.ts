const BANNER_LINES = [
  '██████╗ ███████╗████████╗████████╗███████╗██████╗      ██████╗███████╗',
  '██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗    ██╔════╝██╔════╝',
  '██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝    ██║     █████╗  ',
  '██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗    ██║     ██╔══╝  ',
  '██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║    ╚██████╗██║     ',
  '╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝     ╚═════╝╚═╝     '
] as const;

const BANNER_COMMANDS = new Set(['create', 'init', 'generate', 'dev', 'deploy', 'tree']);

export function renderBanner(): void {
  process.stdout.write(`${BANNER_LINES.join('\n')}\n\n`);
}

export function shouldRenderBanner(argv: string[]): boolean {
  if (argv.length === 0) {
    return true;
  }

  const [firstArg, secondArg] = argv;
  if (!firstArg) {
    return true;
  }

  if (firstArg === '--help' || firstArg === '-h' || firstArg === '--version' || firstArg === '-V') {
    return true;
  }

  if (BANNER_COMMANDS.has(firstArg)) {
    return true;
  }

  if (firstArg === 'registry' && !secondArg) {
    return true;
  }

  return false;
}
