import { asString, asStringArray, asStringMap, isRecord } from './type-guards.js';
import type {
  ApiSurface,
  CliEntrypoint,
  CronJobDescriptor,
  DataEntity,
  DataRelationship,
  DbModelSummary,
  DependenciesExternal,
  DependenciesInternal,
  DomainTerm,
  DomainTerms,
  EnvSummary,
  HotspotFile,
  InternalDependency,
  Inventory,
  MessageConsumer,
  PackageSummary,
  QualitySignals,
  RepoMetadata,
  RepoType,
  RouteDescriptor
} from './contracts.js';

const toRepoType = (value: string): RepoType => {
  if (value === 'service') {
    return 'service';
  }
  if (value === 'library') {
    return 'library';
  }
  if (value === 'infra') {
    return 'infra';
  }
  if (value === 'frontend') {
    return 'frontend';
  }
  if (value === 'worker') {
    return 'worker';
  }
  if (value === 'data') {
    return 'data';
  }
  if (value === 'mono-repo') {
    return 'mono-repo';
  }
  return 'unknown';
};

const toInteractionKind = (value: string): InternalDependency['kind'] | null => {
  if (value === 'http') {
    return 'http';
  }
  if (value === 'queue') {
    return 'queue';
  }
  if (value === 'pkg') {
    return 'pkg';
  }
  if (value === 'db') {
    return 'db';
  }
  if (value === 'sdk') {
    return 'sdk';
  }
  return null;
};

const toRouteDescriptor = (value: unknown): RouteDescriptor | null => {
  if (!isRecord(value)) {
    return null;
  }

  const method = asString(value.method);
  const routePath = asString(value.path);
  const file = asString(value.file);
  const styleRaw = asString(value.style);
  const style =
    styleRaw === 'express-like' || styleRaw === 'nestjs' || styleRaw === 'next' || styleRaw === 'unknown'
      ? styleRaw
      : 'unknown';

  if (method.length === 0 || routePath.length === 0 || file.length === 0) {
    return null;
  }

  return {
    method,
    path: routePath,
    file,
    style
  };
};

const toMessageConsumer = (value: unknown): MessageConsumer | null => {
  if (!isRecord(value)) {
    return null;
  }

  const transport = asString(value.transport);
  const topicOrQueue = asString(value.topicOrQueue);
  const file = asString(value.file);

  if (transport.length === 0 || topicOrQueue.length === 0 || file.length === 0) {
    return null;
  }

  return {
    transport,
    topicOrQueue,
    file
  };
};

const toCronJob = (value: unknown): CronJobDescriptor | null => {
  if (!isRecord(value)) {
    return null;
  }

  const schedule = asString(value.schedule);
  const file = asString(value.file);

  if (schedule.length === 0 || file.length === 0) {
    return null;
  }

  return {
    schedule,
    file
  };
};

const toCliEntrypoint = (value: unknown): CliEntrypoint | null => {
  if (!isRecord(value)) {
    return null;
  }

  const name = asString(value.name);
  const command = asString(value.command);
  if (name.length === 0 || command.length === 0) {
    return null;
  }

  return {
    name,
    command
  };
};

const toDomainTerm = (value: unknown): DomainTerm | null => {
  if (!isRecord(value)) {
    return null;
  }

  const term = asString(value.term);
  const scoreRaw = value.score;
  const score = typeof scoreRaw === 'number' ? scoreRaw : 0;
  const sources = asStringArray(value.sources);

  if (term.length === 0) {
    return null;
  }

  return {
    term,
    score,
    sources
  };
};

const toDataEntity = (value: unknown): DataEntity | null => {
  if (!isRecord(value)) {
    return null;
  }

  const name = asString(value.name);
  const source = asString(value.source);
  if (name.length === 0 || source.length === 0) {
    return null;
  }

  return {
    name,
    source
  };
};

const toDataRelationship = (value: unknown): DataRelationship | null => {
  if (!isRecord(value)) {
    return null;
  }

  const from = asString(value.from);
  const to = asString(value.to);
  const relation = asString(value.relation);
  const source = asString(value.source);

  if (from.length === 0 || to.length === 0 || relation.length === 0 || source.length === 0) {
    return null;
  }

  return {
    from,
    to,
    relation,
    source
  };
};

const toHotspotFile = (value: unknown): HotspotFile | null => {
  if (!isRecord(value)) {
    return null;
  }

  const file = asString(value.file);
  const linesRaw = value.lines;
  const lines = typeof linesRaw === 'number' ? linesRaw : 0;

  if (file.length === 0) {
    return null;
  }

  return {
    file,
    lines
  };
};

const toInternalDependency = (value: unknown): InternalDependency | null => {
  if (!isRecord(value)) {
    return null;
  }

  const target = asString(value.target);
  const kindRaw = asString(value.kind);
  const evidence = asString(value.evidence);
  const kind = toInteractionKind(kindRaw);

  if (kind === null || target.length === 0 || evidence.length === 0) {
    return null;
  }

  return {
    target,
    kind,
    evidence
  };
};

const parseRepoMetadata = (value: unknown): RepoMetadata | null => {
  if (!isRecord(value)) {
    return null;
  }

  const name = asString(value.name);
  const rootPath = asString(value.rootPath);
  const relativePath = asString(value.relativePath);

  if (name.length === 0 || rootPath.length === 0 || relativePath.length === 0) {
    return null;
  }

  return {
    name,
    rootPath,
    relativePath,
    languages: asStringArray(value.languages),
    frameworks: asStringArray(value.frameworks),
    packageManager: asString(value.packageManager),
    repoType: toRepoType(asString(value.repoType)),
    ownerTeam: asStringArray(value.ownerTeam)
  };
};

