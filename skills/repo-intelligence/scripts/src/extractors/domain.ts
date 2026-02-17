import * as path from 'node:path';
import { Project } from 'ts-morph';
import { listTopLevelFolders } from '../lib/fs-utils.js';
import { tokenize, uniqueSorted } from '../lib/text-utils.js';
import type { DbModelSummary, DomainTerm, DomainTerms, RouteDescriptor } from '../lib/contracts.js';

interface Accumulator {
  readonly score: number;
  readonly sources: readonly string[];
}

const addTerm = (
  current: ReadonlyMap<string, Accumulator>,
  term: string,
  source: string,
  weight: number
): ReadonlyMap<string, Accumulator> => {
  const existing = current.get(term);
  if (existing === undefined) {
    const next = new Map(current);
    next.set(term, {
      score: weight,
      sources: [source]
    });
    return next;
  }

  const mergedSources = uniqueSorted([...existing.sources, source]);
  const next = new Map(current);
  next.set(term, {
    score: existing.score + weight,
    sources: mergedSources
  });
  return next;
};

const accumulateTokens = (
  current: ReadonlyMap<string, Accumulator>,
  rawValue: string,
  source: string,
  weight: number
): ReadonlyMap<string, Accumulator> => {
  const tokens = tokenize(rawValue);
  let nextMap = current;

  for (const token of tokens) {
    nextMap = addTerm(nextMap, token, source, weight);
  }

  return nextMap;
};

const collectTypeScriptTypeNames = (repoRoot: string, sourceFiles: readonly string[]): readonly string[] => {
  const absoluteFiles = sourceFiles.map((file) => path.join(repoRoot, file));
  if (absoluteFiles.length === 0) {
    return [];
  }

  const project = new Project({
    skipAddingFilesFromTsConfig: true
  });

  project.addSourceFilesAtPaths(absoluteFiles);

  const sourceFileNames = project.getSourceFiles().flatMap((sourceFile) => {
    const interfaces = sourceFile.getInterfaces().map((iface) => iface.getName());
    const classes = sourceFile.getClasses().map((klass) => klass.getName() ?? '');
    const typeAliases = sourceFile.getTypeAliases().map((alias) => alias.getName());
    const enums = sourceFile.getEnums().map((enumDecl) => enumDecl.getName());
    return [...interfaces, ...classes, ...typeAliases, ...enums].filter((name) => name.length > 0);
  });

  return uniqueSorted(sourceFileNames);
};

export const extractDomainTerms = async (
  repoRoot: string,
  routes: readonly RouteDescriptor[],
  dbModels: DbModelSummary,
  sourceFiles: readonly string[]
): Promise<DomainTerms> => {
  const topLevelFolders = await listTopLevelFolders(repoRoot);

  const routeSegments = routes.flatMap((route) => route.path.split('/').filter((segment) => segment.length > 0));
  const entityNames = dbModels.entities.map((entity) => entity.name);
  const relationNames = dbModels.relationships.flatMap((relationship) => [relationship.from, relationship.to]);
  const sourceTypeNames = collectTypeScriptTypeNames(repoRoot, sourceFiles);

  let accumulator: ReadonlyMap<string, Accumulator> = new Map();

  for (const folder of topLevelFolders) {
    accumulator = accumulateTokens(accumulator, folder, 'folder', 2);
  }

  for (const segment of routeSegments) {
    accumulator = accumulateTokens(accumulator, segment, 'route', 3);
  }

  for (const entity of entityNames) {
    accumulator = accumulateTokens(accumulator, entity, 'entity', 4);
  }

  for (const relation of relationNames) {
    accumulator = accumulateTokens(accumulator, relation, 'relation', 3);
  }

  for (const typeName of sourceTypeNames) {
    accumulator = accumulateTokens(accumulator, typeName, 'type', 1);
  }

  const ranked: readonly DomainTerm[] = Array.from(accumulator.entries())
    .map(([term, info]) => {
      return {
        term,
        score: info.score,
        sources: info.sources
      };
    })
    .filter((entry) => entry.sources.length >= 1)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      return left.term.localeCompare(right.term);
    })
    .slice(0, 30);

  return {
    topTerms: ranked
  };
};
