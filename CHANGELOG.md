# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3] - 2026-10-28

### Added
- Norwegian Bokmål translations for the editor and front end, bundled with the plugin.

## [1.1.2] - 2026-10-28

### Added
- Editor canvas preview shows the search controls enabled for each block. Facet values remain dynamic and load after searching.

### Changed
- Calmer block settings: separate *Filters* and *Sorting* panels, shorter switch labels, and setup hints shown as help text instead of info boxes. Custom field checkboxes are indented under their switch. No attribute changes; existing blocks are unaffected.

## [1.1.1] - 2026-10-28

### Added
- Block setting *Custom fields*: choose which filterable custom fields each block shows as facets. Blocks without a saved choice keep showing every eligible field. Taxonomy and author facets are unchanged.

### Changed
- README rewritten and a step-by-step tutorial (TUTORIAL.md) added.

## [1.1.0] - 2026-10-28

### Added
- Author facet, labelled with author names. Needs *Post Author* (`post_author`) to be *Filterable*.
- Facets for custom taxonomies and for every other *Filterable* field, such as custom fields.
- *Published* date range filter (From / To). Needs `post_date` to be *Filterable*. Off by default.
- Block settings: *Show author filter* (on), *Show custom field facets* (on), *Show date filter* (off). *Show category and tag facets* is now *Show taxonomy facets*.
- Filters `loupe_search_block_facet_fields` and `loupe_search_block_facet_label`.

### Fixed
- Handle custom field names that match inherited JavaScript properties.
- Offer post-prefixed custom fields without exposing core post fields as facets.
- Resolve author labels without a 500-author cutoff.

Completes the filters requested in [soderlind/loupe-search#71](https://github.com/soderlind/loupe-search/issues/71).

## [1.0.0] - 2026-10-27

### Added
- `loupe-search/search` block (Interactivity API): search as you type, with results, pagination, a post type filter, category and tag facets, and sorting (Relevance, Newest, Oldest, Title A–Z, Title Z–A) inside the block.
- Facets and sort options follow Loupe Search's *Filterable* and *Sortable* field settings, read from its public `GET /search-fields` route.
- Highlighted snippets around matched words; the plain excerpt is used when the match is not in the content.
- Plain `?s=` search form fallback without JavaScript.
- Only the settled or submitted query is counted in Loupe Search's Search insights.

Requires Loupe Search 1.4.0 or later. See [soderlind/loupe-search#71](https://github.com/soderlind/loupe-search/issues/71).

[1.1.3]: https://github.com/soderlind/loupe-search-block/compare/1.1.2...1.1.3
[1.1.2]: https://github.com/soderlind/loupe-search-block/compare/1.1.1...1.1.2
[1.1.1]: https://github.com/soderlind/loupe-search-block/compare/1.1.0...1.1.1
[1.1.0]: https://github.com/soderlind/loupe-search-block/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/soderlind/loupe-search-block/releases/tag/1.0.0
