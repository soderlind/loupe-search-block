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
	 * Taxonomy fields that can become facets, in display order.
	 */
	public const FACET_FIELDS = [ 'taxonomy_category', 'taxonomy_post_tag' ];

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
	 * @return array<string,array{facets:array<int,string>,sorts:array<int,string>}>
	 */
	public static function profiles( array $types ): array {
		$profiles = [ 'all' => self::profile( array_values( $types ) ) ];
		foreach ( $types as $post_type => $settings ) {
			$profiles[ $post_type ] = self::profile( [ $settings ] );
		}

		return $profiles;
	}

	/**
	 * Profile for a set of post types.
	 *
	 * @param array<int,array{filterable:array<int,string>,sortable:array<int,string>}> $settings
	 * @return array{facets:array<int,string>,sorts:array<int,string>}
	 */
	public static function profile( array $settings ): array {
		if ( empty( $settings ) ) {
			return [ 'facets' => [], 'sorts' => [ 'relevance' ] ];
		}

		$filterable = self::intersect( array_column( $settings, 'filterable' ) );
		$sortable   = self::intersect( array_column( $settings, 'sortable' ) );

		$sorts = [];
		foreach ( self::SORTS as $sort => $field ) {
			if ( null === $field || in_array( $field, $sortable, true ) ) {
				$sorts[] = $sort;
			}
		}

		return [
			'facets' => array_values( array_intersect( self::FACET_FIELDS, $filterable ) ),
			'sorts'  => $sorts,
		];
	}

	/**
	 * Data the editor uses for its notes.
	 *
	 * @return array{active:bool,profiles:array<string,array{facets:array<int,string>,sorts:array<int,string>}>}
	 */
	public static function editor_data(): array {
		return [
			'active'   => self::loupe_available(),
			'profiles' => self::profiles( self::post_types() ),
		];
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
