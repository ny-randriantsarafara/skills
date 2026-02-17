import { toMarkdownList } from './text-utils.js';

export const markdownTable = (headers: readonly string[], rows: readonly (readonly string[])[]): string => {
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const rowLines = rows.map((row) => `| ${row.join(' | ')} |`);

  return [headerLine, separatorLine, ...rowLines].join('\n');
};

export const section = (title: string, body: string): string => {
  return `## ${title}\n\n${body.trim()}\n`;
};

export const listSection = (title: string, values: readonly string[]): string => {
  return section(title, toMarkdownList(values));
};
