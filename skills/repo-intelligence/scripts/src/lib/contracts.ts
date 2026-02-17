export type RepoType =
  | 'service'
  | 'library'
  | 'infra'
  | 'frontend'
  | 'worker'
  | 'data'
  | 'mono-repo'
  | 'unknown';

export type InteractionKind = 'http' | 'queue' | 'pkg' | 'db' | 'sdk';

export interface RepoMetadata {
  readonly name: string;
  readonly rootPath: string;
  readonly relativePath: string;
  readonly languages: readonly string[];
  readonly frameworks: readonly string[];
  readonly packageManager: string;
  readonly repoType: RepoType;
  readonly ownerTeam: readonly string[];
}

export interface Inventory {
  readonly generatedAt: string;
  readonly scanRoot: string;
  readonly snapshotId: string;
  readonly repos: readonly RepoMetadata[];
}

export interface RouteDescriptor {
  readonly method: string;
  readonly path: string;
  readonly file: string;
  readonly style: 'express-like' | 'nestjs' | 'next' | 'unknown';
}

export interface MessageConsumer {
  readonly transport: string;
  readonly topicOrQueue: string;
  readonly file: string;
}

export interface CronJobDescriptor {
  readonly schedule: string;
  readonly file: string;
}

export interface CliEntrypoint {
  readonly name: string;
  readonly command: string;
}

export interface ApiSurface {
  readonly routes: readonly RouteDescriptor[];
  readonly messageConsumers: readonly MessageConsumer[];
  readonly cronJobs: readonly CronJobDescriptor[];
  readonly cliEntrypoints: readonly CliEntrypoint[];
  readonly frontendPages: readonly string[];
  readonly apiClients: readonly string[];
  readonly authSignals: readonly string[];
}

export interface DomainTerm {
  readonly term: string;
  readonly score: number;
  readonly sources: readonly string[];
}

export interface DomainTerms {
  readonly topTerms: readonly DomainTerm[];
}

export interface DataEntity {
  readonly name: string;
  readonly source: string;
}

export interface DataRelationship {
  readonly from: string;
  readonly to: string;
  readonly relation: string;
  readonly source: string;
}

export interface DbModelSummary {
  readonly entities: readonly DataEntity[];
  readonly relationships: readonly DataRelationship[];
}

export interface OutboundCall {
  readonly host: string;
  readonly protocol: string;
  readonly file: string;
}

export interface DependenciesExternal {
  readonly outboundHosts: readonly string[];
  readonly sdkUsages: readonly string[];
  readonly databases: readonly string[];
  readonly queues: readonly string[];
  readonly thirdParties: readonly string[];
}

export interface InternalDependency {
  readonly target: string;
  readonly kind: InteractionKind;
  readonly evidence: string;
}

export interface DependenciesInternal {
  readonly internalPackages: readonly string[];
  readonly internalHostEnvVars: readonly string[];
  readonly interactions: readonly InternalDependency[];
}

export interface EnvSummary {
  readonly all: readonly string[];
  readonly endpointLike: readonly string[];
}

export interface HotspotFile {
  readonly file: string;
  readonly lines: number;
}

export interface QualitySignals {
  readonly testsPresent: boolean;
  readonly testFileCount: number;
  readonly ciConfigured: boolean;
  readonly lintConfigured: boolean;
  readonly formatConfigured: boolean;
  readonly typescriptStrict: boolean;
  readonly largestFiles: readonly HotspotFile[];
  readonly deepestFolders: readonly string[];
  readonly cycles: readonly string[];
  readonly loggingSignals: readonly string[];
  readonly metricsSignals: readonly string[];
  readonly tracingSignals: readonly string[];
}

export interface PackageSummary {
  readonly name: string;
  readonly scripts: Record<string, string>;
  readonly dependencies: readonly string[];
  readonly devDependencies: readonly string[];
  readonly workspaces: readonly string[];
}

export interface RepoRawData {
  readonly metadata: RepoMetadata;
  readonly packageSummary: PackageSummary;
  readonly routes: readonly RouteDescriptor[];
  readonly apiSurface: ApiSurface;
  readonly domainTerms: DomainTerms;
  readonly dbModels: DbModelSummary;
  readonly outboundCalls: readonly OutboundCall[];
  readonly dependenciesExternal: DependenciesExternal;
  readonly dependenciesInternal: DependenciesInternal;
  readonly envVars: EnvSummary;
  readonly qualitySignals: QualitySignals;
}

export interface ScanResult {
  readonly inventory: Inventory;
  readonly repos: readonly RepoRawData[];
}

export interface DiffSection {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly changed: readonly string[];
}

export interface DiffReport {
  readonly generatedAt: string;
  readonly baseSnapshot: string;
  readonly headSnapshot: string;
  readonly apiSurface: DiffSection;
  readonly dependencies: DiffSection;
  readonly domainTerms: DiffSection;
  readonly qualitySignals: DiffSection;
}
