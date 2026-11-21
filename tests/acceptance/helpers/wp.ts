import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';

const WP_ROOT = process.env.LSB_WP_ROOT ?? path.join( os.homedir(), 'Sites/plugins/app/public' );
const WRAPPER = process.env.LSB_WP_CLI ?? path.join( os.homedir(), '.agents/skills/wp-cli-local/scripts/wp' );
export const SITE_URL = 'http://plugins.local/loupe/';
export const AUTH_DIR = path.join( __dirname, '../.auth' );
export const ADMIN_STATE = path.join( AUTH_DIR, 'admin.json' );
export const SEMANTIC_STASH = path.join( AUTH_DIR, 'semantic.json' );
export const SEED_FILE = path.join( __dirname, 'seed.php' );

export const KEYWORD = 'zephyrlupe';
export const POST_TITLES = [ 'Apple', 'Banana', 'Cherry', 'Date', 'Elder', 'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon', 'Mango', 'Nectarine' ].map( ( n ) => `Zephyrlupe ${ n }` );
export const PAGE_TITLES = [ 'Zephyrlupe Page One', 'Zephyrlupe Page Two' ];
export const ALL_TITLES = [ ...POST_TITLES, ...PAGE_TITLES ];

/** Run WP-CLI on the loupe subsite and return stdout without the wrapper's banner line. */
export function wp( ...args: string[] ): string {
	const out = execFileSync( 'bash', [ WRAPPER, `--url=${ SITE_URL }`, ...args ], {
		cwd: WP_ROOT,
		encoding: 'utf8',
		stdio: [ 'ignore', 'pipe', 'pipe' ],
		timeout: 300_000,
	} );
	return out
		.split( '\n' )
		.filter( ( line ) => ! line.startsWith( '[plugins] wp ' ) )
		.join( '\n' )
		.trim();
}

const SEMANTIC_KEYS = [ 'hybrid_frontend', 'hybrid_rest' ] as const;

