/**
 * Docker-based WordPress development environment bootstrap
 * 
 * Starts Docker containers and runs WordPress setup inside Docker.
 * Suitable for cross-platform development when Docker is available.
 * 
 * Usage: npm run dev [path/to/dump.sql]
 */

import { 
  dockerCompose,
  dockerEnvPath,
  dockerEnvExamplePath,
  envPath,
  envExamplePath,
  readDotEnv,
  writeDotEnv,
  ensureSpecificEnvFile,
} from './lib.mjs';
import {
  ensureHtaccess,
  initializeEnvironment,
  normalizedPassword,
  buildCoreInstallCommand,
  buildFallbackThemeCommand,
  buildFinalizationCommands,
} from './bootstrap.mjs';

const dumpArg = process.argv[2];

console.log('🐳 Starting Docker-based WordPress development environment...\n');

// Step 1: Initialize main environment
ensureHtaccess();
const { envValues } = initializeEnvironment(envPath(), envExamplePath());

// Step 2: Initialize Docker environment
console.log('🔧 Preparing Docker environment...');
const dockerEnvValues = ensureSpecificEnvFile(dockerEnvPath(), dockerEnvExamplePath());

const defaults = new Map([
  ['SITE_URL', 'jr-plays.localhost'],

  ['APP_PORT', '8080'],
  ['MYSQL_ROOT_PASSWORD', 'root'],
  ['LOCAL_DB_DUMP', ''],
  ['WP_SITE_TITLE', 'JRConway Local'],
  ['WP_ADMIN_USER', 'admin'],
  ['WP_ADMIN_PASSWORD', 'admin'],
  ['WP_ADMIN_EMAIL', 'admin@jrconway.localhost'],
  ['WP_DB_NAME', 'jr_local'],
  ['WP_DB_USER', 'wordpress'],
  ['WP_DB_PASSWORD', 'wordpress'],
  ['WP_DB_HOST', 'db'],
  ['WP_DB_PREFIX', 'wp_'],
  ['DOCKER_DB_USER', 'wordpress'],
  ['DOCKER_DB_PASSWORD', 'wordpress'],
  ['MAILPIT_SMTP_PORT', '1025'],
  ['MAILPIT_UI_PORT', '8025'],
]);

for (const [key, value] of defaults) {
  if (!dockerEnvValues.has(key) || !dockerEnvValues.get(key)?.trim()) {
    dockerEnvValues.set(key, value);
  }
}

// Handle Docker DB host translation
const appDbHost = envValues.get('WP_DB_HOST') || 'localhost';
const useHostDatabase = appDbHost !== 'db';

if (useHostDatabase) {
  dockerEnvValues.set('WP_DB_NAME', envValues.get('WP_DB_NAME') || 'jr_local');
  dockerEnvValues.set('WP_DB_USER', envValues.get('WP_DB_USER') || 'root');
  dockerEnvValues.set('WP_DB_PASSWORD', normalizedPassword(envValues.get('WP_DB_PASSWORD')));
  dockerEnvValues.set('WP_DB_HOST', appDbHost === 'localhost' ? 'host.docker.internal' : appDbHost);
  dockerEnvValues.set('WP_DB_PORT', envValues.get('WP_DB_PORT') || '3306');
  // Keep the docker-managed MariaDB using safe non-root credentials so its
  // MYSQL_USER init doesn't conflict with the built-in root account.
  dockerEnvValues.set('DOCKER_DB_USER', 'wordpress');
  dockerEnvValues.set('DOCKER_DB_PASSWORD', 'wordpress');
} else {
  dockerEnvValues.set('WP_DB_HOST', 'db');
  dockerEnvValues.set('WP_DB_PORT', '3306');
  dockerEnvValues.set('DOCKER_DB_USER', envValues.get('WP_DB_USER') || 'wordpress');
  dockerEnvValues.set('DOCKER_DB_PASSWORD', normalizedPassword(envValues.get('WP_DB_PASSWORD')) || 'wordpress');
}

writeDotEnv(dockerEnvPath(), dockerEnvValues);
console.log('✓ Docker environment configured\n');

// Step 3: Start containers
console.log('🚀 Starting Docker containers...');
dockerCompose(['up', '-d', '--build']);
console.log('✓ Docker containers running\n');

// Step 4: Download WordPress core if needed
console.log('📥 Checking WordPress core...');
dockerCompose([
  'exec',
  '-T',
  'app',
  'bash',
  '-lc',
  'if [ ! -f wp-load.php ]; then wp core download --allow-root --skip-content; fi',
]);
console.log('✓ WordPress core available\n');

// Step 5: Import database dump if provided
const configuredDumpPath = envValues.get('LOCAL_DB_DUMP');
const effectiveDumpPath = dumpArg || configuredDumpPath;

if (effectiveDumpPath) {
  console.log(`📊 Importing database from ${effectiveDumpPath}...`);
  const { importDumpIntoDockerDb } = await import('./lib.mjs');
  const { resolveRepoPath } = await import('./lib.mjs');
  const dumpPath = resolveRepoPath(effectiveDumpPath);
  importDumpIntoDockerDb(dumpPath);
  console.log('✓ Database imported\n');
}

// Step 6: Build site URL and install WordPress
const siteUrl = `http://${dockerEnvValues.get('SITE_URL')}:${dockerEnvValues.get('APP_PORT')}`;
const wpGlobalFlags = '--allow-root --skip-themes --skip-plugins';

console.log('🌍 Installing WordPress...');
const installCommand = buildCoreInstallCommand(wpGlobalFlags, siteUrl, dockerEnvValues);
dockerCompose(['exec', '-T', 'app', 'bash', '-lc', installCommand]);
console.log('✓ WordPress configured\n');

// Step 7: Install fallback modern themes
console.log('🎨 Installing fallback theme...');
const themeCommand = buildFallbackThemeCommand(wpGlobalFlags, siteUrl);
dockerCompose(['exec', '-T', 'app', 'bash', '-lc', themeCommand]);
console.log('✓ Theme installed\n');

// Step 8: Activate plugin and flush rewrites
console.log('⚙️  Finalizing configuration...');
const finalizeCommands = buildFinalizationCommands(wpGlobalFlags, siteUrl);
for (const cmd of finalizeCommands) {
  dockerCompose(['exec', '-T', 'app', 'bash', '-lc', cmd]);
}
console.log('✓ Configuration finalized\n');

console.log('='.repeat(60));
console.log(`✅ Local WordPress is ready at ${siteUrl}`);
console.log(`📧 Mailpit UI is available at http://localhost:${dockerEnvValues.get('MAILPIT_UI_PORT')}`);
console.log('='.repeat(60));


