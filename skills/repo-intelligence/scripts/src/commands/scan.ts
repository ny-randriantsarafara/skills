import * as path from 'node:path';
import {
  detectGitSha,
  discoverGitRoots,
  ensureDir,
  listSourceFiles,
  listTopLevelFolders,
  writeJson,
  writeText
} from '../lib/fs-utils.js';
import type { Inventory, RepoRawData, ScanResult } from '../lib/contracts.js';
import { markdownTable } from '../lib/markdown.js';
import { extractInventory } from '../extractors/inventory.js';
import { extractRoutesAndApiSurface } from '../extractors/routes.js';
import { extractDbModels } from '../extractors/db.js';
import { extractEnvVars } from '../extractors/env.js';
import { extractDependencies } from '../extractors/deps.js';
import { extractQualitySignals } from '../extractors/quality.js';
import { extractDomainTerms } from '../extractors/domain.js';

interface ScanOptions {
  readonly root: string;
  readonly snapshotId?: string;
}

const formatTimestamp = (): string => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-');
};

const resolveSnapshotId = async (root: string, explicitSnapshotId?: string): Promise<string> => {
  if (explicitSnapshotId !== undefined && explicitSnapshotId.length > 0) {
    return explicitSnapshotId;
  }

  const sha = await detectGitSha(root);
  const timestamp = formatTimestamp();
  return `${sha}-${timestamp}`;
};

const buildInventoryMarkdown = (inventory: Inventory): string => {
  const rows = inventory.repos.map((repo) => {
    return [
      repo.name,
      repo.repoType,
      repo.languages.join(', ') || '-',
      repo.frameworks.join(', ') || '-',
      repo.packageManager,
      repo.ownerTeam.join(', ') || '-'
    ];
  });

  const table = markdownTable(
    ['Repo', 'Type', 'Languages', 'Frameworks', 'Package Manager', 'Owner Team'],
    rows
  );

  return `# Repository Inventory\n\nGenerated at: ${inventory.generatedAt}\n\n${table}\n`;
};

const writeRepoRawFiles = async (intelRoot: string, repo: RepoRawData): Promise<void> => {
  const repoDir = path.join(intelRoot, 'repos', repo.metadata.name, 'raw');

  await writeJson(path.join(repoDir, 'package.summary.json'), repo.packageSummary);
  await writeJson(path.join(repoDir, 'routes.json'), repo.routes);
  await writeJson(path.join(repoDir, 'api_surface.json'), repo.apiSurface);
  await writeJson(path.join(repoDir, 'domain_terms.json'), repo.domainTerms);
  await writeJson(path.join(repoDir, 'db_models.json'), repo.dbModels);
  await writeJson(path.join(repoDir, 'outbound_calls.json'), repo.outboundCalls);
  await writeJson(path.join(repoDir, 'dependencies_external.json'), repo.dependenciesExternal);
  await writeJson(path.join(repoDir, 'dependencies_internal.json'), repo.dependenciesInternal);
  await writeJson(path.join(repoDir, 'envvars.json'), repo.envVars);
  await writeJson(path.join(repoDir, 'quality_signals.json'), repo.qualitySignals);
};

const writeSnapshotFiles = async (intelRoot: string, snapshotId: string, result: ScanResult): Promise<void> => {
  const snapshotRoot = path.join(intelRoot, 'snapshots', snapshotId);
  await ensureDir(snapshotRoot);

  await writeJson(path.join(snapshotRoot, 'inventory.json'), result.inventory);

  for (const repo of result.repos) {
    const repoDir = path.join(snapshotRoot, 'repos', repo.metadata.name, 'raw');
    await writeJson(path.join(repoDir, 'package.summary.json'), repo.packageSummary);
    await writeJson(path.join(repoDir, 'routes.json'), repo.routes);
    await writeJson(path.join(repoDir, 'api_surface.json'), repo.apiSurface);
    await writeJson(path.join(repoDir, 'domain_terms.json'), repo.domainTerms);
    await writeJson(path.join(repoDir, 'db_models.json'), repo.dbModels);
    await writeJson(path.join(repoDir, 'outbound_calls.json'), repo.outboundCalls);
    await writeJson(path.join(repoDir, 'dependencies_external.json'), repo.dependenciesExternal);
    await writeJson(path.join(repoDir, 'dependencies_internal.json'), repo.dependenciesInternal);
    await writeJson(path.join(repoDir, 'envvars.json'), repo.envVars);
    await writeJson(path.join(repoDir, 'quality_signals.json'), repo.qualitySignals);
  }
};

const scanSingleRepo = async (scanRoot: string, repoRoot: string): Promise<RepoRawData> => {
  const topLevelFolders = await listTopLevelFolders(repoRoot);
  const { metadata, packageSummary } = await extractInventory(scanRoot, repoRoot, topLevelFolders);

  const sourceFiles = await listSourceFiles(repoRoot);
  const { routes, apiSurface } = await extractRoutesAndApiSurface(repoRoot, sourceFiles, packageSummary);
  const dbModels = await extractDbModels(repoRoot);
  const envVars = await extractEnvVars(repoRoot, sourceFiles);
  const { outboundCalls, dependenciesExternal, dependenciesInternal } = await extractDependencies(
    repoRoot,
    sourceFiles,
    packageSummary,
    envVars.endpointLike
  );
  const qualitySignals = await extractQualitySignals(repoRoot, sourceFiles, packageSummary);
  const domainTerms = await extractDomainTerms(repoRoot, routes, dbModels, sourceFiles);

  return {
    metadata,
    packageSummary,
    routes,
    apiSurface,
    domainTerms,
    dbModels,
    outboundCalls,
    dependenciesExternal,
    dependenciesInternal,
    envVars,
    qualitySignals
  };
};

export const runScanCommand = async (options: ScanOptions): Promise<ScanResult> => {
  const scanRoot = path.resolve(options.root);
  const intelRoot = path.join(scanRoot, '.repo-intel');
  const snapshotId = await resolveSnapshotId(scanRoot, options.snapshotId);

  await ensureDir(intelRoot);

  const repoRoots = await discoverGitRoots(scanRoot);
  const repos = await Promise.all(repoRoots.map((repoRoot) => scanSingleRepo(scanRoot, repoRoot)));

  const inventory: Inventory = {
    generatedAt: new Date().toISOString(),
    scanRoot,
    snapshotId,
    repos: repos.map((repo) => repo.metadata)
  };

  const result: ScanResult = {
    inventory,
    repos
  };

  await writeJson(path.join(intelRoot, 'inventory.json'), inventory);
  await writeText(path.join(intelRoot, 'inventory.md'), buildInventoryMarkdown(inventory));

  for (const repo of repos) {
    await writeRepoRawFiles(intelRoot, repo);
  }

  await writeSnapshotFiles(intelRoot, snapshotId, result);

  return result;
};
