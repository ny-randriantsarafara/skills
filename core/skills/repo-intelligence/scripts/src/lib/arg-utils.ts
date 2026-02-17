export interface ParsedArgs {
  readonly command: string;
  readonly options: Readonly<Record<string, string>>;
}

const normalizeOptionKey = (raw: string): string => {
  return raw.replace(/^--/, '').trim();
};

export const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const command = argv[0];
  if (command === undefined || command.length === 0) {
    return {
      command: 'help',
      options: {}
    };
  }

  const rest = argv.slice(1);
  const entries: Array<[string, string]> = [];

  for (const [index, current] of rest.entries()) {
    if (!current.startsWith('--')) {
      continue;
    }

    if (current.includes('=')) {
      const parts = current.split('=', 2);
      const rawKey = parts[0];
      const rawValue = parts[1];
      if (rawKey === undefined || rawValue === undefined) {
        continue;
      }

      const key = normalizeOptionKey(rawKey);
      entries.push([key, rawValue]);
      continue;
    }

    const key = normalizeOptionKey(current);
    const next = rest[index + 1];

    if (next === undefined || next.startsWith('--')) {
      entries.push([key, 'true']);
      continue;
    }

    entries.push([key, next]);
  }

  return {
    command,
    options: Object.fromEntries(entries)
  };
};

export const optionOrDefault = (
  options: Readonly<Record<string, string>>,
  key: string,
  fallback: string
): string => {
  const value = options[key];
  if (value === undefined || value.length === 0) {
    return fallback;
  }

  return value;
};

export const requiredOption = (options: Readonly<Record<string, string>>, key: string): string => {
  const value = options[key];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required option --${key}`);
  }

  return value;
};
