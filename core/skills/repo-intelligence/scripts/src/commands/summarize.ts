import * as path from 'node:path';
import { readJsonIfExists, writeText } from '../lib/fs-utils.js';
import { listSection, section } from '../lib/markdown.js';
import { toMarkdownList } from '../lib/text-utils.js';
import {
  parseApiSurface,
  parseDbModelSummary,
  parseDependenciesExternal,
  parseDependenciesInternal,
  parseDomainTerms,
  parseEnvSummary,
  parseInventory,
  parsePackageSummary,
  parseQualitySignals
} from '../lib/parsers.js';
import type {
  ApiSurface,
  DbModelSummary,
  DependenciesExternal,
  DependenciesInternal,
  DomainTerms,
  EnvSummary,
  Inventory,
  PackageSummary,
  QualitySignals,
  RepoMetadata
} from '../lib/contracts.js';

interface SummarizeOptions {
  readonly root: string;
  readonly repo?: string;
}

interface RepoDocumentInputs {
  readonly metadata: RepoMetadata;
  readonly packageSummary: PackageSummary;
  readonly apiSurface: ApiSurface;
  readonly domainTerms: DomainTerms;
  readonly dbModels: DbModelSummary;
  readonly dependenciesExternal: DependenciesExternal;
  readonly dependenciesInternal: DependenciesInternal;
  readonly envVars: EnvSummary;
  readonly qualitySignals: QualitySignals;
}

const loadRequiredJson = async <T>(
  filePath: string,
  errorLabel: string,
  parser: (value: unknown) => T | null
): Promise<T> => {
  const value = await readJsonIfExists(filePath);
  const parsed = parser(value);
  if (parsed === null) {
    throw new Error(`Missing ${errorLabel}: ${filePath}`);
  }

  return parsed;
};

const buildWhatItIsParagraph = (metadata: RepoMetadata, apiSurface: ApiSurface): string => {
  const languageLead = metadata.languages[0] ?? 'unknown stack';
  const routeCount = apiSurface.routes.length;
  const consumerCount = apiSurface.messageConsumers.length;

  return `${metadata.name} is a ${metadata.repoType} repository built primarily with ${languageLead}. It exposes ${routeCount} detected HTTP route(s) and ${consumerCount} message consumer(s), and it acts as an owned unit inside ${metadata.relativePath}.`;
};

const buildBusinessCapability = (metadata: RepoMetadata, domainTerms: DomainTerms): string => {
  const topTerms = domainTerms.topTerms.slice(0, 6).map((term) => term.term);
  const termsText = topTerms.length > 0 ? topTerms.join(', ') : 'no strong domain terms detected yet';

  return `${metadata.name} owns business logic around ${termsText}. The boundary is inferred from local APIs/entities and internal dependencies; cross-repo integrations are treated as consumed capabilities.`;
};

const buildKeyFlows = (
  apiSurface: ApiSurface,
  dbModels: DbModelSummary,
  dependenciesExternal: DependenciesExternal
): readonly string[] => {
  const routeFlows = apiSurface.routes.slice(0, 3).map((route) => {
    const dbHint = dbModels.entities[0]?.name ?? 'data model';
    return `${route.method} ${route.path} -> application service -> ${dbHint} persistence -> response`;
  });

  const messageFlows = apiSurface.messageConsumers.slice(0, 2).map((consumer) => {
    const outboundHint = dependenciesExternal.outboundHosts[0] ?? 'downstream side effects';
    return `Consume ${consumer.transport}:${consumer.topicOrQueue} -> domain handler -> ${outboundHint}`;
  });

  const combined = [...routeFlows, ...messageFlows];
  if (combined.length > 0) {
    return combined.slice(0, 5);
  }

  return ['Startup task -> core logic execution -> internal package interactions'];
};

const buildCoreDataModel = (dbModels: DbModelSummary): string => {
  const entities = dbModels.entities.map((entity) => entity.name);
  const relationships = dbModels.relationships.map((relation) => {
    return `${relation.from} -> ${relation.to} (${relation.relation})`;
  });

  const entityText = entities.length > 0 ? toMarkdownList(entities) : '- No entities detected';
  const relationText = relationships.length > 0 ? toMarkdownList(relationships) : '- No explicit relationships detected';

  return `### Entities\n${entityText}\n\n### Relationships\n${relationText}`;
};

const buildRunCommands = (packageSummary: PackageSummary): readonly string[] => {
  const candidates: readonly string[] = ['dev', 'start', 'build', 'test', 'lint'];
  const commands = candidates
    .filter((name) => packageSummary.scripts[name] !== undefined)
    .map((name) => `${name}: ${packageSummary.scripts[name]}`);

  if (commands.length > 0) {
    return commands;
  }

  return ['No standard scripts detected in package.json'];
};

