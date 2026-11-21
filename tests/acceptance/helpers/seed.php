<?php
/**
 * Seed the acceptance-test fixtures on the loupe subsite. Idempotent.
 *
 * Run with: wp eval-file tests/acceptance/helpers/seed.php
 * Prints "reindex:<types>" with the post types that need a reindex, else "unchanged".
 */

$changed = false;
$reindex = [];

$utils = '\\Soderlind\\Plugin\\LoupeSearch\\WP_Loupe_Utils';
$types = class_exists( $utils ) ? $utils::get_indexed_post_types() : [ 'post', 'page' ];
if ( array_diff( [ 'post', 'page' ], $types ) ) {
	WP_CLI::error( 'Loupe Search must index both post and page. Indexed: ' . implode( ', ', $types ) );
}

// Field flags the suite needs. The "All types" profile uses fields shared by every indexed type.
$need = [];
foreach ( $types as $type ) {
	$need[ $type ] = [
		'post_title'  => [ 'sortable' ],
		'post_author' => [ 'filterable' ],
	];
}
// Loupe Search always advertises post_date, so the date controls only need it on the fixture types.
foreach ( [ 'post', 'page' ] as $type ) {
	$need[ $type ][ 'post_date' ] = [ 'filterable', 'sortable' ];
}
$need[ 'post' ] += [
	'taxonomy_category' => [ 'filterable' ],
	'taxonomy_post_tag' => [ 'filterable' ],
	'fakerpress_flag'   => [ 'filterable' ],
];

$fields = get_option( 'loupe_search_fields', [] );
foreach ( $need as $type => $type_fields ) {
	foreach ( $type_fields as $field => $flags ) {
		$have = $fields[ $type ][ $field ] ?? [];
		$want = $have + [ 'weight' => 1.0, 'sort_direction' => 'desc' ];
		foreach ( array_merge( [ 'indexable' ], $flags ) as $flag ) {
			$want[ $flag ] = true;
		}
		if ( $want != $have ) {
			$fields[ $type ][ $field ] = $want;
			$reindex[ $type ]          = true;
		}
	}
}
if ( $reindex ) {
	update_option( 'loupe_search_fields', $fields );
}

$term = static function ( string $name, string $taxonomy ): int {
	$found = term_exists( $name, $taxonomy );
	if ( ! $found ) {
		$found = wp_insert_term( $name, $taxonomy );
	}
	return (int) $found[ 'term_id' ];
};

$users = [];
foreach ( [ 'per', 'pertest' ] as $login ) {
	$user = get_user_by( 'login', $login );
	if ( ! $user ) {
		WP_CLI::error( "Fixture author '{$login}' is missing. Create the user and rerun." );
	}
	$users[ $login ] = (int) $user->ID;
}
$per     = $users[ 'per' ];
$pertest = $users[ 'pertest' ];

// Title, type, date, author, category, tags, fakerpress_flag.
$fixtures = [
	[ 'Apple', 'post', '2020-01-15', $per, 'Acc Alpha', [ 'acc-red' ], 'acc-yes' ],
	[ 'Banana', 'post', '2020-02-15', $per, 'Acc Alpha', [ 'acc-red' ], 'acc-yes' ],
	[ 'Cherry', 'post', '2020-03-15', $per, 'Acc Alpha', [ 'acc-blue' ], 'acc-yes' ],
	[ 'Date', 'post', '2020-04-15', $per, 'Acc Alpha', [ 'acc-blue' ], 'acc-no' ],
	[ 'Elder', 'post', '2020-05-15', $per, 'Acc Alpha', [], 'acc-no' ],
	[ 'Fig', 'post', '2020-06-15', $per, 'Acc Alpha', [], 'acc-no' ],
	[ 'Grape', 'post', '2020-07-15', $per, 'Acc Alpha', [], '' ],
	[ 'Honeydew', 'post', '2020-08-15', $per, 'Acc Beta', [ 'acc-red' ], '' ],
	[ 'Kiwi', 'post', '2020-09-15', $pertest, 'Acc Beta', [ 'acc-red' ], '' ],
	[ 'Lemon', 'post', '2020-10-15', $pertest, 'Acc Beta', [ 'acc-blue' ], '' ],
	[ 'Mango', 'post', '2020-11-15', $pertest, 'Acc Beta', [ 'acc-blue' ], '' ],
	[ 'Nectarine', 'post', '2020-12-15', $pertest, 'Acc Beta', [], '' ],
	[ 'Page One', 'page', '2021-01-15', $per, '', [], '' ],
	[ 'Page Two', 'page', '2021-02-15', $per, '', [], '' ],
];

foreach ( $fixtures as [ $name, $type, $date, $author, $category, $tags, $flag ] ) {
	$title = 'Zephyrlupe ' . $name;
	$found = get_posts( [ 'title' => $title, 'post_type' => $type, 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids' ] );
	if ( $found ) {
		if ( (int) get_post_field( 'post_author', $found[ 0 ] ) !== $author ) {
			wp_update_post( [ 'ID' => $found[ 0 ], 'post_author' => $author ] );
			$changed = true;
		}
		continue;
	}
	$args = [
		'post_title'   => $title,
		'post_type'    => $type,
		'post_status'  => 'publish',
		'post_author'  => $author,
		'post_date'    => $date . ' 12:00:00',
		'post_content' => sprintf( '<!-- wp:paragraph --><p>The %s fixture mentions zephyrlupe for the search block acceptance tests.</p><!-- /wp:paragraph -->', strtolower( $name ) ),
	];
	if ( 'post' === $type ) {
		$args[ 'post_category' ] = [ $term( $category, 'category' ) ];
		$args[ 'tags_input' ]    = $tags;
	}
	$id = wp_insert_post( $args, true );
	if ( is_wp_error( $id ) ) {
		WP_CLI::error( $id->get_error_message() );
	}
	if ( '' !== $flag ) {
		update_post_meta( $id, 'fakerpress_flag', $flag );
	}
	$changed = true;
}
if ( $changed ) {
	$reindex[ 'post' ] = true;
	$reindex[ 'page' ] = true;
}

echo $reindex ? 'reindex:' . implode( ',', array_keys( $reindex ) ) : 'unchanged';
