import {
	buildFacetGroups,
	buildPayload,
	dateRangeItems,
	decodeEntities,
	format,
	normalizeQuery,
	profileFor,
	pruneSelected,
	selectedValues,
	sanitizeHighlight,
	toResult,
} from '../../src/search/lib';

const profiles = {
	all: { facets: [], sorts: [ 'relevance', 'newest', 'oldest' ], date: true },
	post: {
		facets: [ 'taxonomy_category', 'taxonomy_post_tag', 'post_author' ],
		sorts: [ 'relevance', 'newest', 'oldest', 'title_asc', 'title_desc' ],
		date: true,
	},
	page: { facets: [], sorts: [ 'relevance' ], date: false },
};

const baseCtx = {
	q: ' Hello ',
	postType: 'all',
	sort: 'relevance',
	page: 2,
	perPage: 5,
	profiles,
	selected: {},
	showDate: false,
	dateFrom: '',
	dateTo: '',
	highlight: true,
	showExcerpt: true,
};

describe( 'normalizeQuery', () => {
	it( 'trims, lowercases and collapses whitespace', () => {
		expect( normalizeQuery( '  Hello   World ' ) ).toBe( 'hello world' );
		expect( normalizeQuery( undefined ) ).toBe( '' );
	} );
} );

describe( 'profileFor', () => {
	it( 'falls back to "all" and then to relevance only', () => {
		expect( profileFor( profiles, 'movie' ) ).toBe( profiles.all );
		expect( profileFor( undefined, 'post' ) ).toEqual( {
			facets: [],
			sorts: [ 'relevance' ],
			date: false,
		} );
	} );
} );

describe( 'buildPayload', () => {
	it( 'searches all types with relevance, highlighting and no count by default', () => {
		const payload = buildPayload( baseCtx );
		expect( payload ).toEqual( {
			q: 'Hello',
			postTypes: 'all',
			page: { number: 2, size: 5 },
			attributesToHighlight: [ 'post_title', 'post_content' ],
			highlightStartTag: '<mark>',
			highlightEndTag: '</mark>',
			attributesToCrop: [ 'post_content' ],
			cropLength: 30,
		} );
	} );

	it( 'sends facets, an "in" filter and the sort for a single post type', () => {
		const payload = buildPayload( {
			...baseCtx,
			postType: 'post',
			sort: 'title_desc',
			selected: {
				taxonomy_category: [ 'News' ],
				taxonomy_post_tag: [],
				post_author: [ '14' ],
			},
		} );
		expect( payload.postTypes ).toEqual( [ 'post' ] );
		expect( payload.sort ).toEqual( [
			{ by: 'post_title', order: 'desc' },
		] );
		expect( payload.filter ).toEqual( {
			type: 'and',
			items: [
				{
					type: 'pred',
					field: 'taxonomy_category',
					op: 'in',
					value: [ 'News' ],
				},
				{
					type: 'pred',
					field: 'post_author',
					op: 'in',
					value: [ '14' ],
				},
			],
		} );
		expect( payload.facets.map( ( f ) => f.field ) ).toEqual( [
			'taxonomy_category',
			'taxonomy_post_tag',
			'post_author',
		] );
	} );

	it( 'drops a sort the selection does not allow', () => {
		expect(
			buildPayload( { ...baseCtx, sort: 'title_asc' } ).sort
		).toBeUndefined();
	} );

	it( 'omits facets when the profile has none', () => {
		const payload = buildPayload( {
			...baseCtx,
			selected: { taxonomy_category: [ 'News' ] },
		} );
		expect( payload.facets ).toBeUndefined();
		expect( payload.filter ).toBeUndefined();
	} );

	it( 'adds the date range when the date filter is shown and allowed', () => {
		const ctx = {
			...baseCtx,
			showDate: true,
			dateFrom: '2026-01-01',
			dateTo: '2026-06-30',
		};
		expect( buildPayload( ctx ).filter ).toEqual( {
			type: 'and',
			items: [
				{
					type: 'pred',
					field: 'post_date',
					op: 'gte',
					value: '2026-01-01',
				},
				{
					type: 'pred',
					field: 'post_date',
					op: 'lte',
					value: '2026-06-30 23:59:59',
				},
			],
		} );
		expect(
			buildPayload( { ...ctx, showDate: false } ).filter
		).toBeUndefined();
		expect(
			buildPayload( { ...ctx, postType: 'page' } ).filter
		).toBeUndefined();
	} );

	it( 'does not highlight or crop when highlighting is off', () => {
		const payload = buildPayload( { ...baseCtx, highlight: false } );
		expect( payload.attributesToHighlight ).toBeUndefined();
		expect( payload.attributesToCrop ).toBeUndefined();
	} );

	it( 'builds a light count-only request', () => {
		const payload = buildPayload(
			{
				...baseCtx,
				postType: 'post',
				selected: { taxonomy_category: [ 'News' ] },
			},
			{ countSearch: true, size: 1 }
		);
		expect( payload.countSearch ).toBe( true );
		expect( payload.page ).toEqual( { number: 1, size: 1 } );
		expect( payload.filter ).toBeDefined();
		expect( payload.facets ).toBeUndefined();
		expect( payload.attributesToHighlight ).toBeUndefined();
	} );
} );

