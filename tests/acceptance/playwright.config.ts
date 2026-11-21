import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { ADMIN_STATE, SITE_URL } from './helpers/wp';

// The Local site is already running, so there is no webServer. Tests share one
// WordPress site and create pages on it, so they run serially.
export default defineConfig( {
	testDir: __dirname,
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 60_000,
	expect: { timeout: 10_000 },
	reporter: [ [ 'list' ] ],
	outputDir: path.join( __dirname, '../../test-results' ),
	use: {
		baseURL: SITE_URL,
		locale: 'en-US',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [
		{ name: 'setup', testMatch: /global\.setup\.ts/, teardown: 'teardown' },
		{ name: 'teardown', testMatch: /global\.teardown\.ts/ },
		{
			name: 'frontend',
			testMatch: /(search|facets|settings)\.spec\.ts/,
			dependencies: [ 'setup' ],
			use: { ...devices[ 'Desktop Chrome' ] },
		},
		{
			name: 'editor',
			testMatch: /editor\.spec\.ts/,
			dependencies: [ 'setup' ],
			use: { ...devices[ 'Desktop Chrome' ], storageState: ADMIN_STATE },
		},
	],
} );
