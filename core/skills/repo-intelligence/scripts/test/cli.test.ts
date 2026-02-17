import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runScanCommand } from '../src/commands/scan.js';
import { runSummarizeCommand } from '../src/commands/summarize.js';
import { runGraphCommand } from '../src/commands/graph.js';
import { runDiffCommand } from '../src/commands/diff.js';

const execFileAsync = promisify(execFile);

const createGitRepo = async (root: string): Promise<void> => {
  await execFileAsync('git', ['init'], { cwd: root });
};

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const createServiceRepo = async (scanRoot: string, name: string): Promise<string> => {
  const repoRoot = path.join(scanRoot, name);
  await mkdir(path.join(repoRoot, 'src'), { recursive: true });
  await mkdir(path.join(repoRoot, 'prisma'), { recursive: true });

  await writeJson(path.join(repoRoot, 'package.json'), {
    name,
    scripts: {
      dev: 'node src/server.ts',
      test: 'node --test',
      lint: 'eslint .'
    },
    dependencies: {
      express: '^4.0.0',
      prisma: '^5.0.0'
    }
  });

  await writeFile(
    path.join(repoRoot, 'src', 'server.ts'),
    "import express from 'express';\nconst app = express();\napp.get('/orders', () => {});\n",
    'utf8'
  );

  await writeFile(
    path.join(repoRoot, 'prisma', 'schema.prisma'),
    'model Order {\n  id String @id\n}\n',
    'utf8'
  );

  await writeFile(path.join(repoRoot, 'README.md'), `# ${name}\n`, 'utf8');
  await createGitRepo(repoRoot);
  return repoRoot;
};

test('scan and summarize produce required artifacts', async () => {
  const scanRoot = await mkdtemp(path.join(tmpdir(), 'repo-intel-test-'));
  await createServiceRepo(scanRoot, 'orders-service');

  const scanResult = await runScanCommand({
    root: scanRoot,
    snapshotId: 'snapshot-a'
  });

  assert.equal(scanResult.inventory.repos.length, 1);
  assert.equal(scanResult.inventory.repos[0]?.name, 'orders-service');

  const outputs = await runSummarizeCommand({ root: scanRoot });
  assert.equal(outputs.length, 1);

  const handoverPath = path.join(scanRoot, '.repo-intel', 'repos', 'orders-service', 'docs', 'HANDOVER.md');
  const handover = await readFile(handoverPath, 'utf8');

  assert.match(handover, /## 1\. What it is/);
  assert.match(handover, /## 11\. Onboarding checklist/);
});

test('graph generates mermaid service map', async () => {
  const scanRoot = await mkdtemp(path.join(tmpdir(), 'repo-intel-graph-'));
  await createServiceRepo(scanRoot, 'catalog-service');
  const repoB = await createServiceRepo(scanRoot, 'checkout-service');

  await writeJson(path.join(repoB, 'package.json'), {
    name: 'checkout-service',
    scripts: {
      dev: 'node src/server.ts'
    },
    dependencies: {
      express: '^4.0.0',
      '@catalog-service/client': '^1.0.0'
    }
  });

  await runScanCommand({ root: scanRoot, snapshotId: 'snapshot-graph' });
  const graphPath = await runGraphCommand({ root: scanRoot });
  const graph = await readFile(graphPath, 'utf8');

  assert.match(graph, /graph LR/);
  assert.match(graph, /checkout-service/);
  assert.match(graph, /catalog-service/);

});

test('diff compares snapshots', async () => {
  const scanRoot = await mkdtemp(path.join(tmpdir(), 'repo-intel-diff-'));
  const repoRoot = await createServiceRepo(scanRoot, 'billing-service');

  await runScanCommand({ root: scanRoot, snapshotId: 'base-snapshot' });

  await writeFile(
    path.join(repoRoot, 'src', 'server.ts'),
    "import express from 'express';\nconst app = express();\napp.get('/orders', () => {});\napp.post('/orders', () => {});\n",
    'utf8'
  );

  await runScanCommand({ root: scanRoot, snapshotId: 'head-snapshot' });
  const diff = await runDiffCommand({
    root: scanRoot,
    base: 'base-snapshot',
    head: 'head-snapshot'
  });

  assert.equal(diff.baseSnapshot, 'base-snapshot');
  assert.equal(diff.headSnapshot, 'head-snapshot');
  assert.ok(diff.apiSurface.changed.includes('billing-service'));
});
