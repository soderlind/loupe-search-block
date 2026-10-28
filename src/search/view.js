/**
 * Loupe Search block: live search with the Interactivity API.
 */
import {
	store,
	getContext,
	getElement,
	withScope,
	withSyncEvent,
} from '@wordpress/interactivity';

import {
	DEBOUNCE_MS,
	IDLE_COUNT_MS,
	buildFacetGroups,
	buildPayload,
	normalizeQuery,
	profileFor,
	pruneSelected,
	selectedValues,
	format,
	toResult,
} from './lib';

// Timers per block instance, keyed by the block's uid.
const timers = new Map();

function clearTimers( uid ) {
	const t = timers.get( uid );
	if ( t ) {
		clearTimeout( t.debounce );
		clearTimeout( t.idle );
	}
	timers.delete( uid );
}

function reset( ctx ) {
	ctx.requestId++;
	ctx.results = [];
	ctx.facetGroups = [];
	ctx.total = 0;
	ctx.totalPages = 0;
	ctx.page = 1;
	ctx.loading = false;
	ctx.error = false;
	ctx.searched = false;
}

function request( payload ) {
	const headers = { 'Content-Type': 'application/json' };
	if ( state.nonce ) {
		headers[ 'X-WP-Nonce' ] = state.nonce;
	}
	return fetch( state.restUrl, {
		method: 'POST',
		credentials: 'same-origin',
		headers,
		body: JSON.stringify( payload ),
	} );
}

