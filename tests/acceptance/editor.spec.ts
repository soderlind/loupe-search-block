import { test, expect, type Page } from '@playwright/test';
import { SearchBlock, deletePages, wp } from './helpers/wp';

const TITLE = 'LSB acceptance editor';

test.afterAll( () => {
	const ids = wp( 'post', 'list', '--post_type=page', '--post_status=any', `--title=${ TITLE }`, '--field=ID' ).split( /\s+/ ).filter( Boolean ).map( Number );
	deletePages( ids );
} );

/** Close the starter-pattern modal whenever it shows up; it opens late and at random times. */
async function dismissModals( page: Page ): Promise< void > {
	const patterns = page.getByRole( 'dialog', { name: 'Choose a pattern' } );
	await page.addLocatorHandler( patterns, async () => {
		await patterns.getByRole( 'button', { name: 'Close' } ).click();
	} );
}

test.describe( 'Block editor', () => {
	test( 'AC-22 the editor configures the block and the front end follows', async ( { page } ) => {
		await dismissModals( page );
		await page.goto( 'wp-admin/post-new.php?post_type=page' );
		await page.waitForFunction( () => ( window as any ).wp?.data?.select( 'core/editor' )?.getCurrentPostId() );

		const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
		await canvas.getByRole( 'textbox', { name: 'Add title' } ).fill( TITLE );

		const inserter = page.getByRole( 'region', { name: 'Block Library' } );
		if ( ! ( await inserter.isVisible() ) ) {
			await page.getByRole( 'button', { name: 'Block Inserter', exact: true } ).click();
		}
		await inserter.getByRole( 'searchbox' ).fill( 'Loupe Search' );
		await inserter.getByRole( 'option', { name: /Loupe Search$/ } ).click();

		const preview = canvas.getByRole( 'group', { name: 'Search block preview' } );
		await expect( preview ).toBeVisible();

		const settings = page.getByRole( 'region', { name: 'Editor settings' } );
		for ( const panel of [ 'Search', 'Filters', 'Sorting', 'Results' ] ) {
			await expect( settings.getByRole( 'button', { name: panel, exact: true } ) ).toBeVisible();
		}

		await settings.getByRole( 'textbox', { name: 'Label' } ).fill( 'Editor label' );
		await expect( preview ).toContainText( 'Editor label' );

		await expect( preview.getByRole( 'combobox', { name: /sort/i } ) ).toBeVisible();
		await settings.getByRole( 'checkbox', { name: 'Sort options' } ).uncheck();
		await expect( preview.getByRole( 'combobox', { name: /sort/i } ) ).toHaveCount( 0 );

		await page.getByRole( 'region', { name: 'Editor top bar' } ).getByRole( 'button', { name: 'Publish', exact: true } ).click();
		await page.getByRole( 'region', { name: 'Editor publish' } ).getByRole( 'button', { name: 'Publish', exact: true } ).click();
		await expect( page.getByRole( 'region', { name: 'Editor publish' } ).getByText( /is now live/i ) ).toBeVisible();
		const url = await page.evaluate( () => ( window as any ).wp.data.select( 'core/editor' ).getPermalink() as string );

		const block = new SearchBlock( page );
		await block.open( url );
		await expect( block.root.getByRole( 'searchbox', { name: 'Editor label' } ) ).toBeVisible();
		await expect( block.select( 'Sort by' ) ).toHaveCount( 0 );
		await expect( block.select( 'Type' ) ).toBeVisible();
	} );
} );