/** Write semantic settings without the sanitize callback or the target-change hooks; `remove` keys are unset. */
function putSemantic( values: Record< string, unknown >, remove: string[] = [] ): void {
	const json = JSON.stringify( { values, remove } ).replace( /\\/g, '\\\\' ).replace( /'/g, "\\'" );
	wp( 'eval', `$s = get_option("loupe_semantic_settings", []); if ( ! is_array( $s ) ) { return; } $c = json_decode('${ json }', true); $s = array_diff_key( array_merge( $s, (array) $c["values"] ), array_flip( $c["remove"] ) ); remove_all_filters("sanitize_option_loupe_semantic_settings"); remove_all_actions("update_option_loupe_semantic_settings"); update_option("loupe_semantic_settings", $s);` );
}

type SemanticStash = { values: Record< string, unknown >; absent: string[]; skip?: boolean };

/** Turn hybrid search off for the run, remembering the original values (and absent keys) once. */
export function pauseHybrid(): void {
	if ( ! fs.existsSync( SEMANTIC_STASH ) ) {
		const raw = wp( 'eval', 'echo wp_json_encode( get_option( "loupe_semantic_settings", null ) );' );
		const settings = JSON.parse( raw || 'null' );
		if ( ! settings || typeof settings !== 'object' ) {
			const stash: SemanticStash = { values: {}, absent: [], skip: true };
			fs.writeFileSync( SEMANTIC_STASH, JSON.stringify( stash ) );
			return;
		}
		const stash: SemanticStash = { values: {}, absent: [] };
		SEMANTIC_KEYS.forEach( ( k ) => {
			if ( Object.hasOwn( settings, k ) ) {
				stash.values[ k ] = settings[ k ];
			} else {
				stash.absent.push( k );
			}
		} );
		fs.writeFileSync( SEMANTIC_STASH, JSON.stringify( stash ) );
	}
	const stash: SemanticStash = JSON.parse( fs.readFileSync( SEMANTIC_STASH, 'utf8' ) );
	if ( ! stash.skip ) {
		putSemantic( Object.fromEntries( SEMANTIC_KEYS.map( ( k ) => [ k, false ] ) ) );
	}
}

export function restoreHybrid(): void {
	if ( ! fs.existsSync( SEMANTIC_STASH ) ) {
		return;
	}
	const stash: SemanticStash = JSON.parse( fs.readFileSync( SEMANTIC_STASH, 'utf8' ) );
	if ( ! stash.skip ) {
		putSemantic( stash.values ?? {}, stash.absent ?? [] );
	}
	fs.unlinkSync( SEMANTIC_STASH );
	clearSearchCache();
}

export function clearSearchCache(): void {
	wp( 'eval', 'global $wpdb; $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE \'%loupe\\\\_search\\\\_cache%\'"); wp_cache_flush();' );
}

/** Seed fixtures and field settings; reindex the post types the seed reports. */
export function seed(): void {
	const last = wp( 'eval-file', SEED_FILE ).split( '\n' ).pop() ?? '';
	if ( last.startsWith( 'reindex:' ) ) {
		wp( 'loupe-search', 'reindex', `--post-types=${ last.slice( 'reindex:'.length ) }` );
	}
	clearSearchCache();
}

/** Create a published page containing the block with the given attributes. Returns its ID and URL. */
export function createBlockPage( title: string, attributes: Record< string, unknown > = {} ): { id: number; url: string } {
	const attrs = Object.keys( attributes ).length ? ' ' + JSON.stringify( attributes ) : '';
	const id = Number( wp( 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=${ title }`, `--post_content=<!-- wp:loupe-search/search${ attrs } /-->`, '--porcelain' ) );
	return { id, url: wp( 'post', 'url', String( id ) ) };
}

export function deletePages( ids: number[] ): void {
	if ( ids.length ) {
		wp( 'post', 'delete', ...ids.map( String ), '--force' );
	}
}

/** Page object for one search block on the page. */
export class SearchBlock {
	readonly root: Locator;
	readonly input: Locator;
	readonly status: Locator;
	readonly results: Locator;
	readonly titles: Locator;

	constructor( readonly page: Page ) {
		this.root = page.locator( '.wp-block-loupe-search-search' );
		this.input = this.root.getByRole( 'searchbox' );
		this.status = this.root.getByRole( 'status' );
		this.results = this.root.getByRole( 'list' ).first().getByRole( 'listitem' );
		this.titles = this.results.getByRole( 'link' );
	}

	/** Open the page and wait until the Interactivity API has hydrated the block. */
	async open( url: string ): Promise< void > {
		await this.page.goto( url );
		await this.page.waitForLoadState( 'networkidle' );
		// The controls row is unhidden by the block's init callback.
		const controls = this.root.locator( '.loupe-search-block__controls' );
		if ( await controls.count() ) {
			await expect( controls ).toBeVisible();
		}
	}

	async search( q: string ): Promise< void > {
		await this.input.fill( q );
	}

	/** Assert the status count and the number of results shown on this page. */
	async expectCount( n: number, perPage = 10 ): Promise< void > {
		await expect( this.status ).toHaveText( n === 1 ? '1 result' : `${ n } results` );
		await expect( this.results ).toHaveCount( Math.min( n, perPage ) );
	}

	/** A select (Type, Sort by) or input (From, To) by its label. */
	select( label: string ): Locator {
		// A wrapping <label> includes the option texts, so getByLabel cannot match selects exactly.
		return this.root.getByRole( 'combobox', { name: label, exact: true } ).or( this.root.getByLabel( label, { exact: true } ) );
	}

	facet( group: string ): Locator {
		return this.root.getByRole( 'group', { name: group, exact: true } );
	}

	option( group: string, value: string ): Locator {
		return this.facet( group ).getByRole( 'checkbox', { name: new RegExp( `^${ value.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }\\s+\\d+$` ) } );
	}

	async titleTexts(): Promise< string[] > {
		return ( await this.titles.allInnerTexts() ).map( ( t ) => t.trim() );
	}
}
