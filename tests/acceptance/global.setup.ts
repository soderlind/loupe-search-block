import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import { ADMIN_STATE, AUTH_DIR, pauseHybrid, seed } from './helpers/wp';

setup( 'seed fixtures and field settings', () => {
	fs.mkdirSync( AUTH_DIR, { recursive: true } );
	seed();
} );

// Semantic hits make result counts depend on embeddings; keyword search keeps them deterministic.
setup( 'pause hybrid semantic search', () => {
	pauseHybrid();
} );

// Local's one-click admin login; no passwords.
setup( 'log in as the Local one-click admin', async ( { page } ) => {
	await page.goto( 'http://plugins.local/wp-admin/?localwp_auto_login=1' );
	await page.goto( 'wp-admin/' );
	await expect( page.locator( '#wpadminbar' ) ).toContainText( 'per' );
	await page.context().storageState( { path: ADMIN_STATE } );
} );
