# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-27

### Added
- `loupe-search/search` block (Interactivity API): search as you type, with results, pagination, a post type filter, category and tag facets, and sorting (Relevance, Newest, Oldest, Title A–Z, Title Z–A) inside the block.
- Facets and sort options follow Loupe Search's *Filterable* and *Sortable* field settings, read from its public `GET /search-fields` route.
- Highlighted snippets around matched words; the plain excerpt is used when the match is not in the content.
- Plain `?s=` search form fallback without JavaScript.
- Only the settled or submitted query is counted in Loupe Search's Search insights.

Requires Loupe Search 1.4.0 or later. See [soderlind/loupe-search#71](https://github.com/soderlind/loupe-search/issues/71).

[1.0.0]: https://github.com/soderlind/loupe-search-block/releases/tag/1.0.0