const { state, actions } = store( 'loupe-search/search', {
	state: {
		get statusText() {
			const ctx = getContext();
			if ( ctx.loading ) {
				return state.i18n.loading;
			}
			if ( ! ctx.searched ) {
				return '';
			}
			if ( ctx.error ) {
				return state.i18n.error;
			}
			if ( ! ctx.total ) {
				return state.i18n.noResults;
			}
			return format(
				ctx.total === 1
					? state.i18n.resultsOne
					: state.i18n.resultsMany,
				ctx.total
			);
		},
		get hasFacets() {
			return getContext().facetGroups.length > 0;
		},
		get hasPages() {
			return getContext().totalPages > 1;
		},
		get hasPrev() {
			return getContext().page > 1;
		},
		get hasNext() {
			const ctx = getContext();
			return ctx.page < ctx.totalPages;
		},
		get pageText() {
			const ctx = getContext();
			return format( state.i18n.page, ctx.page, ctx.totalPages );
		},
		get sortAllowed() {
			const ctx = getContext();
			return profileFor( ctx.profiles, ctx.postType ).sorts.includes(
				ctx.option
			);
		},
		get dateAllowed() {
			const ctx = getContext();
			return profileFor( ctx.profiles, ctx.postType ).date;
		},
		get bucketChecked() {
			const ctx = getContext();
			const values = selectedValues( ctx.selected, ctx.group.field );
			return values.includes( ctx.bucket.value );
		},
	},

	actions: {
		input( event ) {
			const ctx = getContext();
			ctx.q = event.target.value;
			clearTimers( ctx.uid );

			if ( ! ctx.q.trim() ) {
				reset( ctx );
				return;
			}

			ctx.page = 1;
			timers.set( ctx.uid, {
				debounce: setTimeout(
					withScope( () => actions.search( false ) ),
					DEBOUNCE_MS
				),
				idle: setTimeout(
					withScope( () => actions.count() ),
					IDLE_COUNT_MS
				),
			} );
		},

		submit: withSyncEvent( ( event ) => {
			event.preventDefault();
			const ctx = getContext();
			clearTimers( ctx.uid );
			if ( ! ctx.q.trim() ) {
				reset( ctx );
				return;
			}
			ctx.page = 1;
			actions.search( true );
		} ),

		setPostType( event ) {
			const ctx = getContext();
			ctx.postType = event.target.value;
			const profile = profileFor( ctx.profiles, ctx.postType );
			ctx.selected = pruneSelected( ctx.selected, profile.facets );
			if ( ! profile.sorts.includes( ctx.sort ) ) {
				ctx.sort = 'relevance';
			}
			ctx.page = 1;
			actions.search( false );
		},

		setSort( event ) {
			const ctx = getContext();
			ctx.sort = event.target.value;
			ctx.page = 1;
			actions.search( false );
		},

		setDateFrom( event ) {
			const ctx = getContext();
			ctx.dateFrom = event.target.value;
			ctx.page = 1;
			actions.search( false );
		},

		setDateTo( event ) {
			const ctx = getContext();
			ctx.dateTo = event.target.value;
			ctx.page = 1;
			actions.search( false );
		},

		toggleFacet( event ) {
			const ctx = getContext();
			const field = ctx.group.field;
			const value = ctx.bucket.value;
			const current = selectedValues( ctx.selected, field ).filter(
				( v ) => v !== value
			);
			if ( event.target.checked ) {
				current.push( value );
			}
			ctx.selected = { ...ctx.selected, [ field ]: current };
			ctx.page = 1;
			actions.search( false );
		},

		prevPage() {
			const ctx = getContext();
			if ( ctx.page > 1 ) {
				ctx.page--;
				actions.search( false );
			}
		},

		nextPage() {
			const ctx = getContext();
			if ( ctx.page < ctx.totalPages ) {
				ctx.page++;
				actions.search( false );
			}
		},

		/**
		 * Run the search and show the results.
		 *
		 * @param {boolean} settled The visitor finished typing (Enter), so count the query once.
		 */
		*search( settled ) {
			const ctx = getContext();
			if ( ! ctx.q.trim() ) {
				reset( ctx );
				return;
			}

			const id = ++ctx.requestId;
			const normalized = normalizeQuery( ctx.q );
			const countSearch = settled && normalized !== ctx.lastCounted;
			if ( countSearch ) {
				ctx.lastCounted = normalized;
			}

			ctx.loading = true;
			ctx.error = false;

			try {
				const response = yield request(
					buildPayload( ctx, { countSearch } )
				);
				if ( ! response.ok ) {
					throw new Error( String( response.status ) );
				}
				const data = yield response.json();
				if ( id !== ctx.requestId ) {
					return;
				}

				const opts = {
					highlight: ctx.highlight,
					showExcerpt: ctx.showExcerpt,
					untitled: state.i18n.untitled,
				};
				ctx.results = ( data.hits || [] ).map( ( hit ) =>
					toResult( hit, opts, document )
				);
				ctx.total = Number( data.pagination?.total ) || 0;
				ctx.totalPages = Number( data.pagination?.total_pages ) || 0;
				ctx.facetGroups = buildFacetGroups(
					profileFor( ctx.profiles, ctx.postType ).facets,
					data.facets,
					ctx.selected,
					ctx.facetLabels,
					ctx.valueLabels
				);
			} catch {
				if ( id === ctx.requestId ) {
					ctx.error = true;
					ctx.results = [];
					ctx.total = 0;
					ctx.totalPages = 0;
				}
			} finally {
				if ( id === ctx.requestId ) {
					ctx.loading = false;
					ctx.searched = true;
				}
			}
		},

		/**
		 * Count the settled query in Search insights without changing the results.
		 */
		*count() {
			const ctx = getContext();
			const normalized = normalizeQuery( ctx.q );
			if ( ! normalized || normalized === ctx.lastCounted ) {
				return;
			}
			ctx.lastCounted = normalized;
			try {
				yield request(
					buildPayload( ctx, { countSearch: true, size: 1 } )
				);
			} catch {
				// Counting is best effort.
			}
		},
	},

	callbacks: {
		init() {
			getContext().ready = true;
		},
		renderTitle() {
			const { ref } = getElement();
			ref.innerHTML = getContext().hit.titleHtml;
		},
		renderExcerpt() {
			const { ref } = getElement();
			ref.innerHTML = getContext().hit.excerptHtml;
		},
	},
} );
