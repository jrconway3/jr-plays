#!/usr/bin/env node
/**
 * WordPress URL Validation Test
 * Tests all major WordPress URL patterns to ensure rewrite rules work correctly
 * 
 * Usage: npm run test:urls
 */

import { spawnSync } from 'child_process';
import { dockerEnvPath, envPath, readDotEnv } from './lib.mjs';

function getEnvValue(key) {
	if (process.env[key]) {
		return process.env[key];
	}

	const envValues = readDotEnv(envPath());
	if (envValues.has(key)) {
		return envValues.get(key);
	}

	const dockerValues = readDotEnv(dockerEnvPath());
	if (dockerValues.has(key)) {
		return dockerValues.get(key);
	}

	return '';
}

function resolveSiteUrl() {
	const configuredUrl = getEnvValue('SITE_URL') || 'jrconway.localhost';
	const appPort = getEnvValue('APP_PORT') || '80';

	if (/^https?:\/\//i.test(configuredUrl)) {
		return configuredUrl;
	}

	let siteUrl = `http://${configuredUrl}`;
	if (appPort && !['80', '443'].includes(appPort) && !configuredUrl.includes(':')) {
		siteUrl += `:${appPort}`;
	}

	return siteUrl;
}

const SITE_URL = resolveSiteUrl();
const TIMEOUT = 5000;
const UA = 'WordPress-URL-Validator/1.0';

let passed = 0;
let failed = 0;
const results = [];

/**
 * Test a URL and verify it returns expected status
 */
async function testUrl(path, description, expectedStatus = 200) {
	const url = `${SITE_URL}${path}`;
	
	try {
		const response = await fetch(url, {
			method: 'HEAD',
			signal: AbortSignal.timeout(TIMEOUT),
			headers: { 'User-Agent': UA },
			redirect: 'manual' // Don't follow redirects so we can see actual response codes
		});
		
		const status = response.status;
		const isValid = status === expectedStatus;
		
		if (isValid) {
			passed++;
			results.push({ status: '✅', path, description, code: status });
		} else {
			failed++;
			results.push({ status: '❌', path, description, expected: expectedStatus, actual: status });
		}
	} catch (error) {
		failed++;
		results.push({ status: '❌', path, description, error: error.message });
	}
}

/**
 * Get real WordPress URLs from database to test
 */
async function getWordPressUrls() {
	const cmd = spawnSync('docker', [
		'compose', '--env-file', '.env.docker', 'exec', '-T', 'app',
		'wp', 'post', 'list', '--post_type=any', '--format=json', '--fields=ID,post_name,post_type,post_parent'
	], { encoding: 'utf-8', cwd: process.cwd() });
	
	if (cmd.error || cmd.status !== 0) {
		console.warn('⚠️  Could not fetch posts from WP-CLI. Using hardcoded test URLs instead.');
		return [];
	}
	
	try {
		return JSON.parse(cmd.stdout);
	} catch {
		return [];
	}
}

/**
 * Build URL paths from WordPress posts
 */
function buildPostUrls(posts) {
	const urls = [];
	const samplePosts = posts.slice(0, 5); // Test first 5 posts only
	
	for (const post of samplePosts) {
		if (post.post_name && post.post_type === 'post') {
			// Standard post URL with date
			urls.push({
				path: `/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${post.post_name}/`,
				description: `Single post: ${post.post_name}`
			});
		}
	}
	
	return urls;
}

/**
 * Run all URL tests
 */
async function runTests() {
	console.log(`\n🧪 WordPress URL Validation Tests`);
	console.log(`📍 Testing against: ${SITE_URL}`);
	console.log(`⏱️  Timeout: ${TIMEOUT}ms\n`);
	
	// Core WordPress URLs (should all exist)
	const requiredUrls = [
		{ path: '/', description: 'Home page' },
		{ path: '/page/1/', description: 'Paginated page 1' },
		{ path: '/page/2/', description: 'Paginated page 2' },
		{ path: '/page/3/', description: 'Paginated page 3' },
		{ path: '/wp-admin/', description: 'Admin dashboard', expectedStatus: 302 }, // Redirect to login/dashboard
		{ path: '/wp-json/', description: 'REST API root' },
	];
	
	console.log('📋 Testing core WordPress URLs...\n');
	for (const test of requiredUrls) {
		await testUrl(test.path, test.description, test.expectedStatus);
	}
	
	// Try to fetch real post URLs from database
	console.log('\n📋 Fetching real posts from database...\n');
	const posts = await getWordPressUrls();
	
	if (posts.length > 0) {
		const postUrls = buildPostUrls(posts);
		console.log(`📋 Testing ${postUrls.length} real post URLs...\n`);
		for (const test of postUrls) {
			await testUrl(test.path, test.description);
		}
	}
	
	// Common archive URLs (may or may not exist depending on content)
	console.log('\n📋 Testing archive/taxonomy URLs...\n');
	const archiveUrls = [
		{ path: '/category/general/', description: 'Category archive (general)' },
		{ path: '/tag/sample/', description: 'Tag archive (sample)' },
		{ path: '/2024/', description: 'Year archive' },
		{ path: '/2024/01/', description: 'Month archive' },
	];
	
	for (const test of archiveUrls) {
		// These might 404 if no posts exist, so we accept both 200 and 404
		try {
			const response = await fetch(`${SITE_URL}${test.path}`, {
				method: 'HEAD',
				signal: AbortSignal.timeout(TIMEOUT),
				headers: { 'User-Agent': UA },
				redirect: 'manual'
			});
			
			const isValid = [200, 404].includes(response.status);
			
			if (isValid) {
				if (response.status === 200) {
					passed++;
					results.push({ status: '✅', path: test.path, description: test.description, code: response.status });
				} else {
					results.push({ status: '⏸️ ', path: test.path, description: test.description, code: 404, note: 'No content found (expected if no posts)' });
				}
			} else {
				failed++;
				results.push({ status: '❌', path: test.path, description: test.description, code: response.status });
			}
		} catch (error) {
			failed++;
			results.push({ status: '❌', path: test.path, description: test.description, error: error.message });
		}
	}
	
	// Print results
	console.log('\n' + '='.repeat(80));
	console.log('TEST RESULTS');
	console.log('='.repeat(80) + '\n');
	
	for (const result of results) {
		const details = [];
		details.push(`${result.status} ${result.path}`);
		details.push(`   → ${result.description}`);
		
		if (result.code) {
			details.push(`   HTTP ${result.code}`);
		}
		if (result.expected) {
			details.push(`   (expected: ${result.expected}, got: ${result.actual})`);
		}
		if (result.error) {
			details.push(`   Error: ${result.error}`);
		}
		if (result.note) {
			details.push(`   ${result.note}`);
		}
		
		console.log(details.join('\n'));
	}
	
	console.log('\n' + '='.repeat(80));
	console.log(`✅ Passed: ${passed} | ❌ Failed: ${failed}`);
	console.log('='.repeat(80) + '\n');
	
	// Exit with error code if tests failed
	process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
	console.error('Fatal test error:', error);
	process.exit(1);
});
