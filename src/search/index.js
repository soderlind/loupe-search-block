/**
 * Loupe Search block: editor.
 */
import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	Button,
	CheckboxControl,
	Notice,
	PanelBody,
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

import metadata from './block.json';
import { buildEditorPreview, toggleCustomField } from './lib';
import './style.scss';

const config = window.loupeSearchBlock || {
	active: false,
	profiles: {},
	postTypes: [],
	facetLabels: {},
	customFields: [],
};
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
const customOptions = config.customFields || [];
const customEligible = customOptions.map( ( o ) => o.field );
const anyDate = profiles.some( ( p ) => p.date );

const CUSTOM_FIELDS_STYLE = {
	border: 0,
	margin: '-8px 0 16px',
	padding: '0 0 0 44px',
};

const needsFilterable = ( field ) =>
	sprintf(
		/* translators: %s: field name, e.g. "Post Author". */
		__(
			'Needs %s marked Filterable in Settings → Loupe Search → Fields.',
			'loupe-search-block'
		),
		field
	);

let titleSortHelp;
if ( ! titleSortable ) {
	titleSortHelp = anyTitleSortable
		? __(
				'Title sorting appears only for post types whose Title is Sortable.',
				'loupe-search-block'
			)
		: __(
				'Title sorting needs Title marked Sortable in Settings → Loupe Search → Fields.',
				'loupe-search-block'
			);
}

const SORT_LABELS = {
	relevance: __( 'Relevance', 'loupe-search-block' ),
	newest: __( 'Newest first', 'loupe-search-block' ),
	oldest: __( 'Oldest first', 'loupe-search-block' ),
	title_asc: __( 'Title A–Z', 'loupe-search-block' ),
	title_desc: __( 'Title Z–A', 'loupe-search-block' ),
};

function EditorPreview( { attributes } ) {
	const preview = buildEditorPreview( attributes, config );
	const sortOptions = preview.sorts.map( ( sort ) => ( {
		value: sort,
		label: SORT_LABELS[ sort ] || sort,
	} ) );

	return (
		<div
			className="loupe-search-block__editor-preview"
			role="group"
			aria-label={ __( 'Search block preview', 'loupe-search-block' ) }
		>
			<form
				className="loupe-search-block__form"
				onSubmit={ ( event ) => event.preventDefault() }
			>
				<p className="loupe-search-block__label">
					{ attributes.label?.trim() ||
						__( 'Search', 'loupe-search-block' ) }
				</p>
				<div className="loupe-search-block__field">
					<input
						className="loupe-search-block__input"
						type="search"
						placeholder={
							attributes.placeholder?.trim() ||
							__( 'Search…', 'loupe-search-block' )
						}
						readOnly
						tabIndex={ -1 }
						aria-label={
							attributes.label?.trim() ||
							__( 'Search', 'loupe-search-block' )
						}
					/>
					<button
						className="wp-element-button"
						type="button"
						disabled
					>
						{ __( 'Search', 'loupe-search-block' ) }
					</button>
				</div>
				{ ( preview.postTypes.length > 0 ||
					preview.sorts.length > 0 ||
					preview.showDate ) && (
					<div className="loupe-search-block__controls">
						{ preview.postTypes.length > 0 && (
							<div className="loupe-search-block__control">
								<span>
									{ __( 'Type', 'loupe-search-block' ) }
								</span>
								<select
									aria-label={ __(
										'Content type',
										'loupe-search-block'
									) }
									disabled
									tabIndex={ -1 }
									value="all"
								>
									<option value="all">
										{ __(
											'All types',
											'loupe-search-block'
										) }
									</option>
									{ preview.postTypes.map( ( type ) => (
										<option
											key={ type.slug }
											value={ type.slug }
										>
											{ type.label }
										</option>
									) ) }
								</select>
							</div>
						) }
						{ preview.sorts.length > 0 && (
							<div className="loupe-search-block__control">
								<span>
									{ __( 'Sort by', 'loupe-search-block' ) }
								</span>
								<select
									aria-label={ __(
										'Sort order',
										'loupe-search-block'
									) }
									disabled
									tabIndex={ -1 }
									value={ preview.defaultSort }
								>
									{ sortOptions.map( ( option ) => (
										<option
											key={ option.value }
											value={ option.value }
										>
											{ option.label }
										</option>
									) ) }
								</select>
							</div>
						) }
						{ preview.showDate && (
							<fieldset className="loupe-search-block__control loupe-search-block__dates">
								<legend>
									{ __( 'Published', 'loupe-search-block' ) }
								</legend>
								<div>
									<span>
										{ __( 'From', 'loupe-search-block' ) }
									</span>
									<input
										aria-label={ __(
											'Published from',
											'loupe-search-block'
										) }
										type="date"
										disabled
										tabIndex={ -1 }
									/>
								</div>
								<div>
									<span>
										{ __( 'To', 'loupe-search-block' ) }
									</span>
									<input
										aria-label={ __(
											'Published to',
											'loupe-search-block'
										) }
										type="date"
										disabled
										tabIndex={ -1 }
									/>
								</div>
							</fieldset>
						) }
					</div>
				) }
				{ preview.facets.length > 0 ? (
					<div className="loupe-search-block__facets">
						{ preview.facets.map( ( facet ) => (
							<fieldset
								className="loupe-search-block__facet"
								key={ facet.field }
							>
								<legend>{ facet.label }</legend>
								<p className="loupe-search-block__editor-note">
									{ __(
										'Options appear after searching.',
										'loupe-search-block'
									) }
								</p>
							</fieldset>
						) ) }
					</div>
				) : null }
				<p className="loupe-search-block__editor-note">
					{ __(
						'Preview only. Search and filter values are not interactive in the editor.',
						'loupe-search-block'
					) }
				</p>
			</form>
		</div>
	);
}

