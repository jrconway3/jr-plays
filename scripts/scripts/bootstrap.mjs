/**
 * Shared WordPress bootstrap orchestration
 * 
 * Extracted from setup-local.mjs to be reused by both Docker (dev.mjs) and 
 * local (build.mjs) flows. Contains environment initialization, multisite 
 * setup, theme/plugin activation, and rewrite flushing.
 */

import fs from 'node:fs';
import { 
  readDotEnv, 
  writeDotEnv, 
  randomToken, 
  resolveRepoPath 
} from './lib.mjs';

/**
 * Normalize password values: convert literal string "null" to empty
 */
export function normalizedPassword(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return value.trim().toLowerCase() === 'null' ? '' : value;
}

/**
 * Create or verify .htaccess for multisite subdomain routing
 */
export function ensureHtaccess() {
  const htaccessPath = resolveRepoPath('.htaccess');
  const multisiteHtaccess = [
    'RewriteEngine On',
    'RewriteBase /',
    'RewriteRule ^index\\.php$ - [L]',
    '',
    '# uploaded files',
    'RewriteRule ^([_0-9a-zA-Z-]+/)?files/(.+) wp-includes/ms-files.php?file=$2 [L]',
    '',
    '# add a trailing slash to /wp-admin',
    'RewriteRule ^wp-admin$ wp-admin/ [R=301,L]',
    '',
    'RewriteCond %{REQUEST_FILENAME} -f [OR]',
    'RewriteCond %{REQUEST_FILENAME} -d',
    'RewriteRule ^ - [L]',
    'RewriteRule ^([_0-9a-zA-Z-]+/)?(wp-(content|admin|includes).*) $2 [L]',
    'RewriteRule ^([_0-9a-zA-Z-]+/)?(.*\\.php)$ $2 [L]',
    'RewriteRule . index.php [L]',
    '',
  ].join('\n');

  if (!fs.existsSync(htaccessPath)) {
    fs.writeFileSync(htaccessPath, multisiteHtaccess, 'utf8');
  }
}

/**
 * Initialize environment files with defaults
 * Returns: { envValues, siteUrl }
 */
export function initializeEnvironment(envPath, envExamplePath) {
  if (!fs.existsSync(envPath)) {
    const sourceEnvPath = envExamplePath ?? resolveRepoPath('.env.example');
    if (fs.existsSync(sourceEnvPath)) {
      fs.copyFileSync(sourceEnvPath, envPath);
    } else {
      fs.writeFileSync(envPath, '', 'utf8');
    }
  }

  const envValues = readDotEnv(envPath);

  const defaults = new Map([
    ['SITE_URL', 'jrconway.localhost'],
    ['WP_PATH_CURRENT_SITE', '/'],
    ['APP_PORT', '80'],
    ['MYSQL_ROOT_PASSWORD', 'root'],
    ['LOCAL_DB_DUMP', ''],
    ['WP_SITE_TITLE', 'JRConway Local'],
    ['WP_ADMIN_USER', 'admin'],
    ['WP_ADMIN_PASSWORD', 'admin'],
    ['WP_ADMIN_EMAIL', 'admin@jrconway.localhost'],
    ['WP_DB_NAME', 'jrproductions'],
    ['WP_DB_USER', 'root'],
    ['WP_DB_PASSWORD', 'null'],
    ['WP_DB_HOST', 'localhost'],
    ['WP_DB_PREFIX', 'wp_'],
  ]);

  for (const [key, value] of defaults) {
    if (!envValues.has(key) || (!envValues.get(key)?.trim() && key !== 'WP_DB_PASSWORD' && key !== 'LOCAL_DB_DUMP')) {
      envValues.set(key, value);
    }
  }

  // Generate security salts if missing
  for (const key of [
    'WP_AUTH_KEY',
    'WP_SECURE_AUTH_KEY',
    'WP_LOGGED_IN_KEY',
    'WP_NONCE_KEY',
    'WP_AUTH_SALT',
    'WP_SECURE_AUTH_SALT',
    'WP_LOGGED_IN_SALT',
    'WP_NONCE_SALT',
  ]) {
    if (!envValues.has(key) || !envValues.get(key)?.trim()) {
      envValues.set(key, randomToken());
    }
  }

  writeDotEnv(envPath, envValues);

  // Build canonical site URL respecting port rules
  const siteUrlHost = envValues.get('SITE_URL');
  const appPort = envValues.get('APP_PORT');
  let siteUrl = `http://${siteUrlHost}`;
  
  if (appPort && !['80', '443'].includes(appPort) && !siteUrlHost.includes(':')) {
    siteUrl += `:${appPort}`;
  }

  return { envValues, siteUrl };
}

/**
 * WordPress core and multisite installation guard
 * Executed via WP-CLI; logs indicate skip/install outcome
 */
export function buildCoreInstallCommand(wpGlobalFlags, siteUrl, envValues) {
  const wpTitle = envValues.get('WP_SITE_TITLE') || 'JRConway Local';
  const wpAdminUser = envValues.get('WP_ADMIN_USER') || 'admin';
  const wpAdminPassword = envValues.get('WP_ADMIN_PASSWORD') || 'admin';
  const wpAdminEmail = envValues.get('WP_ADMIN_EMAIL') || 'admin@jrconway.net';

  return [
    `if ! wp ${wpGlobalFlags} core is-installed; then`,
    `  wp ${wpGlobalFlags} core multisite-install --url='${siteUrl}' --title='${wpTitle}' --admin_user='${wpAdminUser}' --admin_password='${wpAdminPassword}' --admin_email='${wpAdminEmail}' --skip-email --subdomains;`,
    'fi',
  ].join('\n');
}

/**
 * Fallback modern theme installation
 * Installs TwentyTwentyFive if available, falls back to TwentyTwentyFour
 */
export function buildFallbackThemeCommand(wpGlobalFlags, siteUrl) {
  return [
    'if [ ! -f vendor/autoload.php ] || [ ! -f wp-content/plugins/gantry/gantry.php ]; then',
    `  wp ${wpGlobalFlags} theme install twentytwentyfive --activate --url='${siteUrl}' || wp ${wpGlobalFlags} theme install twentytwentyfour --activate --url='${siteUrl}' || true;`,
    'fi',
  ].join('\n');
}

/**
 * Plugin activation and rewrite flush commands
 */
export function buildFinalizationCommands(wpGlobalFlags, siteUrl) {
  return [
    `wp ${wpGlobalFlags} plugin activate jr-content-core --url='${siteUrl}' || true`,
    `wp ${wpGlobalFlags} rewrite flush --hard --url='${siteUrl}' || true`,
  ];
}
