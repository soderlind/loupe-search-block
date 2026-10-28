<?php
/**
 * Works out which post types, facets and sort options the block can offer.
 *
 * @package Soderlind\Plugin\LoupeSearchBlock
 */

namespace Soderlind\Plugin\LoupeSearchBlock;

defined( 'ABSPATH' ) || exit;

/**
 * Reads the Loupe Search field settings and turns them into per-selection profiles.
 *
 * Loupe Search only accepts a filter or sort field when it is allowed for every
 * post type in the request, so each profile is the intersection across its types.
 */
final class Config {

	/**
	 * Facet kinds, each turned on by its own block setting.
	 */
	public const KIND_TAXONOMY = 'taxonomy';
	public const KIND_AUTHOR   = 'author';
	public const KIND_CUSTOM   = 'custom';
	public const FACET_KINDS   = [ self::KIND_TAXONOMY, self::KIND_AUTHOR, self::KIND_CUSTOM ];

	/**
	 * Indexed author field. Its values are user IDs.
	 */
	public const AUTHOR_FIELD = 'post_author';

	/**
	 * Indexed publish date field, stored as `Y-m-d H:i:s`.
	 */
	public const DATE_FIELD = 'post_date';

	/**
	 * Taxonomy fields shown before any other taxonomy, in this order.
	 */
	public const FIRST_TAXONOMIES = [ 'taxonomy_category', 'taxonomy_post_tag' ];

	/**
	 * Core post fields and result metadata that are never offered as facets.
	 */
	private const NON_FACET_FIELDS = [
		'id', 'ID', 'permalink', 'post_date', 'post_date_gmt',
		'post_content', 'post_title', 'post_excerpt', 'post_status',
		'comment_status', 'ping_status', 'post_password', 'post_name',
		'to_ping', 'pinged', 'post_modified', 'post_modified_gmt',
		'post_content_filtered', 'post_parent', 'guid', 'menu_order',
		'post_type', 'post_mime_type', 'comment_count',
	];

	/**
	 * Sort options and the field each one needs to be Sortable.
	 */
	public const SORTS = [
		'relevance'  => null,
		'newest'     => 'post_date',
		'oldest'     => 'post_date',
		'title_asc'  => 'post_title',
		'title_desc' => 'post_title',
	];

	/**
	 * Public Loupe Search route that lists searchable post types and their fields.
	 */
	public const FIELDS_ROUTE = '/loupe-search/v1/search-fields';

	/**
	 * Response from the fields route, cached for the request.
	 *
	 * @var array<string,array{label:string,filterable:array<int,string>,sortable:array<int,string>}>|null
	 */
	private static ?array $types = null;

	/**
	 * Whether Loupe Search is active and exposes the fields route.
	 */
	public static function loupe_available(): bool {
		self::post_types();
		return null !== self::$types && [] !== self::$types;
	}

	/**
	 * Field settings per searchable post type, read from Loupe Search's public REST API.
	 *
	 * @return array<string,array{label:string,filterable:array<int,string>,sortable:array<int,string>}>
	 */
	public static function post_types(): array {
		if ( null === self::$types ) {
			self::$types = self::parse_fields_response( self::fetch_fields() );
		}
		return self::$types;
	}

	/**
	 * Turn a /search-fields response into post type settings.
	 *
	 * @param mixed $data Response data.
	 * @return array<string,array{label:string,filterable:array<int,string>,sortable:array<int,string>}>
	 */
	public static function parse_fields_response( $data ): array {
		if ( ! is_array( $data ) || ! is_array( $data[ 'post_types' ] ?? null ) ) {
			return [];
		}

		$types = [];
		foreach ( $data[ 'post_types' ] as $post_type => $settings ) {
			if ( ! is_string( $post_type ) || ! is_array( $settings ) ) {
				continue;
			}
			$types[ $post_type ] = [
				'label'      => (string) ( $settings[ 'label' ] ?? $post_type ),
				'filterable' => self::names( (array) ( $settings[ 'filterable' ] ?? [] ) ),
				'sortable'   => self::names( (array) ( $settings[ 'sortable' ] ?? [] ) ),
			];
		}
		return $types;
	}

	/**
	 * Call the fields route in-process.
	 *
	 * @return mixed Response data, or null when the route is missing or fails.
	 */
	private static function fetch_fields() {
		if ( ! function_exists( 'rest_do_request' ) ) {
			return null;
		}
		$response = rest_do_request( new \WP_REST_Request( 'GET', self::FIELDS_ROUTE ) );
		if ( $response->is_error() || 200 !== $response->get_status() ) {
			return null;
		}
		return $response->get_data();
	}