const buildDeployNotes = (metadata: RepoMetadata, qualitySignals: QualitySignals): readonly string[] => {
  const notes: string[] = [];

  if (metadata.frameworks.includes('docker')) {
    notes.push('Dockerfile detected (containerized deployment likely).');
  }

  if (qualitySignals.ciConfigured) {
    notes.push('CI configuration detected (.github/workflows or gitlab-ci).');
  }

  if (notes.length > 0) {
    return notes;
  }

  return ['No explicit deployment pipeline detected from scanned files.'];
};

const buildOperationalNotes = (qualitySignals: QualitySignals): readonly string[] => {
  const output: string[] = [];

  if (qualitySignals.loggingSignals.length > 0) {
    output.push(`Logging signals: ${qualitySignals.loggingSignals.length}`);
  }

  if (qualitySignals.metricsSignals.length > 0) {
    output.push(`Metrics signals: ${qualitySignals.metricsSignals.length}`);
  }

  if (qualitySignals.tracingSignals.length > 0) {
    output.push(`Tracing signals: ${qualitySignals.tracingSignals.length}`);
  }

  if (output.length > 0) {
    return output;
  }

  return ['No explicit logging/metrics/tracing signals were detected.'];
};

const buildRiskNotes = (qualitySignals: QualitySignals): readonly string[] => {
  const risks: string[] = [];

  if (!qualitySignals.testsPresent) {
    risks.push('Tests are missing; regression risk is high.');
  }

  if (!qualitySignals.typescriptStrict) {
    risks.push('TypeScript strict mode is not enabled.');
  }

  if (!qualitySignals.ciConfigured) {
    risks.push('CI configuration not detected.');
  }

  if (qualitySignals.cycles.length > 0) {
    risks.push(`Import cycles detected: ${qualitySignals.cycles.length}.`);
  }

  if (risks.length > 0) {
    return risks;
  }

  return ['No critical quality red flags detected from static signals.'];
};

const buildOnboardingChecklist = (metadata: RepoMetadata, packageSummary: PackageSummary): readonly string[] => {
  const scripts = Object.keys(packageSummary.scripts);

  return [
    `Read README.md and docs/ first in ${metadata.name}.`,
    'Inspect HANDOVER.md and ARCHITECTURE.md generated in this repo intel pack.',
    `Run one entry command (${scripts[0] ?? 'dev/start'}) and one verification command (test/lint).`,
    'Walk through three key flows in HANDOVER.md before touching business rules.',
    'Review dependencies_internal.json to understand upstream/downstream service links.'
  ];
};

const buildHandover = (inputs: RepoDocumentInputs): string => {
  const keyFlows = buildKeyFlows(inputs.apiSurface, inputs.dbModels, inputs.dependenciesExternal);

  const sections = [
    section('1. What it is', buildWhatItIsParagraph(inputs.metadata, inputs.apiSurface)),
    section('2. What business capability it owns', buildBusinessCapability(inputs.metadata, inputs.domainTerms)),
    listSection('3. Key flows', keyFlows),
    section('4. Core data model', buildCoreDataModel(inputs.dbModels)),
    listSection(
      '5. External interactions',
      [
        ...inputs.dependenciesExternal.outboundHosts.map((host) => `HTTP host: ${host}`),
        ...inputs.dependenciesExternal.databases.map((db) => `Database: ${db}`),
        ...inputs.dependenciesExternal.queues.map((queue) => `Queue/Event: ${queue}`),
        ...inputs.dependenciesExternal.sdkUsages.map((sdk) => `SDK: ${sdk}`)
      ]
    ),
    listSection(
      '6. Internal interactions',
      inputs.dependenciesInternal.interactions.map((interaction) => {
        return `${interaction.kind} -> ${interaction.target} (${interaction.evidence})`;
      })
    ),
    listSection(
      '7. How to run locally',
      [...buildRunCommands(inputs.packageSummary), ...inputs.envVars.all.map((envVar) => `ENV: ${envVar}=<value>`)]
    ),
    listSection('8. How it deploys', buildDeployNotes(inputs.metadata, inputs.qualitySignals)),
    listSection('9. Operational view', buildOperationalNotes(inputs.qualitySignals)),
    listSection('10. Risk notes', buildRiskNotes(inputs.qualitySignals)),
    listSection('11. Onboarding checklist', buildOnboardingChecklist(inputs.metadata, inputs.packageSummary))
  ];

  return `# ${inputs.metadata.name} Handover\n\n${sections.join('\n')}`;
};

