<?php
/**
 * Server render for the Loupe Search block.
 *
 * Without JavaScript the block is a plain search form that submits `?s=` to the
 * site's search page. The Interactivity API turns it into live search.
 *
 * @package Soderlind\Plugin\LoupeSearchBlock
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block content.
 * @var WP_Block $block      Block instance.
 */

use Soderlind\Plugin\LoupeSearchBlock\Config;

defined( 'ABSPATH' ) || exit;

if ( ! Config::loupe_available() ) {
	if ( current_user_can( 'activate_plugins' ) ) {
		printf(
			'<p %s>%s</p>',
			get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			esc_html__( 'The Loupe Search block needs the Loupe Search plugin to be active.', 'loupe-search-block' )
		);
	}
	return;
}

$loupe_types    = Config::post_types();
$loupe_profiles = Config::profiles( $loupe_types );

$loupe_sort_labels = [
	'relevance'  => __( 'Relevance', 'loupe-search-block' ),
	'newest'     => __( 'Newest first', 'loupe-search-block' ),
	'oldest'     => __( 'Oldest first', 'loupe-search-block' ),
	'title_asc'  => __( 'Title A–Z', 'loupe-search-block' ),
	'title_desc' => __( 'Title Z–A', 'loupe-search-block' ),
];

$loupe_facet_labels = [];
foreach ( Config::FACET_FIELDS as $loupe_field ) {
	$loupe_taxonomy                     = get_taxonomy( substr( $loupe_field, strlen( 'taxonomy_' ) ) );
	$loupe_facet_labels[ $loupe_field ] = $loupe_taxonomy ? (string) $loupe_taxonomy->labels->name : $loupe_field;
}

$loupe_default_sort = (string) ( $attributes[ 'defaultSort' ] ?? 'relevance' );
if ( ! in_array( $loupe_default_sort, $loupe_profiles[ 'all' ][ 'sorts' ], true ) ) {
	$loupe_default_sort = 'relevance';
}

$loupe_show_types  = ! empty( $attributes[ 'showTypeFilter' ] ) && count( $loupe_types ) > 1;
$loupe_show_sort   = ! empty( $attributes[ 'showSort' ] ) && count( $loupe_profiles[ 'all' ][ 'sorts' ] ) > 1;
$loupe_label       = '' !== trim( (string) ( $attributes[ 'label' ] ?? '' ) ) ? (string) $attributes[ 'label' ] : __( 'Search', 'loupe-search-block' );
$loupe_placeholder = '' !== trim( (string) ( $attributes[ 'placeholder' ] ?? '' ) ) ? (string) $attributes[ 'placeholder' ] : __( 'Search…', 'loupe-search-block' );
$loupe_uid         = wp_unique_id( 'loupe-search-' );

wp_interactivity_state(
	'loupe-search/search',
	[
		'restUrl' => rest_url( 'loupe-search/v1/search' ),
		'nonce'   => is_user_logged_in() ? wp_create_nonce( 'wp_rest' ) : '',
		'i18n'    => [
			/* translators: %d: number of search results. */
			'resultsOne'  => _n( '%d result', '%d results', 1, 'loupe-search-block' ),
			/* translators: %d: number of search results. */
			'resultsMany' => _n( '%d result', '%d results', 2, 'loupe-search-block' ),
			'noResults'   => __( 'No results found.', 'loupe-search-block' ),
			'loading'     => __( 'Searching…', 'loupe-search-block' ),
			'error'       => __( 'Search is not available right now. Please try again.', 'loupe-search-block' ),
			/* translators: 1: current page number, 2: total number of pages. */
			'page'        => __( 'Page %1$d of %2$d', 'loupe-search-block' ),
			'untitled'    => __( '(no title)', 'loupe-search-block' ),
		],
	]
);

$loupe_context = [
	'uid'         => $loupe_uid,
	'perPage'     => max( 1, min( 100, (int) ( $attributes[ 'perPage' ] ?? 10 ) ) ),
	'highlight'   => ! empty( $attributes[ 'highlight' ] ),
	'showExcerpt' => ! empty( $attributes[ 'showExcerpt' ] ),
	'showFacets'  => ! empty( $attributes[ 'showFacets' ] ),
	'profiles'    => $loupe_profiles,
	'facetLabels' => $loupe_facet_labels,
	'q'           => '',
	'postType'    => 'all',
	'sort'        => $loupe_default_sort,
	'page'        => 1,
	'selected'    => (object) [],
	'results'     => [],
	'facetGroups' => [],
	'total'       => 0,
	'totalPages'  => 0,
	'loading'     => false,
	'error'       => false,
	'searched'    => false,
	'ready'       => false,
	'lastCounted' => '',
	'requestId'   => 0,
];

