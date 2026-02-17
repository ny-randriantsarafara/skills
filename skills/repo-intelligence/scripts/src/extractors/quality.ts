import * as path from 'node:path';
import { stat } from 'node:fs/promises';
import fg from 'fast-glob';
import { readTextIfExists, listAllDirs } from '../lib/fs-utils.js';
import type { HotspotFile, PackageSummary, QualitySignals } from '../lib/contracts.js';
import { uniqueSorted } from '../lib/text-utils.js';

const hasCiConfiguration = async (repoRoot: string): Promise<boolean> => {
  const githubWorkflows = await fg(['.github/workflows/*.{yml,yaml}'], { cwd: repoRoot, onlyFiles: true });
  if (githubWorkflows.length > 0) {
    return true;
  }

  const gitlabCi = await readTextIfExists(path.join(repoRoot, '.gitlab-ci.yml'));
  return gitlabCi.length > 0;
};

const detectStrictMode = async (repoRoot: string): Promise<boolean> => {
  const tsConfig = await readTextIfExists(path.join(repoRoot, 'tsconfig.json'));
  if (tsConfig.length === 0) {
    return false;
  }

  try {
    const parsed = JSON.parse(tsConfig);
    const compilerOptions = parsed.compilerOptions;
    if (typeof compilerOptions !== 'object' || compilerOptions === null || Array.isArray(compilerOptions)) {
      return false;
    }

    const strict = compilerOptions.strict;
    return strict === true;
  } catch {
    return false;
  }
};

const computeLargestFiles = async (repoRoot: string): Promise<readonly HotspotFile[]> => {
  const files = await fg(['**/*.{ts,tsx,js,jsx,py,go,java,rb,rs}'], {
    cwd: repoRoot,
    onlyFiles: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/.repo-intel/**', '**/dist/**', '**/build/**']
  });

  const measured = await Promise.all(
    files.map(async (relativePath) => {
      const filePath = path.join(repoRoot, relativePath);
      const text = await readTextIfExists(filePath);
      const lines = text.length === 0 ? 0 : text.split(/\r?\n/).length;
      return {
        file: relativePath,
        lines
      };
    })
  );

  return measured
    .sort((left, right) => right.lines - left.lines)
    .slice(0, 5)
    .map((item) => {
      return {
        file: item.file,
        lines: item.lines
      };
    });
};

const computeDeepestFolders = async (repoRoot: string): Promise<readonly string[]> => {
  const directories = await listAllDirs(repoRoot);
  const withDepth = directories.map((directory) => {
    const normalized = directory.split(path.sep).join('/');
    const depth = normalized.split('/').filter((part) => part.length > 0).length;
    return {
      directory: normalized,
      depth
    };
  });

  return withDepth
    .sort((left, right) => right.depth - left.depth)
    .slice(0, 5)
    .map((entry) => entry.directory);
};

const resolveImportTarget = async (filePath: string, importPath: string): Promise<string> => {
  const base = path.resolve(path.dirname(filePath), importPath);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js')
  ];

  for (const candidate of candidates) {
    try {
      const stats = await stat(candidate);
      if (stats.isFile()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  return '';
};

const collectCycles = async (repoRoot: string, sourceFiles: readonly string[]): Promise<readonly string[]> => {
  const fullPaths = sourceFiles.map((file) => path.resolve(repoRoot, file));
  const fileSet = new Set(fullPaths);
  const graph = new Map<string, readonly string[]>();

  for (const fullPath of fullPaths) {
    const code = await readTextIfExists(fullPath);
    const pattern = /from\s+['"`](\.[^'"`]+)['"`]/g;
    const imports = Array.from(code.matchAll(pattern)).map((match) => match[1] ?? '');
    const resolvedTargets = await Promise.all(imports.map((entry) => resolveImportTarget(fullPath, entry)));
    const targets = resolvedTargets
      .filter((candidate) => candidate.length > 0)
      .filter((candidate) => fileSet.has(candidate));

    graph.set(fullPath, uniqueSorted(targets));
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles = new Set<string>();

  const visit = (node: string, stack: readonly string[]): void => {
    if (inStack.has(node)) {
      const loopStart = stack.indexOf(node);
      if (loopStart === -1) {
        return;
      }

      const loop = [...stack.slice(loopStart), node]
        .map((entry) => path.relative(repoRoot, entry).split(path.sep).join('/'))
        .join(' -> ');
      cycles.add(loop);
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    inStack.add(node);

    const nextNodes = graph.get(node) ?? [];
    for (const next of nextNodes) {
      visit(next, [...stack, node]);
    }

    inStack.delete(node);
  };

  for (const node of fullPaths) {
    visit(node, []);
  }

  return Array.from(cycles).sort((left, right) => left.localeCompare(right));
};

const detectSignalFromFiles = async (
  repoRoot: string,
  sourceFiles: readonly string[],
  pattern: RegExp,
  label: string
): Promise<readonly string[]> => {
  const matches = await Promise.all(
    sourceFiles.map(async (relativePath) => {
      const code = await readTextIfExists(path.join(repoRoot, relativePath));
      if (!pattern.test(code)) {
        return '';
      }

      return `${label}:${relativePath}`;
    })
  );

  return uniqueSorted(matches.filter((item) => item.length > 0));
};

export const extractQualitySignals = async (
  repoRoot: string,
  sourceFiles: readonly string[],
  packageSummary: PackageSummary
): Promise<QualitySignals> => {
  const testFiles = await fg(['**/*.{test,spec}.{ts,tsx,js,jsx}', '**/__tests__/**'], {
    cwd: repoRoot,
    onlyFiles: true,
    ignore: ['**/node_modules/**', '**/.repo-intel/**']
  });

  const scripts = packageSummary.scripts;
  const lintConfigured = scripts.lint !== undefined;
  const formatConfigured = scripts.format !== undefined || scripts.prettier !== undefined;

  return {
    testsPresent: testFiles.length > 0,
    testFileCount: testFiles.length,
    ciConfigured: await hasCiConfiguration(repoRoot),
    lintConfigured,
    formatConfigured,
    typescriptStrict: await detectStrictMode(repoRoot),
    largestFiles: await computeLargestFiles(repoRoot),
    deepestFolders: await computeDeepestFolders(repoRoot),
    cycles: await collectCycles(repoRoot, sourceFiles),
    loggingSignals: await detectSignalFromFiles(
      repoRoot,
      sourceFiles,
      /(pino|winston|logger\.|console\.log)/,
      'log'
    ),
    metricsSignals: await detectSignalFromFiles(repoRoot, sourceFiles, /(prom-client|\/metrics|meter)/, 'metrics'),
    tracingSignals: await detectSignalFromFiles(
      repoRoot,
      sourceFiles,
      /(opentelemetry|traceparent|span)/,
      'tracing'
    )
  };
};
