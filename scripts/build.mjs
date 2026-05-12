/**
 * Local (non-Docker) WordPress build and bootstrap
 *
 * Installs WordPress core, modern themes, plugins, and dependencies directly
 * in the local environment (XAMPP, local PHP, etc.) without Docker.
 *
 * Usage: npm run build
 */

import { existsSync } from 'node:fs';
import {
  run,
  runCapture,
  envPath,
  envExamplePath,
  resolveRepoPath,
  ensureEnvFile,
} from './lib.mjs';
import {
  ensureHtaccess,
  initializeEnvironment,
} from './bootstrap.mjs';

function resolveWpCli() {
  const globalWp = runCapture('wp', ['--info']);
  if (globalWp.status === 0) {
    return { command: 'wp', prefixArgs: [] };
  }

  const localWpBat = resolveRepoPath('vendor/bin/wp.bat');
  if (existsSync(localWpBat)) {
    return { command: localWpBat, prefixArgs: [] };
  }

  const localWp = resolveRepoPath('vendor/bin/wp');
  if (existsSync(localWp)) {
    return { command: localWp, prefixArgs: [] };
  }

  const wpCliPhar = resolveRepoPath('wp-cli.phar');
  if (!existsSync(wpCliPhar)) {
    console.log('⚠️  WP-CLI not found. Bootstrapping wp-cli.phar...');
    let downloadPhar = runCapture('php', [
      '-r',
      'copy("https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar","wp-cli.phar");',
    ]);

    if (downloadPhar.status !== 0 && process.platform === 'win32') {
      downloadPhar = runCapture('powershell', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        'Invoke-WebRequest -Uri "https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar" -OutFile "wp-cli.phar"',
      ]);
    }

    if (downloadPhar.status !== 0) {
      downloadPhar = runCapture('curl', [
        '-L',
        'https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar',
        '-o',
        'wp-cli.phar',
      ]);
    }

    if (downloadPhar.status !== 0) {
      console.error('\n❌ WP-CLI bootstrap failed. Install WP-CLI globally or ensure PHP can download files.\n');
      process.exit(1);
    }
  }

  const pharCheck = runCapture('php', ['wp-cli.phar', '--info']);
  if (pharCheck.status === 0) {
    return { command: 'php', prefixArgs: ['wp-cli.phar'] };
  }

  console.error('\n❌ WP-CLI is not available. Install it globally or place wp-cli.phar at the repository root.\n');
  process.exit(1);
}

function buildWpRunners(wpCli) {
  function runWp(args) {
    run(wpCli.command, [...wpCli.prefixArgs, ...args]);
  }

  function runWpCapture(args) {
    return runCapture(wpCli.command, [...wpCli.prefixArgs, ...args]);
  }

  return { runWp, runWpCapture };
}

console.log('🔨 Building local WordPress environment (non-Docker)...\n');

// Step 1: Initialize environment and .htaccess
ensureHtaccess();
ensureEnvFile();  // Auto-create .env from .env.example if missing
const { envValues, siteUrl } = initializeEnvironment(envPath(), envExamplePath());

console.log(`✓ Environment initialized: ${siteUrl}\n`);

// Step 2: Locate or bootstrap Composer
console.log('🔍 Checking Composer availability...');
let useLocalPhar = false;

const composerCheck = runCapture('composer', ['--version']);
if (composerCheck.status !== 0) {
  console.log('⚠️  Composer not found on PATH. Attempting to bootstrap...\n');

  const composerPharPath = resolveRepoPath('composer.phar');
  if (existsSync(composerPharPath)) {
    useLocalPhar = true;
    console.log('✓ Using existing composer.phar\n');
  } else {
    console.log('Downloading Composer installer...');
    const downloadResult = runCapture('php', [
      '-r',
      'copy("https://getcomposer.org/installer","composer-setup.php");',
    ]);
    if (downloadResult.status !== 0) {
      console.error('\n❌ Composer bootstrap failed. Please install Composer manually:\n');
      console.error('  https://getcomposer.org/download/\n');
      process.exit(1);
    }
    run('php', ['composer-setup.php']);
    run('php', ['-r', 'unlink("composer-setup.php");']);
    useLocalPhar = true;
    console.log('✓ Composer bootstrapped as composer.phar\n');
  }
} else {
  console.log('✓ Composer available\n');
}

// Step 3: Install PHP dependencies
console.log('📦 Installing PHP dependencies...');
if (useLocalPhar) {
  run('php', ['composer.phar', 'install']);
} else {
  run('composer', ['install']);
}
console.log('✓ PHP dependencies installed\n');

// Step 4: Download WordPress core if needed
console.log('📥 Checking WordPress core...');
const wpLoadPath = resolveRepoPath('wp-load.php');
const wpCli = resolveWpCli();
const { runWp, runWpCapture } = buildWpRunners(wpCli);
if (!existsSync(wpLoadPath)) {
  console.log('Downloading WordPress core...');
  runWp(['core', 'download', '--allow-root', '--skip-content']);
  console.log('✓ WordPress core downloaded\n');
} else {
  console.log('✓ WordPress core already present\n');
}

// WP-CLI flags shared across all wp commands
const wpFlags = ['--allow-root', '--skip-themes', '--skip-plugins'];

// Step 5: Install WordPress if needed
console.log('🌍 Installing WordPress...');
const isInstalled = runWpCapture([...wpFlags, 'core', 'is-installed']);
if (isInstalled.status !== 0) {
  const wpTitle = envValues.get('WP_SITE_TITLE') || 'JRConway Local';
  const wpAdminUser = envValues.get('WP_ADMIN_USER') || 'admin';
  const wpAdminPassword = envValues.get('WP_ADMIN_PASSWORD') || 'admin';
  const wpAdminEmail = envValues.get('WP_ADMIN_EMAIL') || 'admin@jrconway.net';

  runWp([
    ...wpFlags,
    'core', 'install',
    `--url=${siteUrl}`,
    `--title=${wpTitle}`,
    `--admin_user=${wpAdminUser}`,
    `--admin_password=${wpAdminPassword}`,
    `--admin_email=${wpAdminEmail}`,
    '--skip-email',
    
  ]);
} else {
  console.log('WordPress already installed, skipping core install.');
}
console.log('✓ WordPress configured\n');

// Step 6: Install fallback modern theme if Gantry not present
console.log('🎨 Installing fallback theme...');
const vendorAutoload = resolveRepoPath('vendor/autoload.php');
const gantryPlugin = resolveRepoPath('wp-content/plugins/gantry/gantry.php');
if (!existsSync(vendorAutoload) || !existsSync(gantryPlugin)) {
  const themeFlags = [...wpFlags, 'theme', 'install', '--activate', `--url=${siteUrl}`];
  const t25 = runWpCapture([...themeFlags, 'twentytwentyfive']);
  if (t25.status !== 0) {
    runWpCapture([...themeFlags, 'twentytwentyfour']);
  }
}
console.log('✓ Theme installed\n');

// Step 7: Activate jr-content-core plugin and flush rewrites
console.log('⚙️  Finalizing configuration...');
runWpCapture([...wpFlags, 'plugin', 'activate', 'jr-content-core', `--url=${siteUrl}`]);
runWpCapture([...wpFlags, 'rewrite', 'flush', '--hard', `--url=${siteUrl}`]);
console.log('✓ Configuration finalized\n');

console.log('='.repeat(60));
console.log(`✅ Local WordPress is ready at ${siteUrl}`);
console.log('='.repeat(60));


