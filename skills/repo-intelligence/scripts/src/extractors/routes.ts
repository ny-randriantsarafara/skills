import * as path from 'node:path';
import { readTextIfExists } from '../lib/fs-utils.js';
import { uniqueSorted } from '../lib/text-utils.js';
import type {
  ApiSurface,
  CliEntrypoint,
  CronJobDescriptor,
  MessageConsumer,
  PackageSummary,
  RouteDescriptor
} from '../lib/contracts.js';

const normalizeRoutePath = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '/';
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return `/${trimmed}`;
};

const normalizeMethod = (value: string): string => value.toUpperCase();

const dedupeRoutes = (routes: readonly RouteDescriptor[]): readonly RouteDescriptor[] => {
  const seen = new Set<string>();
  const output: RouteDescriptor[] = [];

  for (const route of routes) {
    const key = `${route.method}:${route.path}:${route.file}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(route);
  }

  return output.sort((left, right) => {
    const methodCompare = left.method.localeCompare(right.method);
    if (methodCompare !== 0) {
      return methodCompare;
    }

    const pathCompare = left.path.localeCompare(right.path);
    if (pathCompare !== 0) {
      return pathCompare;
    }

    return left.file.localeCompare(right.file);
  });
};

const extractExpressLikeRoutes = (filePath: string, code: string): readonly RouteDescriptor[] => {
  const pattern = /\b(?:app|router|fastify)\.(get|post|put|patch|delete|options|head|all)\(\s*['"`]([^'"`]+)['"`]/gi;
  const routes: RouteDescriptor[] = [];

  for (const match of code.matchAll(pattern)) {
    const method = match[1];
    const routePath = match[2];
    if (method === undefined || routePath === undefined) {
      continue;
    }

    routes.push({
      method: normalizeMethod(method),
      path: normalizeRoutePath(routePath),
      file: filePath,
      style: 'express-like'
    });
  }

  return routes;
};

const extractNestRoutes = (filePath: string, code: string): readonly RouteDescriptor[] => {
  const prefixPattern = /@Controller\(\s*['"`]([^'"`]*)['"`]?\s*\)/g;
  const methodPattern = /@(Get|Post|Put|Patch|Delete|Options|Head|All)\(\s*['"`]([^'"`]*)['"`]?\s*\)/g;

  const prefixes = Array.from(code.matchAll(prefixPattern)).map((match) => {
    const prefix = match[1] ?? '';
    return normalizeRoutePath(prefix);
  });

  const basePrefix = prefixes[0] ?? '/';
  const routes: RouteDescriptor[] = [];

  for (const match of code.matchAll(methodPattern)) {
    const method = match[1];
    const suffix = match[2] ?? '';
    if (method === undefined) {
      continue;
    }

    const combined = `${basePrefix}/${suffix}`.replace(/\/+/g, '/');
    routes.push({
      method: normalizeMethod(method),
      path: normalizeRoutePath(combined),
      file: filePath,
      style: 'nestjs'
    });
  }

  return routes;
};

const frontendRouteFromFilePath = (filePath: string): string => {
  const normalized = filePath.split(path.sep).join('/');

  if (normalized.includes('/pages/')) {
    const pagePath = normalized.split('/pages/')[1] ?? '';
    const withoutExt = pagePath.replace(/\.(t|j)sx?$/, '');
    const withoutIndex = withoutExt.replace(/\/index$/, '/');
    const route = withoutIndex.replace(/\[(.+?)\]/g, ':$1');
    return normalizeRoutePath(route);
  }

  if (normalized.includes('/app/')) {
    const appPath = normalized.split('/app/')[1] ?? '';
    const withoutFile = appPath.replace(/\/(page|route)\.(t|j)sx?$/, '');
    const route = withoutFile.replace(/\[(.+?)\]/g, ':$1');
    return normalizeRoutePath(route);
  }

  return '/';
};

const extractMessageConsumers = (filePath: string, code: string): readonly MessageConsumer[] => {
  const patterns: ReadonlyArray<{ readonly transport: string; readonly regex: RegExp }> = [
    { transport: 'kafka', regex: /(?:subscribe|topic)\s*[:(]\s*['"`]([^'"`]+)['"`]/gi },
    { transport: 'nestjs-message', regex: /@MessagePattern\(\s*['"`]([^'"`]+)['"`]/gi },
    { transport: 'rabbitmq', regex: /\.consume\(\s*['"`]([^'"`]+)['"`]/gi },
    { transport: 'sqs', regex: /queueUrl\s*[:=]\s*['"`]([^'"`]+)['"`]/gi }
  ];

  const consumers: MessageConsumer[] = [];

  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern.regex)) {
      const topicOrQueue = match[1];
      if (topicOrQueue === undefined || topicOrQueue.length === 0) {
        continue;
      }

      consumers.push({
        transport: pattern.transport,
        topicOrQueue,
        file: filePath
      });
    }
  }

  return consumers;
};

const extractCronJobs = (filePath: string, code: string): readonly CronJobDescriptor[] => {
  const pattern = /(?:cron\.schedule|new\s+CronJob|@Cron)\(\s*['"`]([^'"`]+)['"`]/gi;
  const jobs: CronJobDescriptor[] = [];

  for (const match of code.matchAll(pattern)) {
    const schedule = match[1];
    if (schedule === undefined || schedule.length === 0) {
      continue;
    }

    jobs.push({
      schedule,
      file: filePath
    });
  }

  return jobs;
};

const extractApiClients = (sourceContents: readonly string[]): readonly string[] => {
  const signatures: ReadonlyArray<{ readonly name: string; readonly pattern: RegExp }> = [
    { name: 'fetch', pattern: /\bfetch\s*\(/ },
    { name: 'axios', pattern: /\baxios\./ },
    { name: 'apollo-client', pattern: /@apollo\/client/ },
    { name: 'swr', pattern: /\bswr\b/i },
    { name: 'react-query', pattern: /@tanstack\/react-query/ }
  ];

  const detected = signatures
    .filter((signature) => sourceContents.some((code) => signature.pattern.test(code)))
    .map((signature) => signature.name);

  return uniqueSorted(detected);
};

const extractAuthSignals = (sourceContents: readonly string[], deps: readonly string[]): readonly string[] => {
  const dependencySignals = deps.filter((dep) => {
    return dep.includes('auth') || dep.includes('passport') || dep.includes('jwt');
  });

  const codeSignals = sourceContents
    .flatMap((code) => {
      const hits: string[] = [];

      if (code.includes('next-auth')) {
        hits.push('next-auth');
      }
      if (code.includes('passport')) {
        hits.push('passport');
      }
      if (code.includes('jwt')) {
        hits.push('jwt');
      }
      if (code.includes('Auth0')) {
        hits.push('auth0');
      }

      return hits;
    })
    .filter((entry) => entry.length > 0);

  return uniqueSorted([...dependencySignals, ...codeSignals]);
};

const extractCliEntrypoints = (packageSummary: PackageSummary): readonly CliEntrypoint[] => {
  const scriptEntries = Object.entries(packageSummary.scripts)
    .filter(([name]) => name.includes('cli') || name.includes('migrate') || name.includes('seed'))
    .map(([name, command]) => ({
      name,
      command
    }));

  return scriptEntries.sort((left, right) => left.name.localeCompare(right.name));
};

export interface RouteExtractionResult {
  readonly routes: readonly RouteDescriptor[];
  readonly apiSurface: ApiSurface;
}

export const extractRoutesAndApiSurface = async (
  repoRoot: string,
  sourceFiles: readonly string[],
  packageSummary: PackageSummary
): Promise<RouteExtractionResult> => {
  const enriched = await Promise.all(
    sourceFiles.map(async (relativePath) => {
      const fullPath = path.join(repoRoot, relativePath);
      const code = await readTextIfExists(fullPath);
      return {
        relativePath,
        code
      };
    })
  );

  const allRoutes = enriched.flatMap(({ relativePath, code }) => {
    const expressLike = extractExpressLikeRoutes(relativePath, code);
    const nest = extractNestRoutes(relativePath, code);
    return [...expressLike, ...nest];
  });

  const frontendPages = enriched
    .map(({ relativePath }) => relativePath)
    .filter((relativePath) => {
      const normalized = relativePath.split(path.sep).join('/');
      const isPages = normalized.includes('/pages/') && /\.(t|j)sx?$/.test(normalized);
      const isApp = normalized.includes('/app/') && /\/(page|route)\.(t|j)sx?$/.test(normalized);
      return isPages || isApp;
    })
    .map(frontendRouteFromFilePath);

  const sourceContents = enriched.map(({ code }) => code);
  const messageConsumers = enriched.flatMap(({ relativePath, code }) => extractMessageConsumers(relativePath, code));
  const cronJobs = enriched.flatMap(({ relativePath, code }) => extractCronJobs(relativePath, code));

  const dedupedRoutes = dedupeRoutes(allRoutes);
  const dedupedConsumers = uniqueSorted(
    messageConsumers.map((item) => `${item.transport}|${item.topicOrQueue}|${item.file}`)
  )
    .map((encoded) => {
      const parts = encoded.split('|');
      const transport = parts[0];
      const topicOrQueue = parts[1];
      const file = parts[2];
      if (transport === undefined || topicOrQueue === undefined || file === undefined) {
        return null;
      }

      return {
        transport,
        topicOrQueue,
        file
      };
    })
    .filter((item): item is { transport: string; topicOrQueue: string; file: string } => item !== null);

  const dedupedCronJobs = uniqueSorted(cronJobs.map((item) => `${item.schedule}|${item.file}`))
    .map((encoded) => {
      const parts = encoded.split('|');
      const schedule = parts[0];
      const file = parts[1];
      if (schedule === undefined || file === undefined) {
        return null;
      }

      return {
        schedule,
        file
      };
    })
    .filter((item): item is { schedule: string; file: string } => item !== null);

  const apiSurface: ApiSurface = {
    routes: dedupedRoutes,
    messageConsumers: dedupedConsumers,
    cronJobs: dedupedCronJobs,
    cliEntrypoints: extractCliEntrypoints(packageSummary),
    frontendPages: uniqueSorted(frontendPages),
    apiClients: extractApiClients(sourceContents),
    authSignals: extractAuthSignals(sourceContents, packageSummary.dependencies)
  };

  return {
    routes: dedupedRoutes,
    apiSurface
  };
};
