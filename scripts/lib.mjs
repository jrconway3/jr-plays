import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, '..');

export function envPath() {
  return path.join(repoRoot, '.env');
}

export function dockerEnvPath() {
  return path.join(repoRoot, '.env.docker');
}

export function envExamplePath() {
  return path.join(repoRoot, '.env.example');
}

export function dockerEnvExamplePath() {
  return path.join(repoRoot, '.env.docker.example');
}

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

export function writeDotEnv(filePath, values) {
  const content = Array.from(values.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(filePath, `${content}\n`, 'utf8');
}

export function ensureEnvFile() {
  if (!fs.existsSync(envPath())) {
    fs.copyFileSync(envExamplePath(), envPath());
  }

  return readDotEnv(envPath());
}

export function ensureSpecificEnvFile(targetPath, examplePath) {
  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(examplePath, targetPath);
  }

  return readDotEnv(targetPath);
}

export function randomToken() {
  return `${crypto.randomBytes(32).toString('hex')}${crypto.randomBytes(32).toString('hex')}`;
}

export function resolveRepoPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(repoRoot, inputPath);
}

export function readDumpBuffer(filePath) {
  const buffer = fs.readFileSync(filePath);

  if (filePath.endsWith('.gz')) {
    return zlib.gunzipSync(buffer);
  }

  return buffer;
}

const defaultShell = false;

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: defaultShell,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

export function runCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: defaultShell,
    ...options,
  });

  if (result.error) {
    // Return failure result instead of throwing so callers can handle missing commands
    return { status: -1, stdout: '', stderr: result.error.message, error: result.error };
  }

  return result;
}

export function dockerCompose(args, options = {}) {
  assertDockerAvailable();
  ensureSpecificEnvFile(dockerEnvPath(), dockerEnvExamplePath());
  run('docker', ['compose', '--env-file', '.env.docker', ...args], options);
}

export function dockerComposeCapture(args, options = {}) {
  assertDockerAvailable();
  ensureSpecificEnvFile(dockerEnvPath(), dockerEnvExamplePath());
  return runCapture('docker', ['compose', '--env-file', '.env.docker', ...args], options);
}

export function assertDockerAvailable() {
  const result = runCapture('docker', ['info']);

  if (result.status === 0) {
    return;
  }

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  console.error('Docker is not available. Start Docker Desktop or the Docker daemon, then try again.');
  if (output) {
    console.error(output);
  }
  process.exit(result.status ?? 1);
}

export function importDumpIntoDockerDb(dumpPath) {
  ensureSpecificEnvFile(dockerEnvPath(), dockerEnvExamplePath());

  const dockerEnv = readDotEnv(dockerEnvPath());

  const dbName = dockerEnv.get('WP_DB_NAME') || 'jr_local';
  const rootPassword = dockerEnv.get('MYSQL_ROOT_PASSWORD') || 'root';
  const dumpBuffer = readDumpBuffer(dumpPath);

  const result = spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      '.env.docker',
      'exec',
      '-T',
      'db',
      'bash',
      '-lc',
      `mariadb -uroot -p"${rootPassword}" "${dbName}"`,
    ],
    {
      cwd: repoRoot,
      input: dumpBuffer,
      stdio: ['pipe', 'inherit', 'inherit'],
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return dbName;
}
