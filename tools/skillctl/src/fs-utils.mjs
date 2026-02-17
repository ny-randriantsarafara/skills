import fs from 'node:fs/promises';
import path from 'node:path';

export const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

export const readText = async (filePath) => {
  return fs.readFile(filePath, 'utf8');
};

export const readTextIfExists = async (filePath) => {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
};

export const writeText = async (filePath, content) => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
};

export const writeJson = async (filePath, value) => {
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  await writeText(filePath, payload);
};

export const exists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

export const listDirs = async (dirPath) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
};

export const copyRecursive = async (source, target) => {
  const sourceStat = await fs.stat(source);
  if (sourceStat.isDirectory()) {
    await ensureDir(target);
    const entries = await fs.readdir(source, { withFileTypes: true });
    for (const entry of entries) {
      const from = path.join(source, entry.name);
      const to = path.join(target, entry.name);
      if (entry.isDirectory()) {
        await copyRecursive(from, to);
        continue;
      }
      await ensureDir(path.dirname(to));
      await fs.copyFile(from, to);
    }
    return;
  }

  await ensureDir(path.dirname(target));
  await fs.copyFile(source, target);
};

export const removeDirContents = async (dirPath) => {
  if (!(await exists(dirPath))) {
    return;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
      continue;
    }
    await fs.rm(fullPath, { force: true });
  }
};

export const listFilesRecursive = async (dirPath, baseDir = dirPath) => {
  if (!(await exists(dirPath))) {
    return [];
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await listFilesRecursive(fullPath, baseDir);
      files.push(...nested);
      continue;
    }

    files.push(path.relative(baseDir, fullPath).split(path.sep).join('/'));
  }

  return files.sort((left, right) => left.localeCompare(right));
};
