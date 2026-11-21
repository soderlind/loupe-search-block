import { test, expect } from '@playwright/test';
import { KEYWORD, SearchBlock, createBlockPage, deletePages } from './helpers/wp';

const pages: Record< string, { id: number; url: string } > = {};

test.beforeAll( () => {
	pages.allOff = createBlockPage( 'LSB acceptance all off', {
		label: 'Find fixtures',
		placeholder: 'Type a fruit',
		showTypeFilter: false,
		showSort: false,
		showFacets: false,
		showAuthorFilter: false,
		showCustomFields: false,
		showDateFilter: false,
	} );
	pages.taxonomyOff = createBlockPage( 'LSB acceptance taxonomy off', { showFacets: false } );
	pages.authorOff = createBlockPage( 'LSB acceptance author off', { showAuthorFilter: false } );
	pages.customOff = createBlockPage( 'LSB acceptance custom off', { showCustomFields: false } );
	pages.allOn = createBlockPage( 'LSB acceptance all on', { showDateFilter: true } );
} );

test.afterAll( () => {
	deletePages( Object.values( pages ).map( ( p ) => p.id ) );
} );

async function postFacets( block: SearchBlock, url: string ): Promise< string[] > {
	await block.open( url );
	await block.search( KEYWORD );
	await block.expectCount( 14 );
	await block.select( 'Type' ).selectOption( { label: 'Posts' } );
	await block.expectCount( 12 );
	return block.root.getByRole( 'group' ).evaluateAll( ( groups ) =>
		groups.map( ( g ) => g.querySelector( 'legend' )?.textContent?.trim() ?? '' ).filter( ( l ) => l && l !== 'Published' )
	);
}

test.describe( 'Block settings', () => {
	test( 'AC-21 label, placeholder and the show toggles control what visitors see', async ( { page } ) => {
		const block = new SearchBlock( page );

		await block.open( pages.allOn.url );
		await expect( block.select( 'Type' ) ).toBeVisible();
		await expect( block.select( 'Sort by' ) ).toBeVisible();
		await expect( block.root.getByRole( 'group', { name: 'Published' } ) ).toBeVisible();

		await block.open( pages.allOff.url );
		await expect( block.root.getByText( 'Find fixtures', { exact: true } ) ).toBeVisible();
		await expect( block.root.getByRole( 'searchbox', { name: 'Find fixtures' } ) ).toHaveAttribute( 'placeholder', 'Type a fruit' );
		await expect( block.select( 'Type' ) ).toHaveCount( 0 );
		await expect( block.select( 'Sort by' ) ).toHaveCount( 0 );
		await expect( block.root.getByRole( 'group', { name: 'Published' } ) ).toHaveCount( 0 );
		await block.search( KEYWORD );
		await block.expectCount( 14 );
		await expect( block.root.getByRole( 'checkbox' ) ).toHaveCount( 0 );

		expect( await postFacets( block, pages.allOn.url ) ).toEqual( [ 'Categories', 'Tags', 'Authors', 'Fakerpress Flag' ] );
		expect( await postFacets( block, pages.taxonomyOff.url ) ).toEqual( [ 'Authors', 'Fakerpress Flag' ] );
		expect( await postFacets( block, pages.authorOff.url ) ).toEqual( [ 'Categories', 'Tags', 'Fakerpress Flag' ] );
		expect( await postFacets( block, pages.customOff.url ) ).toEqual( [ 'Categories', 'Tags', 'Authors' ] );
	} );
} );
