import path from 'node:path';
import { ADAPTERS_DIR, SUPPORTED_TOOLS, TIER_BY_TOOL } from './constants.mjs';
import { ensureDir, copyRecursive, removeDirContents, writeJson, writeText, listFilesRecursive } from './fs-utils.mjs';
import { loadAllSkills } from './load-skills.mjs';

const toolsFromOption = (toolOption) => {
  if (toolOption === 'all' || toolOption === undefined) {
    return [...SUPPORTED_TOOLS];
  }

  if (!SUPPORTED_TOOLS.includes(toolOption)) {
    throw new Error(`Unsupported tool: ${toolOption}`);
  }

  return [toolOption];
};

const commandsMarkdown = (commands) => {
  if (commands.length === 0) {
    return '- No bundled commands';
  }

  return commands.map((command) => `- \`${command.name}\`: ${command.description}\n  - \`${command.run}\``).join('\n');
};

const toolTitle = (tool) => {
  if (tool === 'codex') {
    return 'Codex';
  }
  if (tool === 'claude') {
    return 'Claude Code';
  }
  if (tool === 'cursor') {
    return 'Cursor';
  }
  if (tool === 'copilot') {
    return 'GitHub Copilot';
  }
  return tool;
};

const triggerSentence = (triggers) => {
  if (triggers.length === 0) {
    return 'Use based on explicit user request.';
  }

  return `Use when requests match intents like: ${triggers.join(', ')}.`;
};

const renderSkillMarkdown = (tool, skill, instructions) => {
  const preface = [
    `# ${skill.displayName} (${toolTitle(tool)})`,
    '',
    triggerSentence(skill.triggers),
    '',
    '## Key Commands',
    '',
    commandsMarkdown(skill.commands),
    '',
    '---',
    ''
  ].join('\n');

  if (tool === 'claude' || tool === 'codex') {
    return [
      '---',
      `name: ${skill.id}`,
      `description: ${skill.description}`,
      '---',
      '',
      preface,
      instructions.trim(),
      ''
    ].join('\n');
  }

  if (tool === 'cursor') {
    return [
      '<!-- cursor-skill -->',
      `<!-- id: ${skill.id} -->`,
      `<!-- description: ${skill.description} -->`,
      '',
      preface,
      instructions.trim(),
      ''
    ].join('\n');
  }

  return [
    `# ${skill.displayName} (Copilot Adapter)`,
    '',
    skill.description,
    '',
    '## Trigger Intents',
    '',
    skill.triggers.map((trigger) => `- ${trigger}`).join('\n') || '- None',
    '',
    '## Operational Commands',
    '',
    commandsMarkdown(skill.commands),
    '',
    '## Guidance',
    '',
    instructions.trim(),
    ''
  ].join('\n');
};

const mappingNotesForTool = (tool) => {
  const notes = [
    'Canonical id -> adapter folder name',
    'Canonical description -> tool-visible description',
    'Canonical commands -> adapter command reference section',
    'Canonical resources -> copied into adapter package'
  ];

  if (tool === 'copilot') {
    notes.push('Tier2 limitations surfaced through unsupportedFeatures');
  }

  return notes;
};

const copyResources = async (skillRoot, adapterRoot) => {
  const resourceDirs = ['scripts', 'references', 'assets'];

  for (const folder of resourceDirs) {
    const source = path.join(skillRoot, folder);
    try {
      await copyRecursive(source, path.join(adapterRoot, folder));
    } catch {
      // Optional resource folder can be absent.
    }
  }
};

const buildSingleAdapter = async (tool, loadedSkill) => {
  const adapterRoot = path.join(ADAPTERS_DIR, tool, loadedSkill.skillId);
  await ensureDir(adapterRoot);
  await removeDirContents(adapterRoot);

  await copyResources(loadedSkill.skillRoot, adapterRoot);

  const skillMarkdown = renderSkillMarkdown(tool, loadedSkill.data, loadedSkill.instructions);
  const entryFile = tool === 'copilot' ? 'COPILOT_INSTRUCTIONS.md' : 'SKILL.md';
  await writeText(path.join(adapterRoot, entryFile), `${skillMarkdown.trim()}\n`);

  const tier = loadedSkill.data.adapterHints?.[tool]?.tier ?? TIER_BY_TOOL[tool];
  const unsupportedFeatures = loadedSkill.data.adapterHints?.[tool]?.unsupportedFeatures ?? [];

  const generatedFiles = await listFilesRecursive(adapterRoot);
  generatedFiles.push('adapter-manifest.json');
  generatedFiles.sort((left, right) => left.localeCompare(right));

  const manifest = {
    tool,
    skillId: loadedSkill.skillId,
    tier,
    generatedFiles,
    unsupportedFeatures,
    mappingNotes: mappingNotesForTool(tool)
  };

  await writeJson(path.join(adapterRoot, 'adapter-manifest.json'), manifest);

  return {
    tool,
    skillId: loadedSkill.skillId,
    manifestPath: path.join(adapterRoot, 'adapter-manifest.json')
  };
};

export const buildAdapters = async ({ tool }) => {
  const selectedTools = toolsFromOption(tool);
  const skills = await loadAllSkills();

  for (const selectedTool of selectedTools) {
    const toolRoot = path.join(ADAPTERS_DIR, selectedTool);
    await ensureDir(toolRoot);
    await removeDirContents(toolRoot);
  }

  const built = [];
  for (const selectedTool of selectedTools) {
    for (const skill of skills) {
      const output = await buildSingleAdapter(selectedTool, skill);
      built.push(output);
    }
  }

  return {
    tools: selectedTools,
    skills: skills.map((skill) => skill.skillId),
    built
  };
};
