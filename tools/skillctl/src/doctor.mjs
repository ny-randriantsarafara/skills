import { spawnSync } from 'node:child_process';
import { loadAllSkills } from './load-skills.mjs';

const commandExists = (binary) => {
  const result = spawnSync('sh', ['-lc', `command -v ${binary}`], { stdio: 'ignore' });
  return result.status === 0;
};

export const runDoctor = async () => {
  const skills = await loadAllSkills();
  const binarySet = new Set();

  for (const skill of skills) {
    const required = skill.data.constraints.requiredBinaries ?? [];
    for (const binary of required) {
      binarySet.add(binary);
    }
  }

  const checks = Array.from(binarySet)
    .sort((left, right) => left.localeCompare(right))
    .map((binary) => {
      return {
        binary,
        available: commandExists(binary)
      };
    });

  return {
    checks,
    healthy: checks.every((item) => item.available)
  };
};
