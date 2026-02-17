import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { validateAll } from '../src/validate.mjs';
import { validateCanonicalSkillsFromLoaded } from '../src/validate.mjs';
import { buildAdapters } from '../src/build.mjs';
import { generateMatrix } from '../src/matrix.mjs';
import { installAdapters } from '../src/install.mjs';
import { ADAPTERS_DIR, DOCS_DIR } from '../src/constants.mjs';
import { loadAllSkills } from '../src/load-skills.mjs';

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

test('validate canonical skills and schemas', async () => {
  const result = await validateAll();
  assert.equal(result.issues.length, 0);
  assert.equal(result.skills.length, 4);
});

test('invalid canonical skill fails schema validation', async () => {
  const loadedSkills = await loadAllSkills();
  const base = loadedSkills[0];
  assert.ok(base !== undefined);

  const broken = {
    ...base,
    data: { ...base.data }
  };
  delete broken.data.displayName;

  const result = await validateCanonicalSkillsFromLoaded([broken]);
  assert.ok(result.issues.some((issue) => issue.includes('schema invalid')));
});

test('missing referenced resource fails validation', async () => {
  const loadedSkills = await loadAllSkills();
  const base = loadedSkills[0];
  assert.ok(base !== undefined);

  const broken = {
    ...base,
    data: {
      ...base.data,
      resources: {
        ...base.data.resources,
        scripts: ['scripts/does-not-exist.sh']
      }
    }
  };

  const result = await validateCanonicalSkillsFromLoaded([broken]);
  assert.ok(result.issues.some((issue) => issue.includes('missing')));
});

test('build adapters for all tools', async () => {
  const result = await buildAdapters({ tool: 'all' });
  assert.equal(result.tools.length, 4);
  assert.equal(result.skills.length, 4);

  const expected = path.join(ADAPTERS_DIR, 'claude', 'repo-intelligence', 'adapter-manifest.json');
  assert.equal(await fileExists(expected), true);

  const copilotEntry = path.join(ADAPTERS_DIR, 'copilot', 'review-code', 'COPILOT_INSTRUCTIONS.md');
  assert.equal(await fileExists(copilotEntry), true);
});

test('generate compatibility matrix from manifests', async () => {
  await buildAdapters({ tool: 'all' });
  const matrix = await generateMatrix();
  assert.ok(matrix.skillCount >= 4);

  const content = await fs.readFile(path.join(DOCS_DIR, 'compatibility-matrix.md'), 'utf8');
  assert.match(content, /\| Skill \| Codex \| Claude \| Cursor \| Copilot \|/);
  assert.match(content, /repo-intelligence/);
});

test('install adapters is idempotent for one tool', async () => {
  await buildAdapters({ tool: 'claude' });

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skillctl-install-'));
  const destination = path.join(tempRoot, 'claude-skills');

  const first = await installAdapters({ tool: 'claude', dest: destination });
  const second = await installAdapters({ tool: 'claude', dest: destination });

  assert.equal(first.installed[0].skills.length, 4);
  assert.equal(second.installed[0].skills.length, 4);

  const entry = path.join(destination, 'get-jira-ticket', 'SKILL.md');
  assert.equal(await fileExists(entry), true);
});
