import * as path from 'node:path';
import { readJsonIfExists, writeText } from '../lib/fs-utils.js';
import { slugify } from '../lib/text-utils.js';
import type { DependenciesInternal, Inventory } from '../lib/contracts.js';
import { parseDependenciesInternal, parseInventory } from '../lib/parsers.js';

interface GraphEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string;
}

const sanitizeNodeId = (name: string): string => {
  const id = slugify(name).replace(/-/g, '_');
  if (id.length === 0) {
    return 'repo_unknown';
  }

  return id;
};

const parsePotentialRepoName = (token: string): string => {
  const cleaned = token.replace(/^@/, '').replace(/\/.*$/, '');
  if (cleaned.length === 0) {
    return token;
  }

  return cleaned;
};

const buildGraphEdges = (
  inventory: Inventory,
  depsByRepo: Readonly<Record<string, DependenciesInternal>>
): readonly GraphEdge[] => {
  const knownRepoNames = new Set(inventory.repos.map((repo) => repo.name));
  const edges: GraphEdge[] = [];

  for (const repo of inventory.repos) {
    const deps = depsByRepo[repo.name];
    if (deps === undefined) {
      continue;
    }

    for (const interaction of deps.interactions) {
      const targetGuess = parsePotentialRepoName(interaction.target);
      if (!knownRepoNames.has(targetGuess)) {
        continue;
      }

      edges.push({
        from: repo.name,
        to: targetGuess,
        label: interaction.kind
      });
    }
  }

  const uniqueKeys = new Set<string>();
  const uniqueEdges: GraphEdge[] = [];

  for (const edge of edges) {
    const key = `${edge.from}|${edge.to}|${edge.label}`;
    if (uniqueKeys.has(key)) {
      continue;
    }

    uniqueKeys.add(key);
    uniqueEdges.push(edge);
  }

  return uniqueEdges;
};

const buildMermaid = (inventory: Inventory, edges: readonly GraphEdge[]): string => {
  const lines: string[] = ['graph LR'];

  for (const repo of inventory.repos) {
    const nodeId = sanitizeNodeId(repo.name);
    lines.push(`  ${nodeId}["${repo.name}"]`);
  }

  for (const edge of edges) {
    const from = sanitizeNodeId(edge.from);
    const to = sanitizeNodeId(edge.to);
    lines.push(`  ${from} -- "${edge.label}" --> ${to}`);
  }

  return `${lines.join('\n')}\n`;
};

interface GraphOptions {
  readonly root: string;
}

export const runGraphCommand = async (options: GraphOptions): Promise<string> => {
  const scanRoot = path.resolve(options.root);
  const intelRoot = path.join(scanRoot, '.repo-intel');

  const inventoryRaw = await readJsonIfExists(path.join(intelRoot, 'inventory.json'));
  const inventory = parseInventory(inventoryRaw);
  if (inventory === null) {
    throw new Error('Missing .repo-intel/inventory.json. Run scan first.');
  }

  const depsByRepo: Record<string, DependenciesInternal> = {};
  const depsEntries = await Promise.all(
    inventory.repos.map(async (repo) => {
      const depsRaw = await readJsonIfExists(path.join(intelRoot, 'repos', repo.name, 'raw', 'dependencies_internal.json'));
      const deps = parseDependenciesInternal(depsRaw);
      return {
        repoName: repo.name,
        deps
      };
    })
  );

  for (const entry of depsEntries) {
    if (entry.deps === null) {
      continue;
    }
    depsByRepo[entry.repoName] = entry.deps;
  }

  const edges = buildGraphEdges(inventory, depsByRepo);
  const mermaid = buildMermaid(inventory, edges);
  const outputPath = path.join(intelRoot, 'org-service-map.mmd');
  await writeText(outputPath, mermaid);

  return outputPath;
};
