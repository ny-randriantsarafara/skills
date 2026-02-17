import * as path from 'node:path';
import { readTextIfExists } from '../lib/fs-utils.js';
import { uniqueSorted } from '../lib/text-utils.js';
import type {
  DependenciesExternal,
  DependenciesInternal,
  InternalDependency,
  OutboundCall,
  PackageSummary
} from '../lib/contracts.js';

const INTERNAL_HOST_TOKENS = ['internal', 'svc', 'service', 'cluster.local', '.local'];

const isInternalHost = (host: string): boolean => {
  return INTERNAL_HOST_TOKENS.some((token) => host.includes(token));
};

const parseOutboundUrls = (code: string): readonly string[] => {
  const pattern = /https?:\/\/[^\s'"`]+/g;
  const urls = Array.from(code.matchAll(pattern)).map((match) => match[0]);
  return urls.filter((value): value is string => value !== undefined && value.length > 0);
};

const hostFromUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);
    return parsed.host;
  } catch {
    return '';
  }
};

const detectSdkUsages = (dependencies: readonly string[]): readonly string[] => {
  const patterns = ['@aws-sdk/', 'aws-sdk', '@google-cloud/', 'stripe', 'twilio', 'firebase-admin'];
  const matches = dependencies.filter((dependency) => patterns.some((pattern) => dependency.startsWith(pattern)));
  return uniqueSorted(matches);
};

const detectDatabases = (dependencies: readonly string[]): readonly string[] => {
  const keywords = ['postgres', 'pg', 'mysql', 'mariadb', 'mongodb', 'mongoose', 'redis', 'dynamodb', 'prisma'];
  const matches = dependencies.filter((dependency) => keywords.some((keyword) => dependency.includes(keyword)));
  return uniqueSorted(matches);
};

const detectQueues = (dependencies: readonly string[]): readonly string[] => {
  const keywords = ['kafka', 'bull', 'amq', 'rabbit', 'sqs', 'sns'];
  const matches = dependencies.filter((dependency) => keywords.some((keyword) => dependency.includes(keyword)));
  return uniqueSorted(matches);
};

const detectInternalPackages = (packageSummary: PackageSummary): readonly string[] => {
  const allDependencies = [...packageSummary.dependencies, ...packageSummary.devDependencies];
  const workspaceStyle = allDependencies.filter((name) => name.startsWith('@'));
  return uniqueSorted(workspaceStyle);
};

const inferInternalInteractions = (
  internalPackages: readonly string[],
  internalHostEnvVars: readonly string[]
): readonly InternalDependency[] => {
  const packageInteractions: InternalDependency[] = internalPackages.map((target) => {
    return {
      target,
      kind: 'pkg',
      evidence: 'package dependency'
    };
  });

  const hostInteractions: InternalDependency[] = internalHostEnvVars.map((target) => {
    return {
      target,
      kind: 'http',
      evidence: 'internal endpoint env var'
    };
  });

  return [...packageInteractions, ...hostInteractions];
};

export interface DependencyExtractionResult {
  readonly outboundCalls: readonly OutboundCall[];
  readonly dependenciesExternal: DependenciesExternal;
  readonly dependenciesInternal: DependenciesInternal;
}

export const extractDependencies = async (
  repoRoot: string,
  sourceFiles: readonly string[],
  packageSummary: PackageSummary,
  endpointEnvVars: readonly string[]
): Promise<DependencyExtractionResult> => {
  const sourceCode = await Promise.all(
    sourceFiles.map(async (relativePath) => {
      const code = await readTextIfExists(path.join(repoRoot, relativePath));
      return {
        relativePath,
        code
      };
    })
  );

  const outboundCalls = sourceCode.flatMap(({ relativePath, code }) => {
    const urls = parseOutboundUrls(code);
    return urls.map((url) => {
      return {
        host: hostFromUrl(url),
        protocol: url.startsWith('https://') ? 'https' : 'http',
        file: relativePath
      };
    });
  });

  const cleanOutbound = outboundCalls.filter((call) => call.host.length > 0);
  const hostSet = uniqueSorted(cleanOutbound.map((call) => call.host));
  const internalHosts = hostSet.filter((host) => isInternalHost(host));
  const externalHosts = hostSet.filter((host) => !isInternalHost(host));

  const allDeps = [...packageSummary.dependencies, ...packageSummary.devDependencies];
  const sdkUsages = detectSdkUsages(allDeps);
  const databases = detectDatabases(allDeps);
  const queues = detectQueues(allDeps);

  const dependenciesExternal: DependenciesExternal = {
    outboundHosts: externalHosts,
    sdkUsages,
    databases,
    queues,
    thirdParties: externalHosts
  };

  const internalPackages = detectInternalPackages(packageSummary);
  const internalHostEnvVars = endpointEnvVars.filter((envVar) => {
    const normalized = envVar.toLowerCase();
    return normalized.includes('internal') || normalized.includes('svc');
  });

  const dependenciesInternal: DependenciesInternal = {
    internalPackages,
    internalHostEnvVars,
    interactions: inferInternalInteractions(internalPackages, internalHostEnvVars)
  };

  return {
    outboundCalls: cleanOutbound,
    dependenciesExternal,
    dependenciesInternal
  };
};