describe( 'dateRangeItems', () => {
	it( 'uses only valid dates and makes the end date inclusive', () => {
		expect( dateRangeItems( '', '' ) ).toEqual( [] );
		expect( dateRangeItems( 'yesterday', '2026-2-1' ) ).toEqual( [] );
		expect( dateRangeItems( '', '2026-02-01' ) ).toEqual( [
			{
				type: 'pred',
				field: 'post_date',
				op: 'lte',
				value: '2026-02-01 23:59:59',
			},
		] );
	} );
} );

describe( 'pruneSelected', () => {
	it( 'ignores inherited and non-array selections for custom fields', () => {
		const fields = [ 'constructor', 'toString', '__proto__' ];
		const selected = {};
		const facets = Object.fromEntries(
			fields.map( ( field ) => [
				field,
				{ buckets: [ { value: 'A', count: 1 } ] },
			] )
		);
		fields.forEach( ( field ) => {
			expect( selectedValues( selected, field ) ).toEqual( [] );
		} );
		expect(
			selectedValues( { constructor: 'bad' }, 'constructor' )
		).toEqual( [] );
		expect( pruneSelected( selected, fields ) ).toEqual( {} );
		const ctx = {
			...baseCtx,
			profiles: { all: { facets: fields, sorts: [ 'relevance' ] } },
		};
		expect( buildPayload( ctx ).filter ).toBeUndefined();
		expect(
			buildFacetGroups( fields, facets, selected, {} ).map(
				( g ) => g.label
			)
		).toEqual( fields );
		const own = Object.fromEntries(
			fields.map( ( field ) => [ field, [ 'A' ] ] )
		);
		expect( pruneSelected( own, fields ) ).toEqual( own );
		expect(
			buildPayload( { ...ctx, selected: own } ).filter.items
		).toHaveLength( 3 );
		expect( buildFacetGroups( fields, {}, own, {} ) ).toHaveLength( 3 );
	} );

	it( 'keeps only non-empty selections for allowed fields', () => {
		expect(
			pruneSelected(
				{
					taxonomy_category: [ 'News' ],
					taxonomy_post_tag: [],
					other: [ 'x' ],
				},
				[ 'taxonomy_category', 'taxonomy_post_tag' ]
			)
		).toEqual( { taxonomy_category: [ 'News' ] } );
	} );
} );

