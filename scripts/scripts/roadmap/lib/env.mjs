import fs from 'node:fs';
import path from 'node:path';

export function readDotEnv(filePath) {
  const values = new Map();

  if (!fs.existsSync(filePath)) {
    return values;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);
    values.set(key, value);
  }

  return values;
}

export function loadRoadmapConfig(scriptDir) {
  const env = readDotEnv(path.join(scriptDir, '.env'));

  const token = env.get('GITHUB_TOKEN');
  const owner = env.get('GITHUB_OWNER');
  const repo = env.get('GITHUB_REPO');
  const projectNumber = Number.parseInt(env.get('GITHUB_PROJECT_NUMBER') ?? '', 10);

  if (!token || !owner || !repo || Number.isNaN(projectNumber)) {
    throw new Error(
      'Missing required vars in scripts/roadmap/.env:\n' +
        '  GITHUB_TOKEN=\n' +
        '  GITHUB_OWNER=\n' +
        '  GITHUB_REPO=\n' +
        '  GITHUB_PROJECT_NUMBER=\n'
    );
  }

  return {
    token,
    owner,
    repo,
    projectNumber,
  };
}
