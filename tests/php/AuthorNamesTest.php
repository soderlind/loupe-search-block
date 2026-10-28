<?php

namespace Soderlind\Plugin\LoupeSearchBlock;

use PHPUnit\Framework\TestCase;

function get_users( array $args ): array {
	AuthorNamesTest::$query = $args;
	$users = array_map(
		static fn( int $id ): object => (object) [ 'ID' => $id, 'display_name' => "Author $id" ],
		range( 1, 501 )
	);
	return $args[ 'number' ] > 0 ? array_slice( $users, 0, $args[ 'number' ] ) : $users;
}

final class AuthorNamesTest extends TestCase {

	public static array $query = [];

	public function test_names_include_authors_beyond_the_first_500(): void {
		$names = Config::author_names( [ 'post' ] );

		$this->assertCount( 501, $names );
		$this->assertSame( 'Author 501', $names[ '501' ] );
		$this->assertSame( [ 'post' ], self::$query[ 'has_published_posts' ] );
		$this->assertSame( [ 'ID', 'display_name' ], self::$query[ 'fields' ] );
	}

	public function test_no_post_types_skips_the_user_query(): void {
		self::$query = [];

		$this->assertSame( [], Config::author_names( [] ) );
		$this->assertSame( [], self::$query );
	}
}
