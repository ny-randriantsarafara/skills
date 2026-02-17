import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { CORE_SCHEMA_DIR, ADAPTERS_DIR, SUPPORTED_TOOLS } from './constants.mjs';
import { exists, readText } from './fs-utils.mjs';
import { loadAllSkills, readJson } from './load-skills.mjs';

const createAjv = () => {
  return new Ajv2020({ allErrors: true, strict: false });
};

const formatErrors = (ajvErrors) => {
  if (!ajvErrors || ajvErrors.length === 0) {
    return 'Unknown schema validation error';
  }

  return ajvErrors
    .map((item) => {
      const at = item.instancePath && item.instancePath.length > 0 ? item.instancePath : '/';
      return `${at}: ${item.message}`;
    })
    .join('; ');
};

const assertPath = async (skillRoot, relativePath, issues, label) => {
  if (relativePath.length === 0) {
    issues.push(`${label} is empty`);
    return;
  }

  const absolutePath = path.resolve(skillRoot, relativePath);
  if (!(await exists(absolutePath))) {
    issues.push(`${label} missing: ${relativePath}`);
  }
};

const validateSkillResources = async (skill, issues) => {
  const data = skill.data;
  await assertPath(skill.skillRoot, data.instructions.file, issues, `${skill.skillId} instructions.file`);

  for (const relativePath of data.resources.scripts) {
    await assertPath(skill.skillRoot, relativePath, issues, `${skill.skillId} script resource`);
  }

  for (const relativePath of data.resources.references) {
    await assertPath(skill.skillRoot, relativePath, issues, `${skill.skillId} reference resource`);
  }

  for (const relativePath of data.resources.assets) {
    await assertPath(skill.skillRoot, relativePath, issues, `${skill.skillId} asset resource`);
  }
};

const validateCommands = (skill, issues) => {
  const names = new Set();
  for (const command of skill.data.commands) {
    if (names.has(command.name)) {
      issues.push(`${skill.skillId} has duplicate command: ${command.name}`);
      continue;
    }
    names.add(command.name);
  }
};

export const validateCanonicalSkillsFromLoaded = async (skills) => {
  const skillSchema = await readJson(path.join(CORE_SCHEMA_DIR, 'skill.schema.json'));
  const ajv = createAjv();
  const validateSkill = ajv.compile(skillSchema);

  const issues = [];

  for (const skill of skills) {
    const ok = validateSkill(skill.data);
    if (!ok) {
      issues.push(`${skill.skillId} schema invalid: ${formatErrors(validateSkill.errors)}`);
      continue;
    }

    await validateSkillResources(skill, issues);
    validateCommands(skill, issues);
  }

  return { skills, issues };
};

const validateCanonicalSkills = async () => {
  const skills = await loadAllSkills();
  return validateCanonicalSkillsFromLoaded(skills);
};

const validateAdapterManifests = async () => {
  const adapterSchema = await readJson(path.join(CORE_SCHEMA_DIR, 'adapter-manifest.schema.json'));
  const ajv = createAjv();
  const validateManifest = ajv.compile(adapterSchema);
  const issues = [];

  for (const tool of SUPPORTED_TOOLS) {
    const toolDir = path.join(ADAPTERS_DIR, tool);
    if (!(await exists(toolDir))) {
      continue;
    }

    const skillIds = await (async () => {
      const { readdir } = await import('node:fs/promises');
      const entries = await readdir(toolDir, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    })();

    for (const skillId of skillIds) {
      const manifestPath = path.join(toolDir, skillId, 'adapter-manifest.json');
      if (!(await exists(manifestPath))) {
        issues.push(`${tool}/${skillId} missing adapter-manifest.json`);
        continue;
      }

      const manifest = await readJson(manifestPath);
      const ok = validateManifest(manifest);
      if (!ok) {
        issues.push(`${tool}/${skillId} adapter-manifest invalid: ${formatErrors(validateManifest.errors)}`);
      }
    }
  }

  return issues;
};

export const validateAll = async () => {
  const canonical = await validateCanonicalSkills();
  const adapterIssues = await validateAdapterManifests();
  const issues = [...canonical.issues, ...adapterIssues];

  return {
    skills: canonical.skills,
    issues
  };
};
