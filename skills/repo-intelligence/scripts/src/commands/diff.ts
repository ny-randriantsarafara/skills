import * as path from 'node:path';
import { readJsonIfExists, writeJson, writeText } from '../lib/fs-utils.js';
import type { DiffReport, DiffSection, Inventory } from '../lib/contracts.js';
import { parseInventory } from '../lib/parsers.js';

interface DiffOptions {
  readonly root: string;
  readonly base: string;
  readonly head: string;
}

const sortedJsonString = (value: unknown): string => {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => sortedJsonString(item)), null, 2);
  }

  if (typeof value !== 'object' || value === null) {
    return JSON.stringify(value);
  }

  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  const normalized = Object.fromEntries(entries.map(([key, item]) => [key, sortedJsonString(item)]));
  return JSON.stringify(normalized, null, 2);
};

const compareSection = (
  baseData: Readonly<Record<string, string>>,
  headData: Readonly<Record<string, string>>
): DiffSection => {
  const baseKeys = new Set(Object.keys(baseData));
  const headKeys = new Set(Object.keys(headData));

  const added = Array.from(headKeys).filter((key) => !baseKeys.has(key)).sort((left, right) => left.localeCompare(right));
  const removed = Array.from(baseKeys)
    .filter((key) => !headKeys.has(key))
    .sort((left, right) => left.localeCompare(right));

  const common = Array.from(baseKeys)
    .filter((key) => headKeys.has(key))
    .sort((left, right) => left.localeCompare(right));

  const changed = common.filter((key) => baseData[key] !== headData[key]);

  return {
    added,
    removed,
    changed
  };
};

const loadSnapshotInventory = async (intelRoot: string, snapshotId: string): Promise<Inventory> => {
  const inventoryPath = path.join(intelRoot, 'snapshots', snapshotId, 'inventory.json');
  const inventoryRaw = await readJsonIfExists(inventoryPath);
  const inventory = parseInventory(inventoryRaw);
  if (inventory === null) {
    throw new Error(`Missing snapshot inventory: ${inventoryPath}`);
  }

  return inventory;
};

const loadSnapshotSection = async (
  intelRoot: string,
  snapshotId: string,
  repoNames: readonly string[],
  fileName: string
): Promise<Readonly<Record<string, string>>> => {
  const entries: Array<[string, string]> = await Promise.all(
    repoNames.map(async (repoName) => {
      const filePath = path.join(intelRoot, 'snapshots', snapshotId, 'repos', repoName, 'raw', fileName);
      const value = await readJsonIfExists(filePath);
      if (value === null) {
        return [repoName, ''];
      }

      return [repoName, sortedJsonString(value)];
    })
  );

  return Object.fromEntries(entries);
};

const toMarkdownList = (values: readonly string[]): string => {
  if (values.length === 0) {
    return '- None';
  }

  return values.map((value) => `- ${value}`).join('\n');
};

const diffSectionMarkdown = (name: string, section: DiffSection): string => {
  return [
    `## ${name}`,
    '',
    '### Added',
    toMarkdownList(section.added),
    '',
    '### Removed',
    toMarkdownList(section.removed),
    '',
    '### Changed',
    toMarkdownList(section.changed),
    ''
  ].join('\n');
};

export const runDiffCommand = async (options: DiffOptions): Promise<DiffReport> => {
  const scanRoot = path.resolve(options.root);
  const intelRoot = path.join(scanRoot, '.repo-intel');

  const baseInventory = await loadSnapshotInventory(intelRoot, options.base);
  const headInventory = await loadSnapshotInventory(intelRoot, options.head);

  const repoNames = Array.from(new Set([...baseInventory.repos.map((repo) => repo.name), ...headInventory.repos.map((repo) => repo.name)]))
    .sort((left, right) => left.localeCompare(right));

  const [baseApi, headApi, baseDeps, headDeps, baseDomain, headDomain, baseQuality, headQuality] = await Promise.all([
    loadSnapshotSection(intelRoot, options.base, repoNames, 'api_surface.json'),
    loadSnapshotSection(intelRoot, options.head, repoNames, 'api_surface.json'),
    loadSnapshotSection(intelRoot, options.base, repoNames, 'dependencies_external.json'),
    loadSnapshotSection(intelRoot, options.head, repoNames, 'dependencies_external.json'),
    loadSnapshotSection(intelRoot, options.base, repoNames, 'domain_terms.json'),
    loadSnapshotSection(intelRoot, options.head, repoNames, 'domain_terms.json'),
    loadSnapshotSection(intelRoot, options.base, repoNames, 'quality_signals.json'),
    loadSnapshotSection(intelRoot, options.head, repoNames, 'quality_signals.json')
  ]);

  const report: DiffReport = {
    generatedAt: new Date().toISOString(),
    baseSnapshot: options.base,
    headSnapshot: options.head,
    apiSurface: compareSection(baseApi, headApi),
    dependencies: compareSection(baseDeps, headDeps),
    domainTerms: compareSection(baseDomain, headDomain),
    qualitySignals: compareSection(baseQuality, headQuality)
  };

  await writeJson(path.join(intelRoot, 'diff.json'), report);

  const markdown = [
    '# Repo Intelligence Diff',
    '',
    `Base snapshot: ${options.base}`,
    `Head snapshot: ${options.head}`,
    '',
    diffSectionMarkdown('API Surface', report.apiSurface),
    diffSectionMarkdown('Dependencies', report.dependencies),
    diffSectionMarkdown('Domain Terms', report.domainTerms),
    diffSectionMarkdown('Quality Signals', report.qualitySignals)
  ].join('\n');

  await writeText(path.join(intelRoot, 'diff.md'), markdown);

  return report;
};
