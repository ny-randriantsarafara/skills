import * as path from 'node:path';
import { readTextIfExists, listAllFiles } from '../lib/fs-utils.js';
import { isRecord, asString, asStringMap, asStringArray } from '../lib/type-guards.js';
import type { PackageSummary, RepoMetadata, RepoType } from '../lib/contracts.js';
import { uniqueSorted } from '../lib/text-utils.js';

interface ParsedPackageJson {
  readonly name: string;
  readonly scripts: Record<string, string>;
  readonly dependencies: Record<string, string>;
  readonly devDependencies: Record<string, string>;
  readonly workspaces: readonly string[];
}

const readPackageJson = async (repoRoot: string): Promise<ParsedPackageJson> => {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const raw = await readTextIfExists(packageJsonPath);
  if (raw.length === 0) {
    return {
      name: path.basename(repoRoot),
      scripts: {},
      dependencies: {},
      devDependencies: {},
      workspaces: []
    };
  }

  try {
    const parsedUnknown = JSON.parse(raw);
    if (!isRecord(parsedUnknown)) {
      return {
        name: path.basename(repoRoot),
        scripts: {},
        dependencies: {},
        devDependencies: {},
        workspaces: []
      };
    }

    const workspacesRaw = parsedUnknown.workspaces;
    const workspaces = asStringArray(workspacesRaw);

    return {
      name: asString(parsedUnknown.name) || path.basename(repoRoot),
      scripts: asStringMap(parsedUnknown.scripts),
      dependencies: asStringMap(parsedUnknown.dependencies),
      devDependencies: asStringMap(parsedUnknown.devDependencies),
      workspaces
    };
  } catch {
    return {
      name: path.basename(repoRoot),
      scripts: {},
      dependencies: {},
      devDependencies: {},
      workspaces: []
    };
  }
};

const detectLanguages = async (repoRoot: string): Promise<readonly string[]> => {
  const files = await listAllFiles(repoRoot);
  const extensionToLanguage: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.mjs': 'JavaScript',
    '.cjs': 'JavaScript',
    '.py': 'Python',
    '.go': 'Go',
    '.java': 'Java',
    '.rb': 'Ruby',
    '.rs': 'Rust',
    '.tf': 'Terraform',
    '.sql': 'SQL',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.json': 'JSON',
    '.md': 'Markdown'
  };

  const counts = new Map<string, number>();

  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    const language = extensionToLanguage[extension];
    if (language === undefined) {
      continue;
    }

    const currentCount = counts.get(language) ?? 0;
    counts.set(language, currentCount + 1);
  }

  const byFrequency = Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
  return byFrequency.map(([language]) => language);
};

const detectFrameworks = async (
  repoRoot: string,
  dependencyNames: readonly string[]
): Promise<readonly string[]> => {
  const dependencySet = new Set(dependencyNames);
  const frameworks: string[] = [];

  const includeIfPresent = (pkg: string, label: string): void => {
    if (dependencySet.has(pkg)) {
      frameworks.push(label);
    }
  };

  includeIfPresent('next', 'next');
  includeIfPresent('react', 'react');
  includeIfPresent('vite', 'vite');
  includeIfPresent('express', 'express');
  includeIfPresent('fastify', 'fastify');
  includeIfPresent('@nestjs/core', 'nest');
  includeIfPresent('koa', 'koa');
  includeIfPresent('hono', 'hono');
  includeIfPresent('prisma', 'prisma');
  includeIfPresent('typeorm', 'typeorm');
  includeIfPresent('sequelize', 'sequelize');
  includeIfPresent('mongoose', 'mongoose');
  includeIfPresent('kafkajs', 'kafka');
  includeIfPresent('@aws-sdk/client-sqs', 'sqs');
  includeIfPresent('amqplib', 'rabbitmq');
  includeIfPresent('bullmq', 'bullmq');

  const dockerfile = await readTextIfExists(path.join(repoRoot, 'Dockerfile'));
  if (dockerfile.length > 0) {
    frameworks.push('docker');
  }

  return uniqueSorted(frameworks);
};