const buildArchitectureDoc = (inputs: RepoDocumentInputs): string => {
  const summary = `${inputs.metadata.name} owns ${inputs.metadata.repoType} responsibilities around ${inputs.domainTerms.topTerms
    .slice(0, 5)
    .map((entry) => entry.term)
    .join(', ') || 'detected domains'}. It exposes ${inputs.apiSurface.routes.length} route(s), consumes ${inputs.apiSurface.messageConsumers.length} message stream(s), and maintains ${inputs.dbModels.entities.length} detected data entity(ies).`;

  const primaryFlows = buildKeyFlows(inputs.apiSurface, inputs.dbModels, inputs.dependenciesExternal);

  return [
    `# ${inputs.metadata.name} Architecture`,
    '',
    '## Responsibility',
    '',
    summary,
    '',
    '## Primary Flows',
    '',
    toMarkdownList(primaryFlows),
    '',
    '## Data Ownership',
    '',
    buildCoreDataModel(inputs.dbModels),
    '',
    '## External Integrations',
    '',
    toMarkdownList(inputs.dependenciesExternal.outboundHosts),
    '',
    '## Internal Integrations',
    '',
    toMarkdownList(inputs.dependenciesInternal.interactions.map((item) => `${item.kind} -> ${item.target}`))
  ].join('\n');
};

const buildRunbookDoc = (inputs: RepoDocumentInputs): string => {
  const dependencyList = [
    `Package manager: ${inputs.metadata.packageManager}`,
    ...inputs.metadata.frameworks.map((framework) => `Framework: ${framework}`)
  ];

  return [
    `# ${inputs.metadata.name} Runbook`,
    '',
    '## Local Setup',
    '',
    toMarkdownList(dependencyList),
    '',
    '## Commands',
    '',
    toMarkdownList(buildRunCommands(inputs.packageSummary)),
    '',
    '## Environment Variables',
    '',
    toMarkdownList(inputs.envVars.all.map((envVar) => `${envVar}=<safe-placeholder>`)),
    '',
    '## Common Failure Patterns',
    '',
    toMarkdownList(buildRiskNotes(inputs.qualitySignals))
  ].join('\n');
};

const buildNewDevDoc = (inputs: RepoDocumentInputs): string => {
  const keyFlows = buildKeyFlows(inputs.apiSurface, inputs.dbModels, inputs.dependenciesExternal).slice(0, 3);

  return [
    `# ${inputs.metadata.name} New Dev Guide`,
    '',
    '## Read This First',
    '',
    toMarkdownList([
      'README.md',
      'docs/',
      'HANDOVER.md',
      'ARCHITECTURE.md',
      'api_surface.md',
      'domain_glossary.md'
    ]),
    '',
    '## Three Key Flows',
    '',
    toMarkdownList(keyFlows),
    '',
    '## Where Business Rules Live',
    '',
    toMarkdownList(inputs.apiSurface.routes.map((route) => `${route.method} ${route.path} (${route.file})`).slice(0, 8)),
    '',
    '## Do Not Touch Before Understanding',
    '',
    toMarkdownList([
      'Data model migrations and schema files',
      'Message consumer handlers',
      'Cross-service endpoint wiring'
    ])
  ].join('\n');
};

const buildHealthDoc = (inputs: RepoDocumentInputs): string => {
  const scoreLines = [
    `Tests present: ${inputs.qualitySignals.testsPresent}`,
    `CI configured: ${inputs.qualitySignals.ciConfigured}`,
    `Lint configured: ${inputs.qualitySignals.lintConfigured}`,
    `Format configured: ${inputs.qualitySignals.formatConfigured}`,
    `TypeScript strict: ${inputs.qualitySignals.typescriptStrict}`,
    `Import cycles: ${inputs.qualitySignals.cycles.length}`
  ];

  return [
    `# ${inputs.metadata.name} Health`,
    '',
    '## Scorecard',
    '',
    toMarkdownList(scoreLines),
    '',
    '## Complexity Hotspots',
    '',
    toMarkdownList(inputs.qualitySignals.largestFiles.map((item) => `${item.file} (${item.lines} lines)`)),
    '',
    '## Deepest Folders',
    '',
    toMarkdownList(inputs.qualitySignals.deepestFolders),
    '',
    '## Cycles',
    '',
    toMarkdownList(inputs.qualitySignals.cycles)
  ].join('\n');
};

