# Acceptance criteria: Loupe Search block

The contract for `tests/acceptance/*.spec.ts`. Every test title starts with the ID of its criterion.

## Environment

- Site: `http://plugins.local/loupe/` (Local multisite subsite running the git checkouts of loupe-search, loupe-search-block, loupe-semantic-search). No `webServer`; Local must be running.
- Browser: Chromium desktop. UI language: English.
- Run: `npm run test:acceptance`.
- Global setup (idempotent):
  - Logs in as the Local one-click admin.
  - Makes `post_date` Indexable, Filterable and Sortable for `post` and `page` in `loupe_search_fields`.
  - Seeds the fixtures below, reindexes `post` and `page`.
  - Turns semantic hybrid search off for the run (restored by teardown).
- Each spec creates the pages holding the block in `beforeAll` and deletes them in `afterAll`. Fixture content is kept.

## Fixtures

Every fixture contains the nonsense keyword `zephyrlupe`, so a search returns only fixtures.

| Title | Type | Date | Author | Categories | Tags | `fakerpress_flag` |
| --- | --- | --- | --- | --- | --- | --- |
| Zephyrlupe Apple | post | 2020-01-15 | per | Acc Alpha | acc-red | acc-yes |
| Zephyrlupe Banana | post | 2020-02-15 | per | Acc Alpha | acc-red | acc-yes |
| Zephyrlupe Cherry | post | 2020-03-15 | per | Acc Alpha | acc-blue | acc-yes |
| Zephyrlupe Date | post | 2020-04-15 | per | Acc Alpha | acc-blue | acc-no |
| Zephyrlupe Elder | post | 2020-05-15 | per | Acc Alpha | | acc-no |
| Zephyrlupe Fig | post | 2020-06-15 | per | Acc Alpha | | acc-no |
| Zephyrlupe Grape | post | 2020-07-15 | per | Acc Alpha | | |
| Zephyrlupe Honeydew | post | 2020-08-15 | per | Acc Beta | acc-red | |
| Zephyrlupe Kiwi | post | 2020-09-15 | pertest | Acc Beta | acc-red | |
| Zephyrlupe Lemon | post | 2020-10-15 | pertest | Acc Beta | acc-blue | |
| Zephyrlupe Mango | post | 2020-11-15 | pertest | Acc Beta | acc-blue | |
| Zephyrlupe Nectarine | post | 2020-12-15 | pertest | Acc Beta | | |
| Zephyrlupe Page One | page | 2021-01-15 | per | | | |
| Zephyrlupe Page Two | page | 2021-02-15 | per | | | |

Posts are published at 12:00 on their date.

## Criteria

Actor is the anonymous visitor unless stated.

### Search basics

| ID | Given | When | Then |
| --- | --- | --- | --- |
| AC-01 | A page with the block (defaults) | The visitor types `zephyrlupe` | The status says "14 results" and the result list shows fixture titles |
| AC-02 | Same | The visitor types `zephyrlupe` and presses Enter | The status says "14 results" |
| AC-03 | Same | The visitor types a word that matches nothing | The status says "No results found." |
| AC-04 | Results are shown | The visitor clears the input | The results panel is hidden and the status is empty |
| AC-05 | Highlight and excerpt on | The visitor searches `zephyrlupe` | The matched word is wrapped in `<mark>` in titles and excerpts |
| AC-06 | Highlight off / Show excerpt off | The visitor searches | No `<mark>` appears / no excerpt is shown |

### Type filter and sorting

| ID | Given | When | Then |
| --- | --- | --- | --- |
| AC-07 | Type filter on | The visitor picks Pages, then Posts, then All types | 2 page results, then 12 post results, then 14 results |
| AC-08 | Sort on | The visitor picks Title A–Z, then Title Z–A | Titles are in alphabetical, then reverse alphabetical order |
| AC-09 | Sort on, `post_date` Sortable | The visitor picks Newest first, then Oldest first | Results are in descending, then ascending date order |
| AC-10 | Default sort = Title Z–A | The visitor searches | "Title Z–A" is selected and the first result is the last title alphabetically |

### Facets

| ID | Given | When | Then |
| --- | --- | --- | --- |
| AC-11 | Type = Posts | The visitor checks "Acc Alpha" in Category, then unchecks it | The group shows "Acc Alpha 7" and "Acc Beta 5"; checking shows 7 results; unchecking shows 12 |
| AC-12 | Type = Posts | The visitor checks Alpha and Beta, then Alpha with tag `acc-red` | Two categories give 12 results (OR within a field); Alpha + `acc-red` gives 2 (AND across fields) |
| AC-13 | All types | The visitor checks the author "pertest" | The Author group shows display names, not IDs; the results narrow to 4 |
| AC-14 | Type = Posts | The visitor checks `acc-yes` in the custom field facet | 3 results |
| AC-15 | Type = Posts, "Acc Alpha" checked | The visitor switches to Pages | The Category and Tag groups disappear; 2 results (the category selection is dropped) |

### Date range, pagination and fallbacks

| ID | Given | When | Then |
| --- | --- | --- | --- |
| AC-16 | Date filter on | The visitor sets From 2020-03-01 and To 2020-05-15 | 3 results (Cherry, Date, Elder); the To date includes the whole day |
| AC-17 | Results per page = 5 | The visitor searches and pages through | "Page 1 of 3", Previous disabled; Next moves to page 2 with other titles; on page 3 Next is disabled |
| AC-18 | On page 2 | The visitor changes the sort, or checks a facet | Back on page 1 |
| AC-19 | JavaScript disabled | The visitor submits the form | The browser goes to `/?s=zephyrlupe` |
| AC-20 | The search endpoint fails | The visitor searches | The status says "Search is not available right now. Please try again." |

### Block settings and editor

| ID | Given | When | Then |
| --- | --- | --- | --- |
| AC-21 | Custom label and placeholder; each `show*` toggle off | The page loads and the visitor searches | The custom label and placeholder show; the switched-off Type, Sort, Date and facet controls are absent |
| AC-22 | Admin in the block editor | The admin inserts the block, changes the label, turns Sort options off and publishes | The Search, Filters, Sorting and Results panels exist; the preview shows the new label and no sort select; the front end matches |
