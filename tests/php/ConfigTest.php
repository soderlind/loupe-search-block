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

	public function test_facets_keep_display_order_and_ignore_other_fields(): void {
		$type = [
			'label'      => 'Products',
			'filterable' => [ 'taxonomy_post_tag', 'taxonomy_product_cat', 'taxonomy_category' ],
			'sortable'   => [],
		];

		$this->assertSame( [ 'taxonomy_category', 'taxonomy_post_tag' ], Config::profile( [ $type ] )[ 'facets' ] );
	}

	public function test_no_types_means_relevance_only(): void {
		$this->assertSame( [ 'all' => [ 'facets' => [], 'sorts' => [ 'relevance' ] ] ], Config::profiles( [] ) );
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