const buildApiSurfaceDoc = (apiSurface: ApiSurface): string => {
  const routes = apiSurface.routes.map((route) => `${route.method} ${route.path} (${route.file})`);
  const consumers = apiSurface.messageConsumers.map((consumer) => {
    return `${consumer.transport}: ${consumer.topicOrQueue} (${consumer.file})`;
  });
  const cron = apiSurface.cronJobs.map((job) => `${job.schedule} (${job.file})`);

  return [
    '# API Surface',
    '',
    '## Routes',
    '',
    toMarkdownList(routes),
    '',
    '## Message Consumers',
    '',
    toMarkdownList(consumers),
    '',
    '## Cron Jobs',
    '',
    toMarkdownList(cron),
    '',
    '## CLI Entrypoints',
    '',
    toMarkdownList(apiSurface.cliEntrypoints.map((item) => `${item.name}: ${item.command}`)),
    '',
    '## Frontend Pages',
    '',
    toMarkdownList(apiSurface.frontendPages),
    '',
    '## Auth Signals',
    '',
    toMarkdownList(apiSurface.authSignals)
  ].join('\n');
};

const buildDomainGlossaryDoc = (domainTerms: DomainTerms): string => {
  return [
    '# Domain Glossary',
    '',
    ...domainTerms.topTerms.map((term) => {
      return `- ${term.term} (score: ${term.score}; sources: ${term.sources.join(', ')})`;
    })
  ].join('\n');
};

const loadRepoInputs = async (intelRoot: string, metadata: RepoMetadata): Promise<RepoDocumentInputs> => {
  const rawRoot = path.join(intelRoot, 'repos', metadata.name, 'raw');

  return {
    metadata,
    packageSummary: await loadRequiredJson(
      path.join(rawRoot, 'package.summary.json'),
      'package.summary.json',
      parsePackageSummary
    ),
    apiSurface: await loadRequiredJson(path.join(rawRoot, 'api_surface.json'), 'api_surface.json', parseApiSurface),
    domainTerms: await loadRequiredJson(path.join(rawRoot, 'domain_terms.json'), 'domain_terms.json', parseDomainTerms),
    dbModels: await loadRequiredJson(path.join(rawRoot, 'db_models.json'), 'db_models.json', parseDbModelSummary),
    dependenciesExternal: await loadRequiredJson(
      path.join(rawRoot, 'dependencies_external.json'),
      'dependencies_external.json',
      parseDependenciesExternal
    ),
    dependenciesInternal: await loadRequiredJson(
      path.join(rawRoot, 'dependencies_internal.json'),
      'dependencies_internal.json',
      parseDependenciesInternal
    ),
    envVars: await loadRequiredJson(path.join(rawRoot, 'envvars.json'), 'envvars.json', parseEnvSummary),
    qualitySignals: await loadRequiredJson(
      path.join(rawRoot, 'quality_signals.json'),
      'quality_signals.json',
      parseQualitySignals
    )
  };
};

const summarizeRepo = async (intelRoot: string, inputs: RepoDocumentInputs): Promise<void> => {
  const docsRoot = path.join(intelRoot, 'repos', inputs.metadata.name, 'docs');

  await writeText(path.join(docsRoot, 'HANDOVER.md'), buildHandover(inputs));
  await writeText(path.join(docsRoot, 'ARCHITECTURE.md'), buildArchitectureDoc(inputs));
  await writeText(path.join(docsRoot, 'RUNBOOK.md'), buildRunbookDoc(inputs));
  await writeText(path.join(docsRoot, 'NEW_DEV.md'), buildNewDevDoc(inputs));
  await writeText(path.join(docsRoot, 'HEALTH.md'), buildHealthDoc(inputs));
  await writeText(path.join(docsRoot, 'api_surface.md'), buildApiSurfaceDoc(inputs.apiSurface));
  await writeText(path.join(docsRoot, 'domain_glossary.md'), buildDomainGlossaryDoc(inputs.domainTerms));
};

export const runSummarizeCommand = async (options: SummarizeOptions): Promise<readonly string[]> => {
  const scanRoot = path.resolve(options.root);
  const intelRoot = path.join(scanRoot, '.repo-intel');

  const inventoryRaw = await readJsonIfExists(path.join(intelRoot, 'inventory.json'));
  const inventory = parseInventory(inventoryRaw);
  if (inventory === null) {
    throw new Error('Missing .repo-intel/inventory.json. Run scan first.');
  }

  const selectedRepos = inventory.repos.filter((repo) => {
    if (options.repo === undefined || options.repo.length === 0) {
      return true;
    }

    return repo.name === options.repo;
  });

  if (selectedRepos.length === 0) {
    throw new Error(`No repo matched --repo=${options.repo}`);
  }

  const outputPaths = await Promise.all(
    selectedRepos.map(async (metadata) => {
      const inputs = await loadRepoInputs(intelRoot, metadata);
      await summarizeRepo(intelRoot, inputs);
      return path.join(intelRoot, 'repos', metadata.name, 'docs', 'HANDOVER.md');
    })
  );

  return outputPaths;
};
