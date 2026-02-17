import path from 'node:path';
import { ADAPTERS_DIR, DEFAULT_DESTINATIONS, SUPPORTED_TOOLS } from './constants.mjs';
import { ensureDir, copyRecursive, exists, listDirs, removeDirContents } from './fs-utils.mjs';

const resolveTools = (tool) => {
  if (tool === 'all' || tool === undefined) {
    return [...SUPPORTED_TOOLS];
  }

  if (!SUPPORTED_TOOLS.includes(tool)) {
    throw new Error(`Unsupported tool: ${tool}`);
  }

  return [tool];
};

const resolveDestination = (tool, explicitDest, allToolsMode) => {
  if (explicitDest === undefined || explicitDest.length === 0) {
    return DEFAULT_DESTINATIONS[tool];
  }

  if (!allToolsMode) {
    return explicitDest;
  }

  return path.join(explicitDest, tool);
};

const installToolAdapters = async (tool, destination) => {
  const sourceRoot = path.join(ADAPTERS_DIR, tool);
  if (!(await exists(sourceRoot))) {
    throw new Error(`Missing adapter output for ${tool}. Run: skillctl build --tool ${tool}`);
  }

  const skillIds = await listDirs(sourceRoot);
  await ensureDir(destination);

  const installed = [];
  for (const skillId of skillIds) {
    const source = path.join(sourceRoot, skillId);
    const target = path.join(destination, skillId);

    await ensureDir(target);
    await removeDirContents(target);
    await copyRecursive(source, target);

    installed.push({ skillId, target });
  }

  return installed;
};

export const installAdapters = async ({ tool, dest }) => {
  const tools = resolveTools(tool);
  const allToolsMode = tools.length > 1;

  const installed = [];
  for (const selectedTool of tools) {
    const destination = resolveDestination(selectedTool, dest, allToolsMode);
    const results = await installToolAdapters(selectedTool, destination);
    installed.push({
      tool: selectedTool,
      destination,
      skills: results
    });
  }

  return {
    tools,
    installed
  };
};
