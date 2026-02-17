import { parseArgs, optionOrDefault, requiredOption } from './lib/arg-utils.js';
import { runScanCommand } from './commands/scan.js';
import { runSummarizeCommand } from './commands/summarize.js';
import { runGraphCommand } from './commands/graph.js';
import { runDiffCommand } from './commands/diff.js';

const buildScanOptions = (root: string, snapshotIdRaw: string | undefined): { root: string; snapshotId?: string } => {
  if (snapshotIdRaw !== undefined && snapshotIdRaw.length > 0) {
    return {
      root,
      snapshotId: snapshotIdRaw
    };
  }

  return { root };
};

const buildSummarizeOptions = (root: string, repoRaw: string | undefined): { root: string; repo?: string } => {
  if (repoRaw !== undefined && repoRaw.length > 0) {
    return {
      root,
      repo: repoRaw
    };
  }

  return { root };
};

const printHelp = (): void => {
  const help = [
    'repo-intel <command> [options]',
    '',
    'Commands:',
    '  scan --root <path> [--snapshot-id <id>]',
    '  summarize --root <path> [--repo <name>]',
    '  graph --root <path>',
    '  diff --root <path> --base <snapshot-id> --head <snapshot-id>'
  ].join('\n');

  process.stdout.write(`${help}\n`);
};

const main = async (): Promise<void> => {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.command === 'help' || parsed.command === '--help' || parsed.command === '-h') {
    printHelp();
    return;
  }

  if (parsed.command === 'scan') {
    const root = optionOrDefault(parsed.options, 'root', process.cwd());
    const snapshotIdRaw = parsed.options['snapshot-id'];
    const scanOptions = buildScanOptions(root, snapshotIdRaw);
    const result = await runScanCommand(scanOptions);

    process.stdout.write(`Scanned ${result.inventory.repos.length} repo(s). Snapshot: ${result.inventory.snapshotId}\n`);
    return;
  }

  if (parsed.command === 'summarize') {
    const root = optionOrDefault(parsed.options, 'root', process.cwd());
    const repoRaw = parsed.options.repo;
    const summarizeOptions = buildSummarizeOptions(root, repoRaw);
    const outputs = await runSummarizeCommand(summarizeOptions);

    process.stdout.write(`Generated docs for ${outputs.length} repo(s).\n`);
    return;
  }

  if (parsed.command === 'graph') {
    const root = optionOrDefault(parsed.options, 'root', process.cwd());
    const outputPath = await runGraphCommand({ root });
    process.stdout.write(`Generated service map: ${outputPath}\n`);
    return;
  }

  if (parsed.command === 'diff') {
    const root = optionOrDefault(parsed.options, 'root', process.cwd());
    const base = requiredOption(parsed.options, 'base');
    const head = requiredOption(parsed.options, 'head');
    const report = await runDiffCommand({ root, base, head });
    process.stdout.write(`Diff generated between ${report.baseSnapshot} and ${report.headSnapshot}.\n`);
    return;
  }

  throw new Error(`Unknown command: ${parsed.command}`);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`repo-intel failed: ${message}\n`);
  process.exitCode = 1;
});
