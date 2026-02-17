import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const SUPPORTED_TOOLS = ['codex', 'claude', 'cursor', 'copilot'];

export const DEFAULT_DESTINATIONS = {
  codex: path.join(os.homedir(), '.codex', 'skills'),
  claude: path.join(os.homedir(), '.claude', 'skills'),
  cursor: path.join(os.homedir(), '.cursor', 'skills'),
  copilot: path.join(os.homedir(), '.config', 'skillctl', 'copilot-skills')
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
export const CORE_SKILLS_DIR = path.join(REPO_ROOT, 'core', 'skills');
export const CORE_SCHEMA_DIR = path.join(REPO_ROOT, 'core', 'schema');
export const ADAPTERS_DIR = path.join(REPO_ROOT, 'adapters');
export const DOCS_DIR = path.join(REPO_ROOT, 'docs');

export const TIER_BY_TOOL = {
  codex: 'tier1',
  claude: 'tier1',
  cursor: 'tier1',
  copilot: 'tier2'
};