	/**
	 * Build the profile for "all" and for every single post type.
	 *
	 * @param array<string,array{label:string,filterable:array<int,string>,sortable:array<int,string>}> $types
	 * @param array<int,string> $kinds Facet kinds to offer.
	 * @param array<int,string>|null $custom_fields Custom fields chosen in the block, or null for all.
	 * @return array<string,array{facets:array<int,string>,sorts:array<int,string>,date:bool}>
	 */
	public static function profiles( array $types, array $kinds = self::FACET_KINDS, ?array $custom_fields = null ): array {
		$profiles = [ 'all' => self::profile( array_values( $types ), $kinds, $custom_fields ) ];
		foreach ( $types as $post_type => $settings ) {
			$profiles[ $post_type ] = self::profile( [ $settings ], $kinds, $custom_fields );
		}

		return $profiles;
	}

	/**
	 * Profile for a set of post types.
	 *
	 * @param array<int,array{filterable:array<int,string>,sortable:array<int,string>}> $settings
	 * @param array<int,string> $kinds Facet kinds to offer.
	 * @param array<int,string>|null $custom_fields Custom fields chosen in the block, or null for all.
	 * @return array{facets:array<int,string>,sorts:array<int,string>,date:bool}
	 */
	public static function profile( array $settings, array $kinds = self::FACET_KINDS, ?array $custom_fields = null ): array {
		if ( empty( $settings ) ) {
			return [ 'facets' => [], 'sorts' => [ 'relevance' ], 'date' => false ];
		}

		$filterable = self::intersect( array_column( $settings, 'filterable' ) );
		$sortable   = self::intersect( array_column( $settings, 'sortable' ) );

		$sorts = [];
		foreach ( self::SORTS as $sort => $field ) {
			if ( null === $field || in_array( $field, $sortable, true ) ) {
				$sorts[] = $sort;
			}
		}

		$facets = self::facet_fields( $filterable, $kinds );
		if ( function_exists( 'apply_filters' ) ) {
			/**
			 * Filters the fields the search block offers as facets.
			 *
			 * Use it to hide fields that cannot be shown as a list of values,
			 * such as a geo point field.
			 *
			 * @since 1.1.0
			 * @param array<int,string> $facets     Facet fields in display order.
			 * @param array<int,string> $filterable Fields allowed for every post type in the selection.
			 */
			$facets = (array) apply_filters( 'loupe_search_block_facet_fields', $facets, $filterable );
			// Loupe Search rejects facets on fields that are not filterable.
			$facets = array_values( array_intersect( self::names( $facets ), $filterable ) );
		}
		if ( null !== $custom_fields ) {
			$facets = array_values(
				array_filter(
					$facets,
					static fn( string $field ): bool => self::KIND_CUSTOM !== self::facet_kind( $field ) || in_array( $field, $custom_fields, true )
				)
			);
		}

		return [
			'facets' => $facets,
			'sorts'  => $sorts,
			'date'   => in_array( self::DATE_FIELD, $filterable, true ),
		];
	}

	/**
	 * Kind of facet a field can become, or null when it is not a facet.
	 *
	 * @param string $field Field name.
	 */
	public static function facet_kind( string $field ): ?string {
		if ( self::AUTHOR_FIELD === $field ) {
			return self::KIND_AUTHOR;
		}
		if ( str_starts_with( $field, 'taxonomy_' ) ) {
			return strlen( $field ) > strlen( 'taxonomy_' ) ? self::KIND_TAXONOMY : null;
		}
		if ( in_array( $field, self::NON_FACET_FIELDS, true ) ) {
			return null;
		}
		return self::KIND_CUSTOM;
	}

	/**
	 * Filterable fields that become facets: taxonomies (categories and tags
	 * first), then author, then custom fields.
	 *
	 * @param array<int,string> $filterable Filterable fields.
	 * @param array<int,string> $kinds      Facet kinds to offer.
	 * @return array<int,string>
	 */
	public static function facet_fields( array $filterable, array $kinds = self::FACET_KINDS ): array {
		$groups = [
			self::KIND_TAXONOMY => array_values( array_intersect( self::FIRST_TAXONOMIES, $filterable ) ),
			self::KIND_AUTHOR   => [],
			self::KIND_CUSTOM   => [],
		];
		foreach ( $filterable as $field ) {
			$kind = self::facet_kind( $field );
			if ( null !== $kind && ! in_array( $field, $groups[ $kind ], true ) ) {
				$groups[ $kind ][] = $field;
			}
		}

		$facets = [];
		foreach ( $groups as $kind => $fields ) {
			if ( in_array( $kind, $kinds, true ) ) {
				$facets = array_merge( $facets, $fields );
			}
		}
		return $facets;
	}

	/**
	 * Readable label for a custom field key, e.g. `_event_venue` → `Event Venue`.
	 *
	 * @param string $field Field name.
	 */
	public static function humanize( string $field ): string {
		$label = trim( str_replace( [ '_', '-' ], ' ', $field ) );
		return '' === $label ? $field : ucwords( $label );
	}

