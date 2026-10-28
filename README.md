# Loupe Search Block

Help visitors find the right content without leaving the page. Loupe Search Block adds live search, useful filters, and highlighted results to your WordPress site.

**New here? [Follow the step-by-step tutorial](TUTORIAL.md)** to build your first search page. No coding is needed for the basic setup.

[Quick start](#quick-start) · [Block settings](#block-settings) · [Troubleshooting](TUTORIAL.md#troubleshooting) · [Developer notes](#developer-notes)

## See it in action

The demo shows live search, author and custom-field filters, a published-date range, sorting, and pagination.

https://github.com/user-attachments/assets/2a1d6865-4ebb-41eb-9a22-ca9ca5e46bdb

## What visitors can do

- **Search as they type.** Results update inside the block, with matching words highlighted.
- **Narrow the results.** Filter by content type, category, tag, custom taxonomy, author, or custom field.
- **Choose a date range.** Find content published between two dates.
- **Change the order.** Sort by relevance, newest, oldest, or title.
- **Browse more results.** Move between result pages without reloading the page.

The checkbox filters are also called **facets**. Each value shows a matching-result count. You choose which filters visitors see.

Without JavaScript, the block still works as a standard search form. If Loupe Search's Search insights is enabled, only settled or submitted queries are counted, rather than every keystroke.

## Requirements

- WordPress 6.9 or later
- PHP 8.3 or later
- [Loupe Search](https://wordpress.org/plugins/loupe-search/) 1.4.0 or later, installed and active

Loupe Search builds the search index; this add-on provides the search block.

## Quick start

1. Install and activate **Loupe Search** and **Loupe Search Block**. Use the ready-to-install `loupe-search-block.zip` from [Releases](https://github.com/soderlind/loupe-search-block/releases), not GitHub's **Source code** ZIP.
2. Go to **Settings → Loupe Search → Fields**, choose the content types to search, and save your settings.
3. Open the **Dashboard** tab, click **Reindex now**, and keep it open until indexing finishes.
4. Create or edit a page. Click **+**, search for **Loupe Search**, and insert that block.
5. Publish the page, open it on the front end, and search for a word in your published content.

**Want author, date, or custom-field filters?** The [tutorial](TUTORIAL.md#4-enable-the-filters-you-need) walks through the field settings and block switches you need.

> Turning on a block switch does not enable a field in the search index. Mark the field **Indexable** and **Filterable** in Loupe Search, save, and reindex. Sorting requires **Sortable** too.

## Block settings

Select the block and open its settings sidebar. Settings apply to that block, so different pages can have different search experiences.

| Setting | Default | What it does |
| --- | --- | --- |
| Label | Search | Text above the search input |
| Placeholder | Search… | Hint shown inside the empty input |
| Results per page | 10 | Choose 1–50 in the editor |
| Show post type filter | On | Lets visitors choose Posts, Pages, or another indexed content type; hidden if only one is indexed |
| Show taxonomy facets | On | Checkbox filters for categories, tags, and custom taxonomies |
| Show author filter | On | Checkbox filter showing author names |
| Show custom field facets | On | Checkbox filters for other eligible filterable fields |
| Show date filter | Off | Published **From** and **To** date inputs |
| Show sort options | On | Offers the sort orders allowed by your field settings |
| Default sort | Relevance | Initial result order; falls back to Relevance if unavailable |
| Show excerpt | On | Shows a text snippet below each result |
| Highlight matches | On | Highlights matching words in titles and snippets |

You can also adjust alignment, spacing, and text/background colors with the editor's block controls, where supported by your theme.

**Why might a filter be missing?** It needs an eligible field marked **Filterable**, matching results, and its block switch enabled. With **All types** selected, a field must be available for *every* searched content type. [See the troubleshooting guide](TUTORIAL.md#troubleshooting).


## Developer notes

The block name is `loupe-search/search`. The add-on communicates with Loupe Search through its public REST API only. See the [architecture decision](https://github.com/soderlind/loupe-search/blob/main/docs/adr/0002-search-block-ships-as-add-on.md).

<details>
<summary>Customize facet fields and labels with PHP</summary>

Add these filters in a custom plugin or your child theme:

```php
// Reorder or remove facet fields, e.g. a geo field that cannot be listed as values.
add_filter( 'loupe_search_block_facet_fields', function ( array $facets, array $filterable ) {
	return array_values( array_diff( $facets, [ 'my_geo_field' ] ) );
}, 10, 2 );

// Change a facet's heading.
add_filter( 'loupe_search_block_facet_label', function ( string $label, string $field ) {
	return 'loupe_color' === $field ? 'Colour' : $label;
}, 10, 2 );
```

Fields returned by `loupe_search_block_facet_fields` that are not **Filterable** are dropped.

</details>

<details>
<summary>Build and test from source</summary>

```sh
npm install
composer install
npm run build      # or: npm start
npm test           # Jest
composer test      # PHPUnit
npm run lint:js
```

</details>

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
