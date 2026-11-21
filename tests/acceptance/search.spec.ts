import { test, expect } from '@playwright/test';
import { ALL_TITLES, KEYWORD, PAGE_TITLES, POST_TITLES, SearchBlock, createBlockPage, deletePages } from './helpers/wp';

const pages: Record< string, { id: number; url: string } > = {};

test.beforeAll( () => {
	pages.basic = createBlockPage( 'LSB acceptance basic' );
	pages.noHighlight = createBlockPage( 'LSB acceptance no highlight', { highlight: false } );
	pages.noExcerpt = createBlockPage( 'LSB acceptance no excerpt', { showExcerpt: false } );
	pages.titleDesc = createBlockPage( 'LSB acceptance title desc', { defaultSort: 'title_desc' } );
	pages.dates = createBlockPage( 'LSB acceptance dates', { showDateFilter: true } );
	pages.paged = createBlockPage( 'LSB acceptance paged', { perPage: 5 } );
} );

test.afterAll( () => {
	deletePages( Object.values( pages ).map( ( p ) => p.id ) );
} );

const sorted = [ ...ALL_TITLES ].sort();

test.describe( 'Search basics', () => {
	test( 'AC-01 typing the keyword shows live results and a count', async ( { page } ) => {
		const block = new SearchBlock( page );
		await block.open( pages.basic.url );
		await block.search( KEYWORD );
		await block.expectCount( 14 );
		for ( const title of await block.titleTexts() ) {
			expect( ALL_TITLES ).toContain( title );
		}
	} );

	test( 'AC-02 pressing Enter shows the results', async ( { page } ) => {
		const block = new SearchBlock( page );
		await block.open( pages.basic.url );
		await block.input.pressSequentially( KEYWORD );
		await block.input.press( 'Enter' );
		await block.expectCount( 14 );
		await expect( page ).toHaveURL( pages.basic.url );
	} );

	test( 'AC-03 a query without matches shows "No results found."', async ( { page } ) => {
		const block = new SearchBlock( page );
		await block.open( pages.basic.url );
		await block.search( 'qqxyzzyplugh' );
		await expect( block.status ).toHaveText( 'No results found.' );
		await expect( block.results ).toHaveCount( 0 );
	} );

	test( 'AC-04 clearing the input hides the results and the status', async ( { page } ) => {
		const block = new SearchBlock( page );
		await block.open( pages.basic.url );
		await block.search( KEYWORD );
		await block.expectCount( 14 );
		await block.input.fill( '' );
		await expect( block.status ).toHaveText( '' );
		await expect( block.results.first() ).toBeHidden();
	} );

	test( 'AC-05 matches are highlighted in titles and excerpts', async ( { page } ) => {
		const block = new SearchBlock( page );
		await block.open( pages.basic.url );
		await block.search( KEYWORD );
		await block.expectCount( 14 );
		const first = block.results.first();
		await expect( first.getByRole( 'link' ).locator( 'mark' ) ).toHaveText( /zephyrlupe/i );
		await expect( first.getByRole( 'paragraph' ).locator( 'mark' ) ).toHaveText( /zephyrlupe/i );
	} );

	test( 'AC-06 highlight off shows no marks; excerpt off shows no excerpt', async ( { page } ) => {
		const block = new SearchBlock( page );
		await block.open( pages.noHighlight.url );
		await block.search( KEYWORD );
		await block.expectCount( 14 );
		await expect( block.results.first().getByRole( 'paragraph' ) ).toContainText( /zephyrlupe/i );
		await expect( block.root.locator( 'mark' ) ).toHaveCount( 0 );

		await block.open( pages.noExcerpt.url );
		await block.search( KEYWORD );
		await block.expectCount( 14 );
		await expect( block.results.first().getByRole( 'link' ).locator( 'mark' ) ).toHaveText( /zephyrlupe/i );
		await expect( block.results.getByRole( 'paragraph' ) ).toHaveCount( 0 );
	} );
} );

test.describe( 'Type filter and sorting', () => {
	test( 'AC-07 the type filter narrows results to one post type', async ( { page } ) => {
		const block = new SearchBlock( page );
		await block.open( pages.basic.url );
		await block.search( KEYWORD );
		await block.expectCount( 14 );

		await block.select( 'Type' ).selectOption( { label: 'Pages' } );
		await block.expectCount( 2 );
		expect( ( await block.titleTexts() ).sort() ).toEqual( PAGE_TITLES );

		await block.select( 'Type' ).selectOption( { label: 'Posts' } );
		await block.expectCount( 12 );
		for ( const title of await block.titleTexts() ) {
			expect( POST_TITLES ).toContain( title );
		}

		await block.select( 'Type' ).selectOption( { label: 'All types' } );
		await block.expectCount( 14 );
	} );

	test( 'AC-08 title sorts order results alphabetically', async ( { page } ) => {
		const block = new SearchBlock( page );
		await block.open( pages.basic.url );
		await block.search( KEYWORD );
		await block.expectCount( 14 );

		await block.select( 'Sort by' ).selectOption( { label: 'Title A–Z' } );
		await expect( block.titles ).toHaveText( sorted.slice( 0, 10 ) );

		await block.select( 'Sort by' ).selectOption( { label: 'Title Z–A' } );
		await expect( block.titles ).toHaveText( [ ...sorted ].reverse().slice( 0, 10 ) );
	} );

	test( 'AC-09 date sorts order results by publish date', async ( { page } ) => {
		const block = new SearchBlock( page );
		await block.open( pages.basic.url );
		await block.search( KEYWORD );
		await block.expectCount( 14 );

		// ALL_TITLES is in ascending publish-date order.
		await block.select( 'Sort by' ).selectOption( { label: 'Newest first' } );
		await expect( block.titles ).toHaveText( [ ...ALL_TITLES ].reverse().slice( 0, 10 ) );

		await block.select( 'Sort by' ).selectOption( { label: 'Oldest first' } );
		await expect( block.titles ).toHaveText( ALL_TITLES.slice( 0, 10 ) );
	} );

	test( 'AC-10 the default sort is preselected and applied', async ( { page } ) => {
		const block = new SearchBlock( page );
		await block.open( pages.titleDesc.url );
		await expect( block.select( 'Sort by' ) ).toHaveValue( 'title_desc' );
		await block.search( KEYWORD );
		await block.expectCount( 14 );
		await expect( block.titles.first() ).toHaveText( sorted[ sorted.length - 1 ] );
	} );
} );