	/**
	 * Group labels for facet fields.
	 *
	 * @param array<int,string> $fields Facet fields.
	 * @return array<string,string>
	 */
	public static function facet_labels( array $fields ): array {
		$labels = [];
		foreach ( $fields as $field ) {
			$kind = self::facet_kind( $field );
			if ( self::KIND_AUTHOR === $kind ) {
				$label = __( 'Authors', 'loupe-search-block' );
			} elseif ( self::KIND_TAXONOMY === $kind ) {
				$taxonomy = get_taxonomy( substr( $field, strlen( 'taxonomy_' ) ) );
				$label    = $taxonomy ? (string) $taxonomy->labels->name : self::humanize( substr( $field, strlen( 'taxonomy_' ) ) );
			} else {
				$label = self::humanize( $field );
			}

			/**
			 * Filters the heading of a facet in the search block.
			 *
			 * @since 1.1.0
			 * @param string $label Facet heading.
			 * @param string $field Field name, e.g. `taxonomy_category`, `post_author` or a custom field key.
			 */
			$labels[ $field ] = (string) apply_filters( 'loupe_search_block_facet_label', $label, $field );
		}
		return $labels;
	}

	/**
	 * Display names for authors with published posts, keyed by user ID.
	 *
	 * The author facet returns user IDs; these are the names shown for them.
	 *
	 * @param array<int,string> $post_types Post types to look in.
	 * @return array<string,string>
	 */
	public static function author_names( array $post_types ): array {
		if ( empty( $post_types ) ) {
			return [];
		}
		$users = get_users(
			[
				'has_published_posts' => array_values( $post_types ),
				'fields'              => [ 'ID', 'display_name' ],
				'number'              => -1,
			]
		);

		$names = [];
		foreach ( $users as $user ) {
			$names[ (string) $user->ID ] = (string) $user->display_name;
		}
		return $names;
	}

	/**
	 * Custom fields the block can offer as facets, with the post types that allow each.
	 *
	 * @param array<string,array{label:string,filterable:array<int,string>,sortable:array<int,string>}> $types
	 * @return array<string,array<int,string>> Field => post type labels.
	 */
	public static function custom_field_options( array $types ): array {
		$options = [];
		foreach ( $types as $post_type => $settings ) {
			foreach ( self::profile( [ $settings ], [ self::KIND_CUSTOM ] )[ 'facets' ] as $field ) {
				$options[ $field ][] = (string) ( $settings[ 'label' ] ?? $post_type );
			}
		}
		return $options;
	}

	/**
	 * Data the editor uses for its settings, preview and notes.
	 *
	 * @return array{
	 *     active:bool,
	 *     profiles:array<string,array{facets:array<int,string>,sorts:array<int,string>,date:bool}>,
	 *     postTypes:array<int,array{slug:string,label:string}>,
	 *     facetLabels:array<string,string>,
	 *     customFields:array<int,array{field:string,label:string,postTypes:array<int,string>}>
	 * }
	 */
	public static function editor_data(): array {
		$types          = self::post_types();
		$options        = self::custom_field_options( $types );
		$fields         = array_map( 'strval', array_keys( $options ) );
		$labels         = self::facet_labels( $fields );
		$profiles       = self::profiles( $types );
		$profile_facets = [];
		foreach ( $profiles as $profile ) {
			$profile_facets = array_merge( $profile_facets, $profile[ 'facets' ] );
		}
		$profile_facets = array_values( array_unique( $profile_facets ) );
		$facet_labels   = self::facet_labels( $profile_facets );
		$custom         = [];
		foreach ( $fields as $field ) {
			$custom[] = [
				'field'     => $field,
				'label'     => $labels[ $field ] ?? self::humanize( $field ),
				'postTypes' => $options[ $field ],
			];
		}

		return [
			'active'       => self::loupe_available(),
			'profiles'     => $profiles,
			'postTypes'    => array_map(
				static fn( $slug, array $settings ): array => [
					'slug'  => (string) $slug,
					'label' => (string) ( $settings[ 'label' ] ?? $slug ),
				],
				array_keys( $types ),
				array_values( $types )
			),
			'facetLabels'  => $facet_labels,
			'customFields' => $custom,
		];
	}

	/**
	 * Custom field selection from the block attribute, or null to offer every field.
	 *
	 * @param mixed $value Saved `customFields` attribute.
	 * @return array<int,string>|null
	 */
	public static function custom_field_selection( $value ): ?array {
		return is_array( $value ) ? array_values( array_filter( $value, 'is_string' ) ) : null;
	}

	/**
	 * Keep only field names (strings) from a schema field list.
	 *
	 * @param array<int,mixed> $fields
	 * @return array<int,string>
	 */
	public static function names( array $fields ): array {
		$names = [];
		foreach ( $fields as $field ) {
			if ( is_array( $field ) ) {
				$field = $field[ 'field' ] ?? null;
			}
			if ( is_string( $field ) && '' !== $field ) {
				$names[] = $field;
			}
		}
		return array_values( array_unique( $names ) );
	}

	/**
	 * Intersection of several string lists.
	 *
	 * @param array<int,array<int,string>> $lists
	 * @return array<int,string>
	 */
	private static function intersect( array $lists ): array {
		$acc = array_shift( $lists ) ?? [];
		foreach ( $lists as $list ) {
			$acc = array_intersect( $acc, $list );
		}
		return array_values( $acc );
	}
}