$loupe_wrapper = get_block_wrapper_attributes( [ 'class' => 'loupe-search-block' ] );
?>
<div
	<?php echo $loupe_wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	data-wp-interactive="loupe-search/search"
	<?php echo wp_interactivity_data_wp_context( $loupe_context ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	data-wp-init="callbacks.init"
>
	<form
		class="loupe-search-block__form"
		role="search"
		method="get"
		action="<?php echo esc_url( home_url( '/' ) ); ?>"
		data-wp-on--submit="actions.submit"
	>
		<label class="loupe-search-block__label" for="<?php echo esc_attr( $loupe_uid ); ?>-q"><?php echo esc_html( $loupe_label ); ?></label>
		<div class="loupe-search-block__field">
			<input
				id="<?php echo esc_attr( $loupe_uid ); ?>-q"
				class="loupe-search-block__input"
				type="search"
				name="s"
				autocomplete="off"
				placeholder="<?php echo esc_attr( $loupe_placeholder ); ?>"
				aria-controls="<?php echo esc_attr( $loupe_uid ); ?>-results"
				data-wp-bind--value="context.q"
				data-wp-on--input="actions.input"
			/>
			<button type="submit" class="loupe-search-block__submit wp-element-button"><?php esc_html_e( 'Search', 'loupe-search-block' ); ?></button>
		</div>

		<?php if ( $loupe_show_types || $loupe_show_sort ) : ?>
			<div class="loupe-search-block__controls" hidden data-wp-bind--hidden="!context.ready">
				<?php if ( $loupe_show_types ) : ?>
					<label class="loupe-search-block__control">
						<span><?php esc_html_e( 'Type', 'loupe-search-block' ); ?></span>
						<select data-wp-bind--value="context.postType" data-wp-on--change="actions.setPostType">
							<option value="all"><?php esc_html_e( 'All types', 'loupe-search-block' ); ?></option>
							<?php foreach ( $loupe_types as $loupe_type => $loupe_settings ) : ?>
								<option value="<?php echo esc_attr( $loupe_type ); ?>"><?php echo esc_html( $loupe_settings[ 'label' ] ); ?></option>
							<?php endforeach; ?>
						</select>
					</label>
				<?php endif; ?>
				<?php if ( $loupe_show_sort ) : ?>
					<label class="loupe-search-block__control">
						<span><?php esc_html_e( 'Sort by', 'loupe-search-block' ); ?></span>
						<select data-wp-bind--value="context.sort" data-wp-on--change="actions.setSort">
							<?php foreach ( $loupe_sort_labels as $loupe_sort => $loupe_sort_label ) : ?>
								<?php
								if ( ! in_array( $loupe_sort, $loupe_profiles[ 'all' ][ 'sorts' ], true ) ) {
									// Sorts that no post type allows are never offered.
									$loupe_any = false;
									foreach ( $loupe_profiles as $loupe_profile ) {
										$loupe_any = $loupe_any || in_array( $loupe_sort, $loupe_profile[ 'sorts' ], true );
									}
									if ( ! $loupe_any ) {
										continue;
									}
								}
								?>
								<option
									value="<?php echo esc_attr( $loupe_sort ); ?>"
									<?php selected( $loupe_sort, $loupe_default_sort ); ?>
									<?php echo wp_interactivity_data_wp_context( [ 'option' => $loupe_sort ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
									data-wp-bind--hidden="!state.sortAllowed"
									data-wp-bind--disabled="!state.sortAllowed"
								><?php echo esc_html( $loupe_sort_label ); ?></option>
							<?php endforeach; ?>
						</select>
					</label>
				<?php endif; ?>
			</div>
		<?php endif; ?>
	</form>

	<div class="loupe-search-block__status" role="status" aria-live="polite" data-wp-text="state.statusText"></div>

	<div
		id="<?php echo esc_attr( $loupe_uid ); ?>-results"
		class="loupe-search-block__panel"
		hidden
		data-wp-bind--hidden="!context.searched"
		data-wp-class--is-loading="context.loading"
	>
		<div class="loupe-search-block__facets" data-wp-bind--hidden="!state.hasFacets">
			<template data-wp-each--group="context.facetGroups" data-wp-each-key="context.group.field">
				<fieldset class="loupe-search-block__facet">
					<legend data-wp-text="context.group.label"></legend>
					<template data-wp-each--bucket="context.group.buckets" data-wp-each-key="context.bucket.value">
						<label class="loupe-search-block__facet-option">
							<input
								type="checkbox"
								data-wp-bind--checked="state.bucketChecked"
								data-wp-on--change="actions.toggleFacet"
							/>
							<span data-wp-text="context.bucket.value"></span>
							<span class="loupe-search-block__count" data-wp-text="context.bucket.count"></span>
						</label>
					</template>
				</fieldset>
			</template>
		</div>

		<div class="loupe-search-block__main">
			<ol class="loupe-search-block__results">
				<template data-wp-each--hit="context.results" data-wp-each-key="context.hit.id">
					<li class="loupe-search-block__result">
						<a class="loupe-search-block__title" data-wp-bind--href="context.hit.url" data-wp-watch="callbacks.renderTitle"></a>
						<span class="loupe-search-block__type" data-wp-text="context.hit.typeLabel"></span>
						<p class="loupe-search-block__excerpt" data-wp-bind--hidden="!context.hit.excerptHtml" data-wp-watch="callbacks.renderExcerpt"></p>
					</li>
				</template>
			</ol>

			<nav class="loupe-search-block__pagination" aria-label="<?php esc_attr_e( 'Search results pages', 'loupe-search-block' ); ?>" data-wp-bind--hidden="!state.hasPages">
				<button type="button" class="wp-element-button" data-wp-bind--disabled="!state.hasPrev" data-wp-on--click="actions.prevPage"><?php esc_html_e( 'Previous', 'loupe-search-block' ); ?></button>
				<span data-wp-text="state.pageText"></span>
				<button type="button" class="wp-element-button" data-wp-bind--disabled="!state.hasNext" data-wp-on--click="actions.nextPage"><?php esc_html_e( 'Next', 'loupe-search-block' ); ?></button>
			</nav>
		</div>
	</div>
</div>
