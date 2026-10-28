# Build a search page with Loupe Search Block

This guide takes you from installation to a working search page, then adds author, date, and custom-field filters. Start with the basic search; add only the filters your visitors need.

[Back to the README](README.md)

## Before you start

You need:

- A WordPress site running WordPress 6.9 or later and PHP 8.3 or later.
- Administrator access to install plugins and change search settings.
- Some published content with words you can search for.

The two plugins have different jobs:

| Plugin | What it does |
| --- | --- |
| [Loupe Search](https://wordpress.org/plugins/loupe-search/) 1.4.0+ | Indexes your content and runs searches |
| [Loupe Search Block](https://github.com/soderlind/loupe-search-block/releases) | Displays the search input, results, and filters |

## 1. Install both plugins

1. Install and activate **Loupe Search**, following its [installation instructions](https://github.com/soderlind/loupe-search#installation).
2. Download `loupe-search-block.zip` from a [Loupe Search Block release](https://github.com/soderlind/loupe-search-block/releases).
3. In WordPress, go to **Plugins → Add New Plugin → Upload Plugin**.
4. Select the ZIP, click **Install Now**, then **Activate Plugin**.

Use the ready-to-install release asset, not the **Source code (zip)** download. The source archive does not include the compiled block assets.

**Checkpoint:** Both plugins appear as active under **Plugins**.

## 2. Choose your searchable content and build the index

1. Go to **Settings → Loupe Search → Fields**.
2. In **Post Types**, select the content types visitors should be able to search, such as **Posts** and **Pages**. Keep the existing selections you still need.
3. Review the fields for each selected content type. Keep **Post Title** (`post_title`) and **Post Content** (`post_content`) **Indexable** so searches can match them.
4. Save the settings.
5. Open the **Dashboard** tab and click **Reindex now**.
6. Keep the tab open until reindexing finishes, then check **Index health**.

**Checkpoint:** The selected content types have an index. Repeat the save-and-reindex steps whenever you change post types or field settings.

### What do the field switches mean?

| Field setting | Use it when… | Example |
| --- | --- | --- |
| **Indexable** | Loupe Search should include the field | A post title |
| **Filterable** | Visitors should be able to narrow results by the field | Author or reading level |
| **Sortable** | Visitors should be able to order results by the field | Publish date or title |

A field used for filtering or sorting must also be **Indexable**. A block switch controls whether a feature is shown; it does not change these index settings.

## 3. Add the block to a page

1. Go to **Pages → Add New Page**, or edit an existing page.
2. Give the page a title, such as **Search the library**.
3. Click the block inserter **+** and search for **Loupe Search**.
4. Insert **Loupe Search**, not WordPress's standard **Search** block.
5. With the block selected, open the editor's settings sidebar and select the **Block** tab.
6. In **Search**, set a helpful **Label**, such as `Find an article`, and a **Placeholder**, such as `Search topics or keywords…`.
7. Leave **Results per page** at 10 for now.
8. Publish or update the page, then open its public URL.
9. Type a word that appears in one of your published posts.

**Checkpoint:** Results appear inside the block as you type. Open a result to check that it leads to the right content. Test the live behavior on the front end, not just in the editor preview.

## 4. Enable the filters you need

Checkbox filters are called **facets**. They show values found in the matching results, with counts beside them.

Each filter needs two things:

1. The field enabled in **Settings → Loupe Search → Fields**, followed by saving and reindexing.
2. The corresponding switch enabled in the block's **Filters** panel, followed by updating the page.

For each example below, search for a word that matches several posts. If you have indexed more than one content type, choose **Posts** in the front-end **Type** menu first.

### Categories, tags, and custom taxonomies

1. In Loupe Search's **Fields** tab, find the relevant taxonomy under the content type. Categories use `taxonomy_category`; tags use `taxonomy_post_tag`.
2. Enable **Indexable** and **Filterable**, save, and reindex.
3. In the block's **Filters** panel, leave **Taxonomy facets** on.
4. Update the page and search on the front end.
5. Select a category or tag checkbox.

**Expected result:** Results narrow to that value. Custom taxonomies work the same way when their fields are filterable. A group without matching values is not shown.

### Authors

1. In the **Fields** tab, find **Post Author** (`post_author`) for Posts.
2. Enable **Indexable** and **Filterable**, save, and reindex.
3. In the block settings, leave **Author filter** on, then update the page.
4. Search on the front end and select an author.

**Expected result:** The **Authors** group shows display names rather than user IDs. Selecting a name narrows results to that author's content.

### Custom fields: a Reading Level example

Use this when your content already stores useful metadata, such as a reading level, topic, or product brand.

1. Using your site's existing custom-field editor or custom-field plugin, give a few published posts a field with the meta key `reading_level`.
2. Give some posts the value `Beginner` and others `Advanced`. Use the same key and consistent text values across the posts.
3. Return to **Settings → Loupe Search → Fields** and find `reading_level` under Posts. If it is not listed, confirm that you have saved it on posts of that type, then reload the settings page.
4. Enable **Indexable** and **Filterable**, save, and reindex.
5. In the block settings, leave **Custom field facets** on. In the checkboxes below it, tick **Reading Level** (all eligible fields are ticked until you change the list), then update the page.
6. Search for a word shared by those posts and select **Beginner** under **Reading Level**.

**Expected result:** Only matching beginner posts remain. The block turns `reading_level` into the heading **Reading Level** automatically.

Prefer fields with a small set of repeated, plain-text values. Unique IDs, long text, serialized objects, and geographic data are not useful checkbox lists. Each block offers every eligible custom field until you untick some under **Custom field facets**, so two blocks on the same page can show different fields. Fields that later stop being filterable are skipped automatically. The block does not create fields or populate their values.

### Published date range

1. In the **Fields** tab, find **Post Date** (`post_date`) for each content type you want to filter.
2. Confirm that it is **Indexable** and **Filterable**, save the field settings, and reindex. Explicitly save these settings even if date options already appear in the block.
3. In the block settings, turn on **Date filter**. It is off by default.
4. Update the page and search on the front end.
5. Enter a **From** date, a **To** date, or both under **Published**.

**Expected result:** Results are limited by their publication date. **From** includes the selected day; **To** includes the whole selected day. Leave either input empty for an open-ended range. Clear both to remove the date restriction.

### Why filters can disappear with “All types”

When a search covers several content types, a field must be filterable for **all** of them. For example, if Posts have `reading_level` but Pages do not, **Reading Level** is hidden for **All types**. Choose **Posts** to use it.

The same shared-field rule applies to date filtering and sorting. It prevents the block from sending filters that some of the searched indexes cannot use.

## 5. Set up sorting and result appearance

1. For date sorting, make **Post Date** (`post_date`) **Indexable** and **Sortable** in Loupe Search.
2. For title sorting, make **Post Title** (`post_title`) **Indexable** and **Sortable**.
3. Save and reindex after changing these settings.
4. Select the block and, in the **Sorting** panel, enable **Sort options**.
5. Choose a **Default sort**, or keep **Relevance** to put the best matches first.
6. In **Results**, leave **Show excerpt** and **Highlight matches** on if you want snippets with matching words highlighted.
7. Use the block's available alignment, spacing, and color controls to fit your theme, then update the page.

**Checkpoint:** On the front end, the **Sort by** menu offers the allowed sort orders: Relevance, Newest first, Oldest first, Title A–Z, and Title Z–A. If only Relevance is available, the sort menu is hidden.

## 6. Test the finished search page

Open the published page, preferably in a logged-out or private browser window:

- Search for a word you know appears in your content.
- Check that matching words are highlighted and result links work.
- Select a content type and try each filter you enabled.
- Combine filters, then clear the checkboxes and date inputs to broaden the results again.
- Change the sort order.
- Search for a word with enough matches to use **Next** and **Previous**. You can temporarily lower **Results per page** in the editor to test this.
- Search for an unlikely phrase to check the no-results message.
- Optionally disable JavaScript and reload: submitting the form should open the site's normal search results page instead of showing live results.

Your search page is ready. Add a link to it in your site's navigation so visitors can find it.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| No Loupe Search block in the inserter | Confirm Loupe Search Block is active and installed from the built release ZIP; check the WordPress and PHP requirements. |
| A message saying Loupe Search must be active | Activate the companion plugin, select at least one searchable content type, save, and reindex. |
| No results for a word you know exists | Check that the content is published and its type is indexed; confirm title/content are Indexable, and reindex. Clear selected filters and date inputs. |
| An author, taxonomy, or custom-field filter is missing | Check the block switch and its help text, and the field's Indexable/Filterable settings. Save and reindex, search for matching content, and try a specific Type instead of All types. |
| A custom field is missing from Fields | Save a value for that field on content of the relevant type, then reload Fields. The block itself does not register custom fields. |
| The date filter gives no results unexpectedly | Explicitly save Post Date as Indexable and Filterable for each searched content type, then reindex. Some indexes may lack the date configuration even when date controls are offered. Check the selected range too. |
| Date or title sort options are missing or ineffective | Save the corresponding field as Indexable and Sortable, reindex, and check that all searched content types allow it. |
| The Type menu is missing | It is hidden when only one content type is indexed, or when **Post type filter** is off. |
| The page navigates away when you search | Without JavaScript, the standard search-form fallback is expected. If you expected live results, check that the compiled assets load and that scripts or REST requests are not blocked. |

For the full list of block settings and developer hooks, return to the [README](README.md#block-settings).
