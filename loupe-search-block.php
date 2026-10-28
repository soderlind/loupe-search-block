<?php
/**
 * Loupe Search Block
 *
 * @package   Soderlind\Plugin\LoupeSearchBlock
 * @author    Per Soderlind
 * @license   GPL-2.0-or-later
 *
 * @wordpress-plugin
 * Plugin Name:       Loupe Search Block
 * Plugin URI:        https://github.com/soderlind/loupe-search-block
 * Description:       A search block for Loupe Search: live search-as-you-type, post-type filter, taxonomy, author and custom-field facets, a date filter, and sorting.
 * Version:           1.1.0
 * Author:            Per Soderlind
 * Author URI:        https://soderlind.no
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       loupe-search-block
 * Domain Path:       /languages
 * Requires at least: 6.9
 * Requires PHP:      8.3
 * Requires Plugins:  loupe-search
 */

namespace Soderlind\Plugin\LoupeSearchBlock;

defined( 'ABSPATH' ) || exit;

const VERSION = '1.1.0';
const FILE    = __FILE__;

require_once __DIR__ . '/includes/class-config.php';

add_action( 'init', __NAMESPACE__ . '\\register_block' );
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\editor_data' );

/**
 * Register the block from the build folder.
 */
function register_block(): void {
	$block_dir = __DIR__ . '/build/search';
	if ( ! file_exists( $block_dir . '/block.json' ) ) {
		return;
	}

	$block = register_block_type( $block_dir );
	if ( $block && ! empty( $block->editor_script_handles ) ) {
		wp_set_script_translations( $block->editor_script_handles[ 0 ], 'loupe-search-block', __DIR__ . '/languages' );
	}
}

/**
 * Give the editor the post type profiles it needs for its notes.
 */
function editor_data(): void {
	$block = \WP_Block_Type_Registry::get_instance()->get_registered( 'loupe-search/search' );
	if ( ! $block || empty( $block->editor_script_handles ) ) {
		return;
	}

	wp_add_inline_script(
		$block->editor_script_handles[ 0 ],
		'window.loupeSearchBlock = ' . wp_json_encode( Config::editor_data() ) . ';',
		'before'
	);
}