export const parseInventory = (value: unknown): Inventory | null => {
  if (!isRecord(value)) {
    return null;
  }

  const generatedAt = asString(value.generatedAt);
  const scanRoot = asString(value.scanRoot);
  const snapshotId = asString(value.snapshotId);
  const reposRaw = Array.isArray(value.repos) ? value.repos : [];
  const repos = reposRaw.map(parseRepoMetadata).filter((entry): entry is RepoMetadata => entry !== null);

  if (generatedAt.length === 0 || scanRoot.length === 0 || snapshotId.length === 0) {
    return null;
  }

  return {
    generatedAt,
    scanRoot,
    snapshotId,
    repos
  };
};

export const parsePackageSummary = (value: unknown): PackageSummary | null => {
  if (!isRecord(value)) {
    return null;
  }

  const name = asString(value.name);
  if (name.length === 0) {
    return null;
  }

  return {
    name,
    scripts: asStringMap(value.scripts),
    dependencies: asStringArray(value.dependencies),
    devDependencies: asStringArray(value.devDependencies),
    workspaces: asStringArray(value.workspaces)
  };
};

export const parseApiSurface = (value: unknown): ApiSurface | null => {
  if (!isRecord(value)) {
    return null;
  }

  const routesRaw = Array.isArray(value.routes) ? value.routes : [];
  const routes = routesRaw.map(toRouteDescriptor).filter((entry): entry is RouteDescriptor => entry !== null);
  const consumersRaw = Array.isArray(value.messageConsumers) ? value.messageConsumers : [];
  const messageConsumers = consumersRaw
    .map(toMessageConsumer)
    .filter((entry): entry is MessageConsumer => entry !== null);
  const cronRaw = Array.isArray(value.cronJobs) ? value.cronJobs : [];
  const cronJobs = cronRaw.map(toCronJob).filter((entry): entry is CronJobDescriptor => entry !== null);
  const cliRaw = Array.isArray(value.cliEntrypoints) ? value.cliEntrypoints : [];
  const cliEntrypoints = cliRaw.map(toCliEntrypoint).filter((entry): entry is CliEntrypoint => entry !== null);

  return {
    routes,
    messageConsumers,
    cronJobs,
    cliEntrypoints,
    frontendPages: asStringArray(value.frontendPages),
    apiClients: asStringArray(value.apiClients),
    authSignals: asStringArray(value.authSignals)
  };
};

export const parseDomainTerms = (value: unknown): DomainTerms | null => {
  if (!isRecord(value)) {
    return null;
  }

  const termsRaw = Array.isArray(value.topTerms) ? value.topTerms : [];
  const topTerms = termsRaw.map(toDomainTerm).filter((entry): entry is DomainTerm => entry !== null);
  return {
    topTerms
  };
};

export const parseDbModelSummary = (value: unknown): DbModelSummary | null => {
  if (!isRecord(value)) {
    return null;
  }

  const entitiesRaw = Array.isArray(value.entities) ? value.entities : [];
  const entities = entitiesRaw.map(toDataEntity).filter((entry): entry is DataEntity => entry !== null);
  const relationsRaw = Array.isArray(value.relationships) ? value.relationships : [];
  const relationships = relationsRaw
    .map(toDataRelationship)
    .filter((entry): entry is DataRelationship => entry !== null);

  return {
    entities,
    relationships
  };
};

export const parseDependenciesExternal = (value: unknown): DependenciesExternal | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    outboundHosts: asStringArray(value.outboundHosts),
    sdkUsages: asStringArray(value.sdkUsages),
    databases: asStringArray(value.databases),
    queues: asStringArray(value.queues),
    thirdParties: asStringArray(value.thirdParties)
  };
};

export const parseDependenciesInternal = (value: unknown): DependenciesInternal | null => {
  if (!isRecord(value)) {
    return null;
  }

  const interactionsRaw = Array.isArray(value.interactions) ? value.interactions : [];
  const interactions = interactionsRaw
    .map(toInternalDependency)
    .filter((entry): entry is InternalDependency => entry !== null);

  return {
    internalPackages: asStringArray(value.internalPackages),
    internalHostEnvVars: asStringArray(value.internalHostEnvVars),
    interactions
  };
};

export const parseEnvSummary = (value: unknown): EnvSummary | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    all: asStringArray(value.all),
    endpointLike: asStringArray(value.endpointLike)
  };
};

export const parseQualitySignals = (value: unknown): QualitySignals | null => {
  if (!isRecord(value)) {
    return null;
  }

  const largestFilesRaw = Array.isArray(value.largestFiles) ? value.largestFiles : [];
  const largestFiles = largestFilesRaw.map(toHotspotFile).filter((entry): entry is HotspotFile => entry !== null);

  return {
    testsPresent: value.testsPresent === true,
    testFileCount: typeof value.testFileCount === 'number' ? value.testFileCount : 0,
    ciConfigured: value.ciConfigured === true,
    lintConfigured: value.lintConfigured === true,
    formatConfigured: value.formatConfigured === true,
    typescriptStrict: value.typescriptStrict === true,
    largestFiles,
    deepestFolders: asStringArray(value.deepestFolders),
    cycles: asStringArray(value.cycles),
    loggingSignals: asStringArray(value.loggingSignals),
    metricsSignals: asStringArray(value.metricsSignals),
    tracingSignals: asStringArray(value.tracingSignals)
  };
};
