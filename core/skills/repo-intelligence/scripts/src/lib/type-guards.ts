export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const asString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  return '';
};

export const asStringArray = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

export const asStringMap = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) {
    return {};
  }

  const pairs: Array<[string, string]> = [];
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== 'string') {
      continue;
    }
    if (raw.length === 0) {
      continue;
    }

    pairs.push([key, raw]);
  }

  return Object.fromEntries(pairs);
};
