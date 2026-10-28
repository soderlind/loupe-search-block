/**
 * Loupe Search block: editor.
 */
import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	Notice,
	PanelBody,
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';

import metadata from './block.json';
import './style.scss';

const config = window.loupeSearchBlock || { active: false, profiles: {} };
const profiles = Object.values( config.profiles || {} );
const allSorts = config.profiles?.all?.sorts || [ 'relevance' ];
const titleSortable = allSorts.includes( 'title_asc' );
const anyTitleSortable = profiles.some( ( p ) =>
	p.sorts.includes( 'title_asc' )
);
const facetKind = ( field ) => {
	if ( field === 'post_author' ) {
		return 'author';
	}
	return field.startsWith( 'taxonomy_' ) ? 'taxonomy' : 'custom';
};
const anyFacetOf = ( kind ) =>
	profiles.some( ( p ) => p.facets.some( ( f ) => facetKind( f ) === kind ) );
const anyTaxonomy = anyFacetOf( 'taxonomy' );
const anyAuthor = anyFacetOf( 'author' );
const anyCustom = anyFacetOf( 'custom' );
const anyDate = profiles.some( ( p ) => p.date );

const SORT_LABELS = {
	relevance: __( 'Relevance', 'loupe-search-block' ),
	newest: __( 'Newest first', 'loupe-search-block' ),
	oldest: __( 'Oldest first', 'loupe-search-block' ),
	title_asc: __( 'Title A–Z', 'loupe-search-block' ),
	title_desc: __( 'Title Z–A', 'loupe-search-block' ),
};

function Edit( { attributes, setAttributes } ) {
	const {
		label,
		placeholder,
		perPage,
		showTypeFilter,
		showFacets,
		showAuthorFilter,
		showCustomFields,
		showDateFilter,
		showSort,
		defaultSort,
		showExcerpt,
		highlight,
	} = attributes;

	const sortOptions = allSorts.map( ( value ) => ( {
		value,
		label: SORT_LABELS[ value ] || value,
	} ) );

	return (
		<div { ...useBlockProps() }>
			<InspectorControls>
				<PanelBody title={ __( 'Search', 'loupe-search-block' ) }>
					<TextControl
						__next40pxDefaultSize
						label={ __( 'Label', 'loupe-search-block' ) }
						value={ label }
						placeholder={ __( 'Search', 'loupe-search-block' ) }
						onChange={ ( value ) =>
							setAttributes( { label: value } )
						}
					/>
					<TextControl
						__next40pxDefaultSize
						label={ __( 'Placeholder', 'loupe-search-block' ) }
						value={ placeholder }
						placeholder={ __( 'Search…', 'loupe-search-block' ) }
						onChange={ ( value ) =>
							setAttributes( { placeholder: value } )
						}
					/>
					<RangeControl
						__next40pxDefaultSize
						label={ __( 'Results per page', 'loupe-search-block' ) }
						value={ perPage }
						min={ 1 }
						max={ 50 }
						onChange={ ( value ) =>
							setAttributes( { perPage: value || 10 } )
						}
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Filters and sorting', 'loupe-search-block' ) }
				>
					<ToggleControl
						label={ __(
							'Show post type filter',
							'loupe-search-block'
						) }
						checked={ showTypeFilter }
						onChange={ ( value ) =>
							setAttributes( { showTypeFilter: value } )
						}
					/>
					<ToggleControl
						label={ __(
							'Show taxonomy facets',
							'loupe-search-block'
						) }
						help={ __(
							'Categories, tags and custom taxonomies.',
							'loupe-search-block'
						) }
						checked={ showFacets }
						onChange={ ( value ) =>
							setAttributes( { showFacets: value } )
						}
					/>
					{ showFacets && ! anyTaxonomy && (
						<Notice status="info" isDismissible={ false }>
							{ __(
								'Taxonomy facets appear once a taxonomy, such as Categories or Tags, is marked Filterable in Settings → Loupe Search → Fields.',
								'loupe-search-block'
							) }
						</Notice>
					) }
					<ToggleControl
						label={ __(
							'Show author filter',
							'loupe-search-block'
						) }
						checked={ showAuthorFilter }
						onChange={ ( value ) =>
							setAttributes( { showAuthorFilter: value } )
						}
					/>
					{ showAuthorFilter && ! anyAuthor && (
						<Notice status="info" isDismissible={ false }>
							{ __(
								'The author filter appears once Post Author is marked Filterable in Settings → Loupe Search → Fields.',
								'loupe-search-block'
							) }
						</Notice>
					) }
					<ToggleControl
						label={ __(
							'Show custom field facets',
							'loupe-search-block'
						) }
						checked={ showCustomFields }
						onChange={ ( value ) =>
							setAttributes( { showCustomFields: value } )
						}
					/>
					{ showCustomFields && ! anyCustom && (
						<Notice status="info" isDismissible={ false }>
							{ __(
								'Custom field facets appear once a custom field is marked Filterable in Settings → Loupe Search → Fields.',
								'loupe-search-block'
							) }
						</Notice>
					) }
					<ToggleControl
						label={ __( 'Show date filter', 'loupe-search-block' ) }
						help={ __(
							'From and To dates for the publish date.',
							'loupe-search-block'
						) }
						checked={ showDateFilter }
						onChange={ ( value ) =>
							setAttributes( { showDateFilter: value } )
						}
					/>
					{ showDateFilter && ! anyDate && (
						<Notice status="info" isDismissible={ false }>
							{ __(
								'The date filter appears once Post Date is marked Filterable in Settings → Loupe Search → Fields.',
								'loupe-search-block'
							) }
						</Notice>
					) }
					<ToggleControl
						label={ __(
							'Show sort options',
							'loupe-search-block'
						) }
						checked={ showSort }
						onChange={ ( value ) =>
							setAttributes( { showSort: value } )
						}
					/>
					<SelectControl
						__next40pxDefaultSize
						label={ __( 'Default sort', 'loupe-search-block' ) }
						value={
							allSorts.includes( defaultSort )
								? defaultSort
								: 'relevance'
						}
						options={ sortOptions }
						onChange={ ( value ) =>
							setAttributes( { defaultSort: value } )
						}
					/>
					{ ! titleSortable && (
						<Notice status="info" isDismissible={ false }>
							{ anyTitleSortable
								? __(
										'Title sorting is offered only when a post type whose Title is Sortable is selected. Mark Title as Sortable for every post type in Settings → Loupe Search → Fields to offer it for all types.',
										'loupe-search-block'
									)
								: __(
										'Title sorting is hidden. Mark Title as Sortable in Settings → Loupe Search → Fields to offer it.',
										'loupe-search-block'
									) }
						</Notice>
					) }
				</PanelBody>
				<PanelBody title={ __( 'Results', 'loupe-search-block' ) }>
					<ToggleControl
						label={ __( 'Show excerpt', 'loupe-search-block' ) }
						checked={ showExcerpt }
						onChange={ ( value ) =>
							setAttributes( { showExcerpt: value } )
						}
					/>
					<ToggleControl
						label={ __(
							'Highlight matches',
							'loupe-search-block'
						) }
						checked={ highlight }
						onChange={ ( value ) =>
							setAttributes( { highlight: value } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			{ ! config.active ? (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'The Loupe Search block needs the Loupe Search plugin to be active.',
						'loupe-search-block'
					) }
				</Notice>
			) : (
				<ServerSideRender
					block={ metadata.name }
					attributes={ attributes }
				/>
			) }
		</div>
	);
}

registerBlockType( metadata.name, {
	edit: Edit,
} );
