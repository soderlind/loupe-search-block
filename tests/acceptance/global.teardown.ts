import { test as teardown } from '@playwright/test';
import { restoreHybrid } from './helpers/wp';

teardown( 'restore hybrid semantic search', () => {
	restoreHybrid();
} );
