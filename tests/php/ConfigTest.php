<?php

use PHPUnit\Framework\TestCase;
use Soderlind\Plugin\LoupeSearchBlock\Config;

final class ConfigTest extends TestCase {

	private const POST = [
		'label'      => 'Posts',
		'filterable' => [ 'post_date', 'post_title', 'taxonomy_category', 'taxonomy_post_tag' ],
		'sortable'   => [ 'post_date', 'post_title' ],
	];

	private const PAGE = [
		'label'      => 'Pages',
		'filterable' => [ 'post_date' ],
		'sortable'   => [ 'post_date' ],
	];

	public function test_single_type_offers_its_facets_and_sorts(): void {
		$this->assertSame(
			[
				'facets' => [ 'taxonomy_category', 'taxonomy_post_tag' ],
				'sorts'  => [ 'relevance', 'newest', 'oldest', 'title_asc', 'title_desc' ],
				'date'   => true,
			],
			Config::profile( [ self::POST ] )
		);
	}

	public function test_all_types_profile_is_the_intersection(): void {
		$profiles = Config::profiles( [ 'post' => self::POST, 'page' => self::PAGE ] );

		$this->assertSame( [ 'all', 'post', 'page' ], array_keys( $profiles ) );
		$this->assertSame( [], $profiles[ 'all' ][ 'facets' ] );
		$this->assertSame( [ 'relevance', 'newest', 'oldest' ], $profiles[ 'all' ][ 'sorts' ] );
		$this->assertSame( [ 'relevance', 'newest', 'oldest' ], $profiles[ 'page' ][ 'sorts' ] );
	}

	public function test_title_sorts_are_hidden_unless_title_is_sortable(): void {
		$post               = self::POST;
		$post[ 'sortable' ] = [];

		$this->assertSame( [ 'relevance' ], Config::profile( [ $post ] )[ 'sorts' ] );
	}

	public function test_facets_are_ordered_taxonomies_author_custom_fields(): void {
		$type = [
			'label'      => 'Products',
			'filterable' => [ 'price', 'post_title', 'taxonomy_post_tag', 'post_author', 'taxonomy_product_cat', 'post_date', 'taxonomy_category', 'color', 'permalink', 'taxonomy_' ],
			'sortable'   => [],
		];

		$this->assertSame(
			[ 'taxonomy_category', 'taxonomy_post_tag', 'taxonomy_product_cat', 'post_author', 'price', 'color' ],
			Config::profile( [ $type ] )[ 'facets' ]
		);
	}

	public function test_facet_kinds_can_be_turned_off(): void {
		$filterable = [ 'taxonomy_category', 'post_author', 'price' ];

		$this->assertSame( [ 'post_author', 'price' ], Config::facet_fields( $filterable, [ Config::KIND_AUTHOR, Config::KIND_CUSTOM ] ) );
		$this->assertSame( [ 'taxonomy_category' ], Config::facet_fields( $filterable, [ Config::KIND_TAXONOMY ] ) );
		$this->assertSame( [], Config::facet_fields( $filterable, [] ) );
	}

	public function test_profiles_pass_kinds_and_intersect_custom_fields(): void {
		$profiles = Config::profiles(
			[
				'post'  => [ 'label' => 'Posts', 'filterable' => [ 'post_author', 'price', 'taxonomy_category' ], 'sortable' => [] ],
				'movie' => [ 'label' => 'Movies', 'filterable' => [ 'price' ], 'sortable' => [] ],
			],
			[ Config::KIND_CUSTOM, Config::KIND_AUTHOR ]
		);

		$this->assertSame( [ 'price' ], $profiles[ 'all' ][ 'facets' ] );
		$this->assertSame( [ 'post_author', 'price' ], $profiles[ 'post' ][ 'facets' ] );
		$this->assertFalse( $profiles[ 'movie' ][ 'date' ] );
	}

	public function test_facet_kind(): void {
		$this->assertSame( Config::KIND_AUTHOR, Config::facet_kind( 'post_author' ) );
		$this->assertSame( Config::KIND_TAXONOMY, Config::facet_kind( 'taxonomy_genre' ) );
		$this->assertSame( Config::KIND_CUSTOM, Config::facet_kind( '_event_venue' ) );
		$this->assertNull( Config::facet_kind( 'post_date' ) );
		$this->assertNull( Config::facet_kind( 'post_content' ) );
		$this->assertNull( Config::facet_kind( 'permalink' ) );
		$this->assertNull( Config::facet_kind( 'taxonomy_' ) );
	}

	public function test_humanize(): void {
		$this->assertSame( 'Event Venue', Config::humanize( '_event_venue' ) );
		$this->assertSame( 'Release Year', Config::humanize( 'release-year' ) );
		$this->assertSame( '__', Config::humanize( '__' ) );
	}

	public function test_no_types_means_relevance_only(): void {
		$this->assertSame( [ 'all' => [ 'facets' => [], 'sorts' => [ 'relevance' ], 'date' => false ] ], Config::profiles( [] ) );
	}

	public function test_names_accepts_strings_and_field_entries(): void {
		$this->assertSame(
			[ 'post_title', 'post_date' ],
			Config::names( [ 'post_title', [ 'field' => 'post_date', 'weight' => 1 ], [ 'weight' => 2 ], '', 'post_title', 7 ] )
		);
	}

	public function test_parse_fields_response_reads_post_types(): void {
		$this->assertSame(
			[
				'post' => [
					'label'      => 'Posts',
					'filterable' => [ 'post_date', 'taxonomy_category' ],
					'sortable'   => [ 'post_date' ],
				],
			],
			Config::parse_fields_response(
				[
					'post_types' => [
						'post' => [
							'label'      => 'Posts',
							'filterable' => [ 'post_date', 'taxonomy_category' ],
							'sortable'   => [ 'post_date' ],
						],
						7      => 'junk',
					],
				]
			)
		);
	}

	public function test_parse_fields_response_rejects_unexpected_data(): void {
		$this->assertSame( [], Config::parse_fields_response( null ) );
		$this->assertSame( [], Config::parse_fields_response( [ 'code' => 'rest_no_route' ] ) );
	}
}
