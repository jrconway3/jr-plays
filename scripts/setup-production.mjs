/**
 * Production environment setup
 *
 * Builds .env from .env.example and injects production secrets from environment variables.
 *
 * Usage: node scripts/setup-production.mjs
 *
 * Environment variables expected (all optional, falls back to .env.example defaults):
 * - PROD_SITE_URL: production domain (e.g., jrconway.net)
 * - PROD_WP_DB_HOST: database host
 * - PROD_WP_DB_NAME: database name
 * - PROD_WP_DB_USER: database user
 * - PROD_WP_DB_PASSWORD: database password
 * - PROD_MYSQL_ROOT_PASSWORD: MySQL root password
 * - PROD_WP_ADMIN_USER: WordPress admin username
 * - PROD_WP_ADMIN_PASSWORD: WordPress admin password
 * - PROD_WP_ADMIN_EMAIL: WordPress admin email
 * - PROD_WP_AUTH_KEY: WordPress auth key (or leave for auto-generation)
 * - PROD_WP_SECURE_AUTH_KEY: WordPress secure auth key
 * - PROD_WP_LOGGED_IN_KEY: WordPress logged-in key
 * - PROD_WP_NONCE_KEY: WordPress nonce key
 * - PROD_WP_AUTH_SALT: WordPress auth salt
 * - PROD_WP_SECURE_AUTH_SALT: WordPress secure auth salt
 * - PROD_WP_LOGGED_IN_SALT: WordPress logged-in salt
 * - PROD_WP_NONCE_SALT: WordPress nonce salt
 */

import { readDotEnv, writeDotEnv, resolveRepoPath, randomToken } from './lib.mjs';
import fs from 'node:fs';

const envExamplePath = resolveRepoPath('.env.example');
const envPath = resolveRepoPath('.env');

console.log('🔐 Setting up production .env with secrets...\n');

// Read .env.example as template
if (!fs.existsSync(envExamplePath)) {
  console.error(`❌ .env.example not found at ${envExamplePath}`);
  process.exit(1);
}

const templateEnv = readDotEnv(envExamplePath);
const prodEnv = new Map(templateEnv);

// Map of environment variable names to .env keys
const secretMappings = {
  'PROD_SITE_URL': 'SITE_URL',
  'PROD_WP_DB_HOST': 'WP_DB_HOST',
  'PROD_WP_DB_NAME': 'WP_DB_NAME',
  'PROD_WP_DB_USER': 'WP_DB_USER',
  'PROD_WP_DB_PASS': 'WP_DB_PASSWORD',
  'PROD_MYSQL_ROOT_PASSWORD': 'MYSQL_ROOT_PASSWORD',
  'PROD_WP_ADMIN_USER': 'WP_ADMIN_USER',
  'PROD_WP_ADMIN_PASSWORD': 'WP_ADMIN_PASSWORD',
  'PROD_WP_ADMIN_EMAIL': 'WP_ADMIN_EMAIL',
  'PROD_WP_AUTH_KEY': 'WP_AUTH_KEY',
  'PROD_WP_SECURE_AUTH_KEY': 'WP_SECURE_AUTH_KEY',
  'PROD_WP_LOGGED_IN_KEY': 'WP_LOGGED_IN_KEY',
  'PROD_WP_NONCE_KEY': 'WP_NONCE_KEY',
  'PROD_WP_AUTH_SALT': 'WP_AUTH_SALT',
  'PROD_WP_SECURE_AUTH_SALT': 'WP_SECURE_AUTH_SALT',
  'PROD_WP_LOGGED_IN_SALT': 'WP_LOGGED_IN_SALT',
  'PROD_WP_NONCE_SALT': 'WP_NONCE_SALT',
};

// Inject secrets from environment variables
let injectedCount = 0;
for (const [envVar, envKey] of Object.entries(secretMappings)) {
  const value = process.env[envVar];
  if (value && value.trim()) {
    prodEnv.set(envKey, value);
    injectedCount++;
  }
}

// Auto-generate missing security keys/salts
const saltKeys = [
  'WP_AUTH_KEY',
  'WP_SECURE_AUTH_KEY',
  'WP_LOGGED_IN_KEY',
  'WP_NONCE_KEY',
  'WP_AUTH_SALT',
  'WP_SECURE_AUTH_SALT',
  'WP_LOGGED_IN_SALT',
  'WP_NONCE_SALT',
];

let generatedCount = 0;
for (const key of saltKeys) {
  const value = prodEnv.get(key);
  if (!value || !value.trim()) {
    prodEnv.set(key, randomToken());
    generatedCount++;
  }
}

// Validate production requirements
const siteUrl = prodEnv.get('SITE_URL');
if (!siteUrl || siteUrl.includes('localhost')) {
  console.warn('⚠️  SITE_URL not set or still uses localhost. Set PROD_SITE_URL environment variable.');
}

const dbPassword = prodEnv.get('WP_DB_PASSWORD');
if (!dbPassword || dbPassword === 'wordpress') {
  console.warn('⚠️  WP_DB_PASSWORD is using default value. Set PROD_WP_DB_PASSWORD environment variable.');
}

const adminPassword = prodEnv.get('WP_ADMIN_PASSWORD');
if (!adminPassword || adminPassword === 'admin') {
  console.warn('⚠️  WP_ADMIN_PASSWORD is using default value. Set PROD_WP_ADMIN_PASSWORD environment variable.');
}

// Write production .env
writeDotEnv(envPath, prodEnv);

console.log(`✓ .env created from .env.example`);
console.log(`✓ ${injectedCount} secret(s) injected from environment variables`);
console.log(`✓ ${generatedCount} security key(s) auto-generated\n`);

console.log('='.repeat(60));
console.log('✅ Production .env is ready');
console.log('='.repeat(60));
