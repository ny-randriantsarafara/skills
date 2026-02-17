import * as path from 'node:path';
import fg from 'fast-glob';
import { readTextIfExists } from '../lib/fs-utils.js';
import type { DataEntity, DataRelationship, DbModelSummary } from '../lib/contracts.js';
import { uniqueSorted } from '../lib/text-utils.js';

const parsePrismaModels = async (repoRoot: string): Promise<DbModelSummary> => {
  const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');
  const schema = await readTextIfExists(schemaPath);
  if (schema.length === 0) {
    return {
      entities: [],
      relationships: []
    };
  }

  const modelPattern = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
  const entities: DataEntity[] = [];
  const relationships: DataRelationship[] = [];

  for (const modelMatch of schema.matchAll(modelPattern)) {
    const modelName = modelMatch[1];
    const body = modelMatch[2] ?? '';
    if (modelName === undefined) {
      continue;
    }

    entities.push({
      name: modelName,
      source: 'prisma/schema.prisma'
    });

    const relationFieldPattern = /^\s*\w+\s+(\w+)\s+@relation/gm;
    for (const relationMatch of body.matchAll(relationFieldPattern)) {
      const target = relationMatch[1];
      if (target === undefined) {
        continue;
      }

      relationships.push({
        from: modelName,
        to: target,
        relation: 'relation',
        source: 'prisma/schema.prisma'
      });
    }
  }

  return {
    entities,
    relationships
  };
};

const parseSqlTables = async (repoRoot: string): Promise<readonly DataEntity[]> => {
  const sqlFiles = await fg(['**/*.sql'], {
    cwd: repoRoot,
    ignore: ['**/node_modules/**', '**/.repo-intel/**']
  });

  const entities = await Promise.all(
    sqlFiles.map(async (relativePath) => {
      const content = await readTextIfExists(path.join(repoRoot, relativePath));
      const tablePattern = /create\s+table\s+"?([a-zA-Z0-9_]+)"?/gi;
      const fileEntities: DataEntity[] = [];

      for (const match of content.matchAll(tablePattern)) {
        const tableName = match[1];
        if (tableName === undefined) {
          continue;
        }

        fileEntities.push({
          name: tableName,
          source: relativePath
        });
      }

      return fileEntities;
    })
  );

  return entities.flat();
};

const parseOrmDecorators = async (repoRoot: string): Promise<readonly DataEntity[]> => {
  const sourceFiles = await fg(['**/*.{ts,js}'], {
    cwd: repoRoot,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.repo-intel/**']
  });

  const entities = await Promise.all(
    sourceFiles.map(async (relativePath) => {
      const content = await readTextIfExists(path.join(repoRoot, relativePath));
      const pattern = /@Entity\(\s*['"`]([^'"`]+)['"`]?\s*\)/g;
      const collected: DataEntity[] = [];

      for (const match of content.matchAll(pattern)) {
        const name = match[1];
        if (name === undefined || name.length === 0) {
          continue;
        }

        collected.push({
          name,
          source: relativePath
        });
      }

      return collected;
    })
  );

  return entities.flat();
};

const dedupeEntities = (entities: readonly DataEntity[]): readonly DataEntity[] => {
  const encoded = uniqueSorted(entities.map((entity) => `${entity.name}|${entity.source}`));
  return encoded
    .map((item) => {
      const parts = item.split('|');
      const name = parts[0];
      const source = parts[1];
      if (name === undefined || source === undefined) {
        return null;
      }

      return {
        name,
        source
      };
    })
    .filter((item): item is DataEntity => item !== null);
};

const dedupeRelationships = (relationships: readonly DataRelationship[]): readonly DataRelationship[] => {
  const encoded = uniqueSorted(
    relationships.map((relation) => `${relation.from}|${relation.to}|${relation.relation}|${relation.source}`)
  );

  return encoded
    .map((item) => {
      const parts = item.split('|');
      const from = parts[0];
      const to = parts[1];
      const relation = parts[2];
      const source = parts[3];
      if (from === undefined || to === undefined || relation === undefined || source === undefined) {
        return null;
      }

      return {
        from,
        to,
        relation,
        source
      };
    })
    .filter((item): item is DataRelationship => item !== null);
};

export const extractDbModels = async (repoRoot: string): Promise<DbModelSummary> => {
  const prisma = await parsePrismaModels(repoRoot);
  const sqlEntities = await parseSqlTables(repoRoot);
  const ormEntities = await parseOrmDecorators(repoRoot);

  const entities = dedupeEntities([...prisma.entities, ...sqlEntities, ...ormEntities]);
  const relationships = dedupeRelationships(prisma.relationships);

  return {
    entities,
    relationships
  };
};
