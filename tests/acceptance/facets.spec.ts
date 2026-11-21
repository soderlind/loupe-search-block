import { test, expect } from '@playwright/test';
import { KEYWORD, PAGE_TITLES, SearchBlock, createBlockPage, deletePages } from './helpers/wp';

let blockPage: { id: number; url: string };

test.beforeAll( () => {
	blockPage = createBlockPage( 'LSB acceptance facets' );
} );

test.afterAll( () => {
	deletePages( [ blockPage.id ] );
} );

async function searchPosts( block: SearchBlock ): Promise< void > {
	await block.open( blockPage.url );
	await block.search( KEYWORD );
	await block.expectCount( 14 );
	await block.select( 'Type' ).selectOption( { label: 'Posts' } );
	await block.expectCount( 12 );
}

test.describe( 'Facets', () => {
	test( 'AC-11 the category facet shows counts and narrows the results', async ( { page } ) => {
		const block = new SearchBlock( page );
		await searchPosts( block );
		await expect( block.option( 'Categories', 'Acc Alpha' ) ).toHaveAccessibleName( 'Acc Alpha 7' );
		await expect( block.option( 'Categories', 'Acc Beta' ) ).toHaveAccessibleName( 'Acc Beta 5' );

		await block.option( 'Categories', 'Acc Alpha' ).check();
		await block.expectCount( 7 );
		await expect( block.option( 'Categories', 'Acc Alpha' ) ).toBeChecked();

		await block.option( 'Categories', 'Acc Alpha' ).uncheck();
		await block.expectCount( 12 );
	} );

	test( 'AC-12 values combine with OR within a facet and AND across facets', async ( { page } ) => {
		const block = new SearchBlock( page );
		await searchPosts( block );

		await block.option( 'Categories', 'Acc Alpha' ).check();
		await block.expectCount( 7 );
		// Other values of a field stay available after one is checked.
		await expect( block.option( 'Categories', 'Acc Beta' ) ).toHaveAccessibleName( 'Acc Beta 5' );
		await block.option( 'Categories', 'Acc Beta' ).check();
		await block.expectCount( 12 );

		await block.option( 'Categories', 'Acc Beta' ).uncheck();
		await block.expectCount( 7 );
		await block.option( 'Tags', 'acc-red' ).check();
		await block.expectCount( 2 );
		expect( ( await block.titleTexts() ).sort() ).toEqual( [ 'Zephyrlupe Apple', 'Zephyrlupe Banana' ] );
	} );

	test( 'AC-13 the author facet shows names and filters under All types', async ( { page } ) => {
		const block = new SearchBlock( page );
		await block.open( blockPage.url );
		await block.search( KEYWORD );
		await block.expectCount( 14 );

		const authors = block.facet( 'Authors' );
		await expect( authors.getByRole( 'checkbox' ) ).toHaveCount( 2 );
		await expect( block.option( 'Authors', 'per' ) ).toHaveAccessibleName( 'per 10' );
		await expect( block.option( 'Authors', 'pertest' ) ).toHaveAccessibleName( 'pertest 4' );
		await expect( block.facet( 'Categories' ) ).toHaveCount( 0 );

		await block.option( 'Authors', 'pertest' ).check();
		await block.expectCount( 4 );
	} );

	test( 'AC-14 the custom field facet filters the results', async ( { page } ) => {
		const block = new SearchBlock( page );
		await searchPosts( block );
		await expect( block.option( 'Fakerpress Flag', 'acc-yes' ) ).toHaveAccessibleName( 'acc-yes 3' );
		await block.option( 'Fakerpress Flag', 'acc-yes' ).check();
		await block.expectCount( 3 );
	} );

	test( 'AC-15 switching to Pages drops post-only facets and their selections', async ( { page } ) => {
		const block = new SearchBlock( page );
		await searchPosts( block );
		await block.option( 'Categories', 'Acc Alpha' ).check();
		await block.expectCount( 7 );

		await block.select( 'Type' ).selectOption( { label: 'Pages' } );
		await block.expectCount( 2 );
		expect( ( await block.titleTexts() ).sort() ).toEqual( PAGE_TITLES );
		await expect( block.facet( 'Categories' ) ).toHaveCount( 0 );
		await expect( block.facet( 'Tags' ) ).toHaveCount( 0 );

		// The dropped selection does not come back with Posts.
		await block.select( 'Type' ).selectOption( { label: 'Posts' } );
		await block.expectCount( 12 );
		await expect( block.option( 'Categories', 'Acc Alpha' ) ).not.toBeChecked();
	} );
} );
