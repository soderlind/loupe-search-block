/**
 * Pure helpers for the Loupe Search block. No DOM or store access except
 * `sanitizeHighlight`, which takes the document to use.
 */

export const IDLE_COUNT_MS = 1500;
export const DEBOUNCE_MS = 300;
export const FACET_SIZE = 10;
export const DATE_FIELD = 'post_date';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const SORTS = {
	newest: [ { by: 'post_date', order: 'desc' } ],
	oldest: [ { by: 'post_date', order: 'asc' } ],
	title_asc: [ { by: 'post_title', order: 'asc' } ],
	title_desc: [ { by: 'post_title', order: 'desc' } ],
};

const HIGHLIGHT_TAGS = { MARK: true, EM: true };

/**
 * Normalise a query the way it is compared for counting: trimmed, lowercased,
 * with whitespace collapsed.
 *
 * @param {string} q Raw query.
 * @return {string} Normalised query.
 */
export function normalizeQuery( q ) {
	return String( q ?? '' )
		.trim()
		.toLowerCase()
		.replace( /\s+/g, ' ' );
}

/**
 * Profile (allowed facets, sorts and date filter) for the selected post type.
 *
 * @param {Object} profiles Profiles keyed by post type and "all".
 * @param {string} postType Selected post type.
 * @return {{facets: string[], sorts: string[], date: boolean}} Profile.
 */
export function profileFor( profiles, postType ) {
	return (
		( profiles && ( profiles[ postType ] || profiles.all ) ) || {
			facets: [],
			sorts: [ 'relevance' ],
			date: false,
		}
	);
}

/**
 * Filter predicates for the date range. Dates are `YYYY-MM-DD`; the end date
 * includes the whole day. Invalid dates are ignored.
 *
 * @param {string} from Start date.
 * @param {string} to   End date.
 * @return {Array} Predicates.
 */
export function dateRangeItems( from, to ) {
	const items = [];
	if ( DATE_PATTERN.test( from || '' ) ) {
		items.push( {
			type: 'pred',
			field: DATE_FIELD,
			op: 'gte',
			value: from,
		} );
	}
	if ( DATE_PATTERN.test( to || '' ) ) {
		items.push( {
			type: 'pred',
			field: DATE_FIELD,
			op: 'lte',
			value: to + ' 23:59:59',
		} );
	}
	return items;
}

/**
 * Build the POST /search payload.
 *
 * @param {Object}  ctx                Block context.
 * @param {Object}  [opts]             Options.
 * @param {boolean} [opts.countSearch] Ask Loupe Search to count the search.
 * @param {number}  [opts.size]        Page size override.
 * @return {Object} Payload.
 */
export function buildPayload( ctx, opts = {} ) {
	const profile = profileFor( ctx.profiles, ctx.postType );
	const payload = {
		q: String( ctx.q || '' ).trim(),
		postTypes:
			ctx.postType && ctx.postType !== 'all' ? [ ctx.postType ] : 'all',
		page: {
			number: opts.size ? 1 : ctx.page || 1,
			size: opts.size || ctx.perPage || 10,
		},
	};

	if ( SORTS[ ctx.sort ] && profile.sorts.includes( ctx.sort ) ) {
		payload.sort = SORTS[ ctx.sort ];
	}

	const items = [];
	profile.facets.forEach( ( field ) => {
		const values = selectedValues( ctx.selected, field );
		if ( values.length ) {
			items.push( {
				type: 'pred',
				field,
				op: 'in',
				value: [ ...values ],
			} );
		}
	} );
	if ( ctx.showDate && profile.date ) {
		items.push( ...dateRangeItems( ctx.dateFrom, ctx.dateTo ) );
	}
	if ( items.length ) {
		payload.filter = { type: 'and', items };
	}
	if ( profile.facets.length && ! opts.size ) {
		payload.facets = profile.facets.map( ( field ) => ( {
			type: 'terms',
			field,
			size: FACET_SIZE,
			minCount: 1,
		} ) );
	}

	if ( ! opts.size ) {
		if ( ctx.highlight ) {
			payload.attributesToHighlight = ctx.showExcerpt
				? [ 'post_title', 'post_content' ]
				: [ 'post_title' ];
			payload.highlightStartTag = '<mark>';
			payload.highlightEndTag = '</mark>';
		}
		if ( ctx.highlight && ctx.showExcerpt ) {
			payload.attributesToCrop = [ 'post_content' ];
			payload.cropLength = 30;
		}
	}

	if ( opts.countSearch ) {
		payload.countSearch = true;
	}

	return payload;
}

/**
 * Read a field's own array of selected values, never an inherited property.
 *
 * @param {Object} selected Field selections.
 * @param {string} field    Facet field.
 * @return {Array} Selected values.
 */
export function selectedValues( selected, field ) {
	return selected &&
		Object.hasOwn( selected, field ) &&
		Array.isArray( selected[ field ] )
		? selected[ field ]
		: [];
}

/**
 * Keep only the selections that are still valid for the profile.
 *
 * @param {Object}   selected Field => values.
 * @param {string[]} facets   Allowed facet fields.
 * @return {Object} Pruned selection.
 */
export function pruneSelected( selected, facets ) {
	const out = {};
	( facets || [] ).forEach( ( field ) => {
		const values = selectedValues( selected, field );
		if ( values.length ) {
			Object.defineProperty( out, field, {
				value: [ ...values ],
				enumerable: true,
				writable: true,
				configurable: true,
			} );
		}
	} );
	return out;
}

