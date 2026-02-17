#!/usr/bin/env node
import { validateAll } from './validate.mjs';
import { buildAdapters } from './build.mjs';
import { generateMatrix } from './matrix.mjs';
import { installAdapters } from './install.mjs';
import { runDoctor } from './doctor.mjs';

const parseOptions = (args) => {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (!item.startsWith('--')) {
      continue;
    }

    if (item.includes('=')) {
      const [rawKey, rawValue] = item.slice(2).split('=', 2);
      options[rawKey] = rawValue;
      continue;
    }

    const key = item.slice(2);
    const next = args[index + 1];
    if (next === undefined || next.startsWith('--')) {
      options[key] = 'true';
      continue;
    }

    options[key] = next;
    index += 1;
  }
  return options;
};

const printHelp = () => {
  const lines = [
    'skillctl <command> [options]',
    '',
    'Commands:',
    '  validate',
    '  build --tool <tool|all>',
    '  matrix',
    '  install --tool <tool|all> [--dest <path>]',
    '  sync --tool <tool|all> [--dest <path>]',
    '  doctor',
    '',
    'Tools: codex, claude, cursor, copilot, all'
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
};

const printDoctorResult = (result) => {
  for (const item of result.checks) {
    const marker = item.available ? 'OK' : 'MISSING';
    process.stdout.write(`${marker} ${item.binary}\n`);
  }

  if (result.healthy) {
    process.stdout.write('Doctor status: healthy\n');
    return;
  }

  process.stdout.write('Doctor status: missing required binaries\n');
  process.exitCode = 1;
};

const main = async () => {
  const [, , rawCommand, ...rest] = process.argv;
  const command = rawCommand ?? 'help';
  const options = parseOptions(rest);

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'validate') {
    const result = await validateAll();
    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        process.stderr.write(`- ${issue}\n`);
      }
      throw new Error(`Validation failed with ${result.issues.length} issue(s)`);
    }

    process.stdout.write(`Validated ${result.skills.length} canonical skill(s) successfully.\n`);
    return;
  }

  if (command === 'build') {
    const buildResult = await buildAdapters({ tool: options.tool ?? 'all' });
    process.stdout.write(
      `Built ${buildResult.built.length} adapter package(s) for tools: ${buildResult.tools.join(', ')}.\n`
    );
    return;
  }

  if (command === 'matrix') {
    const matrix = await generateMatrix();
    process.stdout.write(`Generated matrix for ${matrix.skillCount} skill(s): ${matrix.outputPath}\n`);
    return;
  }

  if (command === 'install') {
    const installResult = await installAdapters({
      tool: options.tool ?? 'all',
      dest: options.dest
    });
    for (const item of installResult.installed) {
      process.stdout.write(`Installed ${item.skills.length} skill(s) for ${item.tool} -> ${item.destination}\n`);
    }
    return;
  }

  if (command === 'sync') {
    const chosenTool = options.tool ?? 'all';
    await buildAdapters({ tool: chosenTool });
    const installResult = await installAdapters({
      tool: chosenTool,
      dest: options.dest
    });
    await generateMatrix();
    for (const item of installResult.installed) {
      process.stdout.write(`Synced ${item.skills.length} skill(s) for ${item.tool} -> ${item.destination}\n`);
    }
    return;
  }

  if (command === 'doctor') {
    const doctorResult = await runDoctor();
    printDoctorResult(doctorResult);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`skillctl failed: ${message}\n`);
  process.exitCode = 1;
});
