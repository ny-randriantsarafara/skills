const STOP_WORDS = new Set([
  'src',
  'lib',
  'utils',
  'common',
  'api',
  'service',
  'services',
  'controller',
  'controllers',
  'models',
  'model',
  'index',
  'types',
  'type',
  'node',
  'app',
  'core',
  'shared',
  'module',
  'modules',
  'test',
  'tests',
  'spec',
  'impl',
  'internal',
  'external',
  'config',
  'scripts',
  'assets',
  'references',
  'docs',
  'dist',
  'build',
  'public',
  'private',
  'main'
]);

export const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const splitCamelCase = (value: string): string => {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2');
};

export const tokenize = (value: string): readonly string[] => {
  const normalized = splitCamelCase(value)
    .toLowerCase()
    .replace(/[\s/_.-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim();

  if (normalized.length === 0) {
    return [];
  }

  const tokens = normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !STOP_WORDS.has(token));

  return tokens;
};

export const uniqueSorted = (values: readonly string[]): readonly string[] => {
  const unique = Array.from(new Set(values));
  return unique.sort((left, right) => left.localeCompare(right));
};

export const takeTop = <T>(values: readonly T[], count: number): readonly T[] => {
  return values.slice(0, count);
};

export const toMarkdownList = (values: readonly string[]): string => {
  if (values.length === 0) {
    return '- None detected';
  }

  return values.map((value) => `- ${value}`).join('\n');
};

export const pickFirstNonEmpty = (values: readonly string[]): string => {
  for (const value of values) {
    if (value.trim().length > 0) {
      return value;
    }
  }

  return '';
};