/**
 * Turn the facet distribution into display groups. Selected values stay
 * visible even when the current results no longer contain them.
 *
 * @param {string[]} fields        Facet fields in display order.
 * @param {Object}   facets        Response facets.
 * @param {Object}   selected      Field => selected values.
 * @param {Object}   labels        Field => group label.
 * @param {Object}   [valueLabels] Field => value => label (e.g. author ID => name).
 * @return {Array} Groups.
 */
export function buildFacetGroups(
	fields,
	facets,
	selected,
	labels,
	valueLabels
) {
	const groups = [];
	( fields || [] ).forEach( ( field ) => {
		const names = ( valueLabels && valueLabels[ field ] ) || {};
		const bucket = ( value, count ) => ( {
			value,
			label: Object.hasOwn( names, value )
				? String( names[ value ] )
				: value,
			count,
		} );
		const buckets = (
			( facets && facets[ field ] && facets[ field ].buckets ) ||
			[]
		).map( ( b ) => bucket( String( b.value ), Number( b.count ) || 0 ) );
		const seen = new Set( buckets.map( ( b ) => b.value ) );
		selectedValues( selected, field ).forEach( ( value ) => {
			if ( ! seen.has( value ) ) {
				buckets.push( bucket( value, 0 ) );
			}
		} );
		if ( buckets.length ) {
			groups.push( {
				field,
				label:
					labels && Object.hasOwn( labels, field )
						? labels[ field ]
						: field,
				buckets,
			} );
		}
	} );
	return groups;
}

/**
 * Escape text for use as HTML.
 *
 * @param {string} text Text.
 * @return {string} Escaped HTML.
 */
export function escapeHtml( text ) {
	return String( text ?? '' )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' )
		.replace( /'/g, '&#039;' );
}

/**
 * Decode HTML entities (e.g. `&#8217;`) into plain text.
 *
 * @param {string}   text Text that may contain entities.
 * @param {Document} doc  Document used to decode.
 * @return {string} Plain text.
 */
export function decodeEntities( text, doc ) {
	const el = doc.createElement( 'textarea' );
	el.innerHTML = String( text ?? '' );
	return el.value;
}

/**
 * Keep only <mark> and <em> (without attributes) from highlighted HTML.
 *
 * @param {string}   html HTML from the search engine.
 * @param {Document} doc  Document used to parse.
 * @return {string} Safe HTML.
 */
export function sanitizeHighlight( html, doc ) {
	const tpl = doc.createElement( 'template' );
	tpl.innerHTML = String( html ?? '' );
	const walk = ( parent ) => {
		Array.from( parent.childNodes ).forEach( ( child ) => {
			if ( child.nodeType === 1 ) {
				if ( ! HIGHLIGHT_TAGS[ child.tagName ] ) {
					child.replaceWith(
						doc.createTextNode( child.textContent )
					);
				} else {
					Array.from( child.attributes ).forEach( ( a ) =>
						child.removeAttribute( a.name )
					);
					walk( child );
				}
			} else if ( child.nodeType !== 3 ) {
				child.remove();
			}
		} );
	};
	walk( tpl.content );
	return tpl.innerHTML;
}

/**
 * Map a search hit to what the result template shows. Both HTML fields are safe
 * to assign to innerHTML.
 *
 * @param {Object}   hit              Hit from the REST response.
 * @param {Object}   opts             Options.
 * @param {boolean}  opts.highlight   Use highlighted fields.
 * @param {boolean}  opts.showExcerpt Show an excerpt.
 * @param {string}   opts.untitled    Fallback title.
 * @param {Document} doc              Document used to sanitise.
 * @return {Object} Result.
 */
export function toResult( hit, opts, doc ) {
	const formatted = ( opts.highlight && hit._formatted ) || {};
	const title = decodeEntities( hit.title || '', doc ).trim();

	let titleHtml;
	if ( formatted.post_title ) {
		titleHtml = sanitizeHighlight( formatted.post_title, doc );
	} else {
		titleHtml = escapeHtml( title || opts.untitled || '' );
	}

	// Loupe only crops content around matches. When the hit matched elsewhere
	// (e.g. the title), it returns the whole post, so use the short excerpt.
	let excerptHtml = '';
	if ( opts.showExcerpt ) {
		const content = formatted.post_content || '';
		excerptHtml = content.includes( '<mark>' )
			? sanitizeHighlight( content, doc )
			: escapeHtml( decodeEntities( hit.excerpt || '', doc ) );
	}

	return {
		id: String( hit.post_type || '' ) + ':' + String( hit.id ),
		url: String( hit.url || '' ),
		typeLabel: String( hit.post_type_label || '' ),
		titleHtml,
		excerptHtml,
	};
}

/**
 * Minimal printf for translated strings (%d, %s, %1$d …).
 *
 * @param {string} str  Format.
 * @param {Array}  args Arguments.
 * @return {string} Formatted string.
 */
export function format( str, ...args ) {
	let i = 0;
	return String( str ).replace( /%(?:(\d+)\$)?([sd])/g, ( _m, pos ) => {
		const idx = pos ? parseInt( pos, 10 ) - 1 : i++;
		return String( args[ idx ] );
	} );
}