describe( 'buildFacetGroups', () => {
	it( 'keeps field order, skips empty groups and keeps selected values visible', () => {
		const groups = buildFacetGroups(
			[ 'taxonomy_category', 'taxonomy_post_tag' ],
			{
				taxonomy_category: {
					type: 'terms',
					buckets: [ { value: 'News', count: 3 } ],
				},
			},
			{ taxonomy_category: [ 'Sport' ] },
			{ taxonomy_category: 'Categories' }
		);
		expect( groups ).toEqual( [
			{
				field: 'taxonomy_category',
				label: 'Categories',
				buckets: [
					{ value: 'News', label: 'News', count: 3 },
					{ value: 'Sport', label: 'Sport', count: 0 },
				],
			},
		] );
	} );

	it( 'labels values, e.g. author IDs with names, and falls back to the value', () => {
		const groups = buildFacetGroups(
			[ 'post_author' ],
			{
				post_author: {
					buckets: [
						{ value: 1, count: 4 },
						{ value: '99', count: 1 },
						{ value: 'constructor', count: 1 },
					],
				},
			},
			{},
			{ post_author: 'Authors' },
			{ post_author: { 1: 'Per' } }
		);
		expect( groups[ 0 ].buckets ).toEqual( [
			{ value: '1', label: 'Per', count: 4 },
			{ value: '99', label: '99', count: 1 },
			{ value: 'constructor', label: 'constructor', count: 1 },
		] );
	} );
} );

describe( 'sanitizeHighlight', () => {
	it( 'keeps mark and em without attributes and flattens anything else', () => {
		expect(
			sanitizeHighlight(
				'<mark class="x">Hi</mark> <img src=x onerror=alert(1)><b>bold</b><script>bad()</script><em onclick="x">e</em>',
				document
			)
		).toBe( '<mark>Hi</mark> boldbad()<em>e</em>' );
	} );
} );

describe( 'toResult', () => {
	const opts = { highlight: true, showExcerpt: true, untitled: '(no title)' };

	it( 'uses sanitised highlighted fields when present', () => {
		const result = toResult(
			{
				id: 7,
				post_type: 'post',
				post_type_label: 'Posts',
				title: 'Hello',
				url: 'https://example.com/hello/',
				excerpt: 'plain',
				_formatted: {
					post_title: '<mark>Hello</mark>',
					post_content: '…say <mark>hello</mark><i>!</i>',
				},
			},
			opts,
			document
		);
		expect( result ).toEqual( {
			id: 'post:7',
			url: 'https://example.com/hello/',
			typeLabel: 'Posts',
			titleHtml: '<mark>Hello</mark>',
			excerptHtml: '…say <mark>hello</mark>!',
		} );
	} );

	it( 'escapes plain fields and decodes entities once', () => {
		const result = toResult(
			{
				id: 1,
				post_type: 'page',
				title: 'Tom &amp; Jerry&#8217;s <b>show</b>',
				excerpt: 'A &lt;tag&gt;',
			},
			{ ...opts, highlight: false },
			document
		);
		expect( result.titleHtml ).toBe(
			'Tom &amp; Jerry’s &lt;b&gt;show&lt;/b&gt;'
		);
		expect( result.excerptHtml ).toBe( 'A &lt;tag&gt;' );
	} );

	it( 'uses the plain excerpt when the content had no match to crop around', () => {
		const result = toResult(
			{
				id: 3,
				post_type: 'page',
				title: 'Hello',
				excerpt: 'Short excerpt',
				_formatted: {
					post_title: '<mark>Hello</mark>',
					post_content: 'The whole uncropped post body …',
				},
			},
			opts,
			document
		);
		expect( result.titleHtml ).toBe( '<mark>Hello</mark>' );
		expect( result.excerptHtml ).toBe( 'Short excerpt' );
	} );

	it( 'falls back to the untitled label and hides the excerpt when off', () => {
		const result = toResult(
			{ id: 2, title: '' },
			{ ...opts, showExcerpt: false },
			document
		);
		expect( result.titleHtml ).toBe( '(no title)' );
		expect( result.excerptHtml ).toBe( '' );
	} );
} );

describe( 'helpers', () => {
	it( 'decodes entities', () => {
		expect( decodeEntities( 'a &amp; b', document ) ).toBe( 'a & b' );
	} );

	it( 'formats positional and sequential placeholders', () => {
		expect( format( 'Page %1$d of %2$d', 2, 5 ) ).toBe( 'Page 2 of 5' );
		expect( format( '%d results', 3 ) ).toBe( '3 results' );
	} );
} );