const detectPackageManager = async (repoRoot: string): Promise<string> => {
  const lockfiles: Readonly<Record<string, string>> = {
    'pnpm-lock.yaml': 'pnpm',
    'yarn.lock': 'yarn',
    'package-lock.json': 'npm',
    'bun.lockb': 'bun'
  };

  for (const [fileName, manager] of Object.entries(lockfiles)) {
    const raw = await readTextIfExists(path.join(repoRoot, fileName));
    if (raw.length > 0) {
      return manager;
    }
  }

  return 'unknown';
};

const parseOwnerTeam = async (repoRoot: string): Promise<readonly string[]> => {
  const content = await readTextIfExists(path.join(repoRoot, 'CODEOWNERS'));
  if (content.length === 0) {
    return [];
  }

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('#'));

  const owners = lines
    .flatMap((line) => line.split(/\s+/).slice(1))
    .filter((token) => token.startsWith('@'));

  return uniqueSorted(owners);
};

const detectRepoType = (
  packageSummary: PackageSummary,
  frameworks: readonly string[],
  topLevelFolders: readonly string[]
): RepoType => {
  if (packageSummary.workspaces.length > 0) {
    return 'mono-repo';
  }

  const folderSet = new Set(topLevelFolders);
  const frameworkSet = new Set(frameworks);

  if (folderSet.has('terraform') || folderSet.has('infra') || folderSet.has('helm') || folderSet.has('k8s')) {
    return 'infra';
  }

  if (frameworkSet.has('next') || frameworkSet.has('react') || frameworkSet.has('vite')) {
    return 'frontend';
  }

  if (frameworkSet.has('bullmq') || packageSummary.scripts.worker !== undefined) {
    return 'worker';
  }

  if (
    frameworkSet.has('express') ||
    frameworkSet.has('fastify') ||
    frameworkSet.has('nest') ||
    packageSummary.scripts.start !== undefined
  ) {
    return 'service';
  }

  if (
    frameworkSet.has('prisma') ||
    frameworkSet.has('typeorm') ||
    frameworkSet.has('sequelize') ||
    frameworkSet.has('mongoose')
  ) {
    return 'data';
  }

  if (packageSummary.scripts.build !== undefined || packageSummary.dependencies.length > 0) {
    return 'library';
  }

  return 'unknown';
};

export interface InventoryExtraction {
  readonly metadata: RepoMetadata;
  readonly packageSummary: PackageSummary;
}

export const extractInventory = async (
  scanRoot: string,
  repoRoot: string,
  topLevelFolders: readonly string[]
): Promise<InventoryExtraction> => {
  const parsedPackage = await readPackageJson(repoRoot);
  const allDependencies = uniqueSorted([
    ...Object.keys(parsedPackage.dependencies),
    ...Object.keys(parsedPackage.devDependencies)
  ]);

  const packageSummary: PackageSummary = {
    name: parsedPackage.name,
    scripts: parsedPackage.scripts,
    dependencies: Object.keys(parsedPackage.dependencies).sort((left, right) => left.localeCompare(right)),
    devDependencies: Object.keys(parsedPackage.devDependencies).sort((left, right) => left.localeCompare(right)),
    workspaces: parsedPackage.workspaces
  };

  const frameworks = await detectFrameworks(repoRoot, allDependencies);
  const metadata: RepoMetadata = {
    name: parsedPackage.name,
    rootPath: repoRoot,
    relativePath: path.relative(scanRoot, repoRoot) || '.',
    languages: await detectLanguages(repoRoot),
    frameworks,
    packageManager: await detectPackageManager(repoRoot),
    repoType: detectRepoType(packageSummary, frameworks, topLevelFolders),
    ownerTeam: await parseOwnerTeam(repoRoot)
  };

  return {
    metadata,
    packageSummary
  };
};
