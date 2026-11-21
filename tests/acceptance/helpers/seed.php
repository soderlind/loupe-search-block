<?php
/**
 * Seed the acceptance-test fixtures on the loupe subsite. Idempotent.
 *
 * Run with: wp eval-file tests/acceptance/helpers/seed.php
 * Prints "changed" when fields or fixtures changed (a reindex is needed), else "unchanged".
 */

$changed = false;

// Date sort and the date range filter need post_date Indexable, Filterable and Sortable.
$fields = get_option( 'loupe_search_fields', [] );
foreach ( [ 'post', 'page' ] as $type ) {
	$want = [ 'indexable' => true, 'weight' => 1.0, 'filterable' => true, 'sortable' => true, 'sort_direction' => 'desc' ];
	$have = $fields[ $type ][ 'post_date' ] ?? [];
	if ( empty( $have[ 'indexable' ] ) || empty( $have[ 'filterable' ] ) || empty( $have[ 'sortable' ] ) ) {
		$fields[ $type ][ 'post_date' ] = $want;
		$changed                        = true;
	}
}
if ( $changed ) {
	update_option( 'loupe_search_fields', $fields );
}

$term = static function ( string $name, string $taxonomy ): int {
	$found = term_exists( $name, $taxonomy );
	if ( ! $found ) {
		$found = wp_insert_term( $name, $taxonomy );
	}
	return (int) $found[ 'term_id' ];
};

$per     = get_user_by( 'login', 'per' )->ID;
$pertest = get_user_by( 'login', 'pertest' )->ID;

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

echo $changed ? 'changed' : 'unchanged';