function Edit( { attributes, setAttributes } ) {
	const {
		label,
		placeholder,
		perPage,
		showTypeFilter,
		showFacets,
		showAuthorFilter,
		showCustomFields,
		customFields,
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
		<div { ...useBlockProps( { className: 'loupe-search-block' } ) }>
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
				<PanelBody title={ __( 'Filters', 'loupe-search-block' ) }>
					<ToggleControl
						label={ __( 'Post type filter', 'loupe-search-block' ) }
						help={ __(
							'Hidden when only one content type is indexed.',
							'loupe-search-block'
						) }
						checked={ showTypeFilter }
						onChange={ ( value ) =>
							setAttributes( { showTypeFilter: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Taxonomy facets', 'loupe-search-block' ) }
						help={
							showFacets && ! anyTaxonomy
								? needsFilterable(
										__( 'a taxonomy', 'loupe-search-block' )
									)
								: __(
										'Categories, tags and custom taxonomies.',
										'loupe-search-block'
									)
						}
						checked={ showFacets }
						onChange={ ( value ) =>
							setAttributes( { showFacets: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Author filter', 'loupe-search-block' ) }
						help={
							showAuthorFilter && ! anyAuthor
								? needsFilterable(
										__(
											'Post Author',
											'loupe-search-block'
										)
									)
								: __(
										'Filter by post author.',
										'loupe-search-block'
									)
						}
						checked={ showAuthorFilter }
						onChange={ ( value ) =>
							setAttributes( { showAuthorFilter: value } )
						}
					/>
					<ToggleControl
						label={ __(
							'Custom field facets',
							'loupe-search-block'
						) }
						help={
							showCustomFields && ! customOptions.length
								? needsFilterable(
										__(
											'a custom field',
											'loupe-search-block'
										)
									)
								: __(
										'Choose the fields below.',
										'loupe-search-block'
									)
						}
						checked={ showCustomFields }
						onChange={ ( value ) =>
							setAttributes( { showCustomFields: value } )
						}
					/>
					{ showCustomFields && customOptions.length > 0 && (
						<fieldset style={ CUSTOM_FIELDS_STYLE }>
							<legend className="screen-reader-text">
								{ __( 'Custom fields', 'loupe-search-block' ) }
							</legend>
							{ customOptions.map( ( option ) => (
								<CheckboxControl
									__nextHasNoMarginBottom
									key={ option.field }
									label={ option.label }
									help={ option.postTypes.join( ', ' ) }
									checked={
										! Array.isArray( customFields ) ||
										customFields.includes( option.field )
									}
									onChange={ ( checked ) =>
										setAttributes( {
											customFields: toggleCustomField(
												customFields,
												customEligible,
												option.field,
												checked
											),
										} )
									}
								/>
							) ) }
							{ Array.isArray( customFields ) && (
								<Button
									variant="link"
									onClick={ () =>
										setAttributes( {
											customFields: undefined,
										} )
									}
								>
									{ __(
										'Reset to all fields',
										'loupe-search-block'
									) }
								</Button>
							) }
						</fieldset>
					) }
					<ToggleControl
						label={ __( 'Date filter', 'loupe-search-block' ) }
						help={
							showDateFilter && ! anyDate
								? needsFilterable(
										__( 'Post Date', 'loupe-search-block' )
									)
								: __(
										'From and To dates for the publish date.',
										'loupe-search-block'
									)
						}
						checked={ showDateFilter }
						onChange={ ( value ) =>
							setAttributes( { showDateFilter: value } )
						}
					/>
				</PanelBody>
				<PanelBody title={ __( 'Sorting', 'loupe-search-block' ) }>
					<ToggleControl
						label={ __( 'Sort options', 'loupe-search-block' ) }
						help={ __(
							'Let visitors change the order of results.',
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
						help={ titleSortHelp }
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
				<EditorPreview attributes={ attributes } />
			) }
		</div>
	);
}

registerBlockType( metadata.name, {
	edit: Edit,
} );
