import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import fg from 'fast-glob';

const execFileAsync = promisify(execFile);

export const toPosix = (value: string): string => value.split(path.sep).join(path.posix.sep);

export const ensureDir = async (dirPath: string): Promise<void> => {
  await mkdir(dirPath, { recursive: true });
};

export const readTextIfExists = async (filePath: string): Promise<string> => {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return '';
  }
};

export const writeJson = async <T>(filePath: string, value: T): Promise<void> => {
  await ensureDir(path.dirname(filePath));
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(filePath, payload, 'utf8');
};

export const writeText = async (filePath: string, value: string): Promise<void> => {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, value, 'utf8');
};

export const readJsonIfExists = async (filePath: string): Promise<unknown | null> => {
  const content = await readTextIfExists(filePath);
  if (content.length === 0) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
};

export const detectGitSha = async (root: string): Promise<string> => {
  try {
    const { stdout } = await execFileAsync('git', ['-C', root, 'rev-parse', '--short=12', 'HEAD']);
    return stdout.trim();
  } catch {
    return 'nogit';
  }
};

export const discoverGitRoots = async (scanRoot: string): Promise<readonly string[]> => {
  const nestedGitDirs = await fg(['**/.git'], {
    cwd: scanRoot,
    onlyDirectories: true,
    ignore: ['**/node_modules/**', '**/.repo-intel/**'],
    dot: true
  });

  const nestedRoots = nestedGitDirs.map((entry) => path.resolve(scanRoot, path.dirname(entry)));

  const rootHasGit = await (async (): Promise<boolean> => {
    try {
      const rootStat = await stat(path.join(scanRoot, '.git'));
      return rootStat.isDirectory();
    } catch {
      return false;
    }
  })();

  const allRoots = rootHasGit ? [scanRoot, ...nestedRoots] : nestedRoots;
  const uniqueRoots = Array.from(new Set(allRoots));

  return uniqueRoots.sort((left, right) => left.localeCompare(right));
};

export const listSourceFiles = async (repoRoot: string): Promise<readonly string[]> => {
  const entries = await fg(['**/*.{ts,tsx,js,jsx,mjs,cjs}'], {
    cwd: repoRoot,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.repo-intel/**',
      '**/coverage/**',
      '**/.turbo/**'
    ],
    dot: false
  });

  return entries.sort((left, right) => left.localeCompare(right));
};

export const listAllFiles = async (repoRoot: string): Promise<readonly string[]> => {
  const entries = await fg(['**/*'], {
    cwd: repoRoot,
    onlyFiles: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/.repo-intel/**']
  });

  return entries.sort((left, right) => left.localeCompare(right));
};

export const listAllDirs = async (repoRoot: string): Promise<readonly string[]> => {
  const entries = await fg(['**/*'], {
    cwd: repoRoot,
    onlyDirectories: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/.repo-intel/**']
  });

  return entries.sort((left, right) => left.localeCompare(right));
};

export const listTopLevelFolders = async (repoRoot: string): Promise<readonly string[]> => {
  const dirEntries = await readdir(repoRoot, { withFileTypes: true });
  const folders = dirEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('.'));

  return folders.sort((left, right) => left.localeCompare(right));
};

export const toRepoRelative = (repoRoot: string, filePath: string): string => {
  const relativePath = path.relative(repoRoot, filePath);
  return toPosix(relativePath);
};
