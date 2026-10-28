=== Loupe Search Block ===
Contributors: perssoderlind
Tags: search, block, live search, facets, loupe
Requires at least: 6.9
Tested up to: 6.9
Requires PHP: 8.3
Requires Plugins: loupe-search
Stable tag: 1.1.1
License: GPL-2.0-or-later
License URI: http://www.gnu.org/licenses/gpl-2.0.txt

A search block for Loupe Search: live results as you type, a post type filter, taxonomy, author and custom-field facets, a date filter, and sorting.

== Description ==

Loupe Search Block is an add-on to [Loupe Search](https://wordpress.org/plugins/loupe-search/). It adds a **Loupe Search** block that searches your site as visitors type and shows the results inside the block.

**Features**

* Search as you type, with results, facets, sorting and pagination inside the block.
* Post type filter for every post type Loupe Search indexes.
* Taxonomy facets (categories, tags and custom taxonomies) with result counts, for fields marked *Filterable* in Settings → Loupe Search.
* Author facet with author names, when *Post Author* is *Filterable*.
* Facets for any other *Filterable* field, such as a custom field. Choose which custom fields each block shows.
* Published date range filter (From / To), when `post_date` is *Filterable*. Off by default.
* Sort by relevance, newest, oldest, or title A–Z / Z–A. Only sort options allowed in Settings → Loupe Search are shown.
* Highlighted snippets around the matched words.
* Works without JavaScript: the block falls back to a plain search form.
* Only the query a visitor settles on is counted in Loupe Search's Search insights.

The block uses Loupe Search's public REST API only.

== Installation ==

1. Install and activate Loupe Search 1.4.0 or later, and reindex.
2. Install and activate Loupe Search Block.
3. Add the **Loupe Search** block to a page or template.

== Frequently Asked Questions ==

= Why don't I see a facet or the date filter? =

Facets and the date filter are shown only for fields marked *Filterable* in Settings → Loupe Search → Fields (for example *Post Author*, `post_date` or a custom field), and only when enabled in the block settings. Reindex after changing fields. When “All types” is selected, a facet is shown only if every searched post type allows it.

= Why are the title sort options missing? =

Title sorting needs `post_title` to be *Sortable* in Settings → Loupe Search → Fields, and date sorting needs `post_date`.

= Does the block count searches in Search insights? =

Yes, if Search insights is enabled in Loupe Search. Only the query a visitor settles on, or submits with Enter, is counted.

== Changelog ==

= 1.1.1 =
* Choose which custom fields each block shows as facets. Existing blocks keep showing every eligible field.
* README rewritten and a step-by-step tutorial (TUTORIAL.md) added.

= 1.1.0 =
* Added author, custom-field and custom-taxonomy facets, and a Published date range filter.
* Added the `loupe_search_block_facet_fields` and `loupe_search_block_facet_label` filters.

= 1.0.0 =
* Initial release: live search block with post type filter, category and tag facets, sorting, highlighted snippets and pagination.
