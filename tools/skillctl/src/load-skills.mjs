import path from 'node:path';
import fs from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { CORE_SKILLS_DIR } from './constants.mjs';
import { listDirs, readText } from './fs-utils.mjs';

const toAbsolute = (skillRoot, relativePath) => {
  return path.resolve(skillRoot, relativePath);
};

export const loadSkill = async (skillId) => {
  const skillRoot = path.join(CORE_SKILLS_DIR, skillId);
  const skillYamlPath = path.join(skillRoot, 'skill.yaml');
  const rawYaml = await readText(skillYamlPath);
  const data = parseYaml(rawYaml);

  const instructionFile = data?.instructions?.file ?? '';
  const instructionPath = toAbsolute(skillRoot, instructionFile);
  const instructions = await readText(instructionPath);

  return {
    skillId,
    skillRoot,
    skillYamlPath,
    data,
    instructions
  };
};

export const loadAllSkills = async () => {
  const skillIds = await listDirs(CORE_SKILLS_DIR);
  const loaded = [];
  for (const skillId of skillIds) {
    const skill = await loadSkill(skillId);
    loaded.push(skill);
  }
  return loaded;
};

export const readJson = async (filePath) => {
  const content = await readText(filePath);
  return JSON.parse(content);
};

export const statSafe = async (targetPath) => {
  try {
    return await fs.stat(targetPath);
  } catch {
    return null;
  }
};