test.describe( 'Date range, pagination and fallbacks', () => {
	test( 'AC-16 the date range narrows results and includes the whole To day', async ( { page } ) => {
		const block = new SearchBlock( page );
		await block.open( pages.dates.url );
		await block.search( KEYWORD );
		await block.expectCount( 14 );

		await block.select( 'From' ).fill( '2020-03-01' );
		await block.select( 'To' ).fill( '2020-05-15' );
		await block.expectCount( 3 );
		expect( ( await block.titleTexts() ).sort() ).toEqual( [ 'Zephyrlupe Cherry', 'Zephyrlupe Date', 'Zephyrlupe Elder' ] );
	} );

	test( 'AC-17 pagination moves between result pages', async ( { page } ) => {
		const block = new SearchBlock( page );
		const pager = block.root.getByRole( 'navigation', { name: 'Search results pages' } );
		const prev = pager.getByRole( 'button', { name: 'Previous' } );
		const next = pager.getByRole( 'button', { name: 'Next' } );

		await block.open( pages.paged.url );
		await block.search( KEYWORD );
		await block.expectCount( 14, 5 );
		await expect( pager ).toContainText( 'Page 1 of 3' );
		await expect( prev ).toBeDisabled();

		// A title sort makes the page contents predictable.
		await block.select( 'Sort by' ).selectOption( { label: 'Title A–Z' } );
		await expect( block.titles ).toHaveText( sorted.slice( 0, 5 ) );

		await next.click();
		await expect( pager ).toContainText( 'Page 2 of 3' );
		await expect( block.titles ).toHaveText( sorted.slice( 5, 10 ) );
		await expect( prev ).toBeEnabled();

		await next.click();
		await expect( pager ).toContainText( 'Page 3 of 3' );
		await expect( block.titles ).toHaveText( sorted.slice( 10 ) );
		await expect( next ).toBeDisabled();

		await prev.click();
		await expect( pager ).toContainText( 'Page 2 of 3' );
		await expect( block.titles ).toHaveText( sorted.slice( 5, 10 ) );
	} );

	test( 'AC-18 changing the sort or a facet returns to page 1', async ( { page } ) => {
		const block = new SearchBlock( page );
		const pager = block.root.getByRole( 'navigation', { name: 'Search results pages' } );

		await block.open( pages.paged.url );
		await block.search( KEYWORD );
		await block.expectCount( 14, 5 );
		await pager.getByRole( 'button', { name: 'Next' } ).click();
		await expect( pager ).toContainText( 'Page 2 of 3' );

		await block.select( 'Sort by' ).selectOption( { label: 'Title A–Z' } );
		await expect( pager ).toContainText( 'Page 1 of 3' );
		await expect( block.titles ).toHaveText( sorted.slice( 0, 5 ) );

		await pager.getByRole( 'button', { name: 'Next' } ).click();
		await expect( pager ).toContainText( 'Page 2 of 3' );
		await block.option( 'Authors', 'per' ).check();
		await block.expectCount( 10, 5 );
		await expect( pager ).toContainText( 'Page 1 of 2' );
	} );

	test.describe( 'without JavaScript', () => {
		test.use( { javaScriptEnabled: false } );

		test( 'AC-19 the form submits to the site search page', async ( { page } ) => {
			await page.goto( pages.basic.url );
			const block = new SearchBlock( page );
			await block.input.fill( KEYWORD );
			await block.root.getByRole( 'button', { name: 'Search' } ).click();
			await expect( page ).toHaveURL( /\/loupe\/\?s=zephyrlupe$/ );
		} );
	} );

	test( 'AC-20 a failing search endpoint shows an error message', async ( { page } ) => {
		await page.route( ( url ) => url.href.includes( 'loupe-search/v1/search' ), ( route ) =>
			route.fulfill( { status: 500, contentType: 'application/json', body: '{"code":"boom"}' } )
		);
		const block = new SearchBlock( page );
		await block.open( pages.basic.url );
		await block.search( KEYWORD );
		await expect( block.status ).toHaveText( 'Search is not available right now. Please try again.' );
		await expect( block.results ).toHaveCount( 0 );
	} );
} );
