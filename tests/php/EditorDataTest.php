<?php

namespace Soderlind\Plugin\LoupeSearchBlock;

use PHPUnit\Framework\TestCase;

function apply_filters( string $hook, $value, ...$args ) {
	return $value;
}

final class EditorDataTest extends TestCase {

	public function test_numeric_custom_field_names_remain_strings_in_editor_selections(): void {
		$types = [
			'post' => [
				'label'      => 'Posts',
				'filterable' => [ '123', 'color' ],
				'sortable'   => [],
			],
		];
		$cache    = new \ReflectionProperty( Config::class, 'types' );
		$original = $cache->getValue();
		$cache->setValue( null, $types );

		try {
			$data = json_decode( json_encode( Config::editor_data(), JSON_THROW_ON_ERROR ), true, 512, JSON_THROW_ON_ERROR );
			$this->assertSame(
				[
					[ 'field' => '123', 'label' => '123', 'postTypes' => [ 'Posts' ] ],
					[ 'field' => 'color', 'label' => 'Color', 'postTypes' => [ 'Posts' ] ],
				],
				$data[ 'customFields' ]
			);
			$selection = Config::custom_field_selection( [ $data[ 'customFields' ][ 0 ][ 'field' ] ] );
			$this->assertSame( [ '123' ], $selection );
			$this->assertSame( [ '123' ], Config::profiles( $types, Config::FACET_KINDS, $selection )[ 'post' ][ 'facets' ] );
		} finally {
			$cache->setValue( null, $original );
		}
	}
}
