import * as path from 'node:path';
import { readTextIfExists } from '../lib/fs-utils.js';
import { uniqueSorted } from '../lib/text-utils.js';
import type { EnvSummary } from '../lib/contracts.js';

export const extractEnvVars = async (repoRoot: string, sourceFiles: readonly string[]): Promise<EnvSummary> => {
  const codes = await Promise.all(
    sourceFiles.map(async (relativePath) => {
      const fullPath = path.join(repoRoot, relativePath);
      return readTextIfExists(fullPath);
    })
  );

  const envPattern = /(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)/g;
  const matches = codes.flatMap((code) => Array.from(code.matchAll(envPattern)).map((match) => match[1] ?? ''));
  const all = uniqueSorted(matches.filter((value) => value.length > 0));
  const endpointLike = all.filter((name) => {
    return name.includes('URL') || name.includes('HOST') || name.includes('ENDPOINT') || name.includes('BASE');
  });

  return {
    all,
    endpointLike
  };
};
