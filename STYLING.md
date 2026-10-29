# Styling the front-end search UI

The Loupe Search block includes default styles for its search form, filters, facets, results, and pagination. You can override them in your theme's stylesheet, a child theme, or **Appearance → Editor → Styles → Additional CSS** (the exact location depends on your theme).

## Scope your styles

In the block editor, select the Loupe Search block and open **Advanced → Additional CSS class(es)**. Enter a class such as `product-search` (without the leading period). WordPress adds it to the block's outer wrapper, so your styles can target only that instance:

```css
.product-search .loupe-search-block__input {
	border-color: #6750a4;
	border-radius: 0.5rem;
}
```

Without a custom class, target `.loupe-search-block` to style every instance. The block also has WordPress's standard block class, `wp-block-loupe-search-search`.

## CSS variables

Set these variables on the wrapper to adjust shared spacing and muted/border colors. They inherit through the block:

```css
.product-search {
	--loupe-search-gap: 1.5rem;
	--loupe-search-muted: #666;
	--loupe-search-border: #d0d0d0;
}
```

The defaults are a `1rem` gap, muted text based on the current text color, and a border based on the current text color. The variables are used for panel and facet spacing, pagination spacing, muted labels and counts, and the input/result borders.

## Main selectors

All selectors below are scoped to the block wrapper. Add your custom class before them (for example, `.product-search .loupe-search-block__result`) to restrict a rule to one block.

| Selector | Element |
| --- | --- |
| `.loupe-search-block__form` | Search form |
| `.loupe-search-block__label` | Search label |
| `.loupe-search-block__field` | Input and submit-button row |
| `.loupe-search-block__input` | Search input |
| `.loupe-search-block__submit` | Search button |
| `.loupe-search-block__controls` | Type, sorting, and date controls |
| `.loupe-search-block__control` | Individual control label and input |
| `.loupe-search-block__dates` | Published-from/to date fieldset |
| `.loupe-search-block__status` | Search status and result count |
| `.loupe-search-block__panel` | Results and facets panel |
| `.loupe-search-block__facets` | Facet groups column |
| `.loupe-search-block__facet` | A facet fieldset |
| `.loupe-search-block__facet-option` | A facet checkbox and its label/count |
| `.loupe-search-block__count` | Facet result count |
| `.loupe-search-block__main` | Main results and pagination column |
| `.loupe-search-block__results` | Results list |
| `.loupe-search-block__result` | Individual result |
| `.loupe-search-block__title` | Result title link |
| `.loupe-search-block__type` | Result content-type label |
| `.loupe-search-block__excerpt` | Result excerpt |
| `.loupe-search-block__pagination` | Previous/next controls and page indicator |

For example, style result titles and separate results with a custom accent:

```css
.product-search .loupe-search-block__title {
	color: #174ea6;
	font-size: 1.15em;
}

.product-search .loupe-search-block__result {
	border-color: #d8e2f0;
	padding-block: 1rem;
}
```

The submit and pagination buttons use the WordPress `.wp-element-button` class, so your theme's button styles may already apply. To override them only in this block, use a scoped selector such as `.product-search .loupe-search-block__submit`.

## Responsive layout and states

When facets are visible, the panel uses a two-column layout at viewport widths of at least `782px`; below that, facets and results stack. Override `.loupe-search-block__panel` or `.loupe-search-block__facets` in a media query if your design needs a different breakpoint or layout.

While a request is loading, the panel receives the `.is-loading` class and the results list is dimmed. Style that state with `.product-search .loupe-search-block__panel.is-loading .loupe-search-block__results`.

The block uses the HTML `hidden` attribute for controls and content that are not currently available. Keep hidden content hidden when overriding display styles; the block's stylesheet enforces `[hidden] { display: none !important; }` so hidden filters and results do not appear prematurely.

## Tips

- Prefer the block's **Styles** controls for its supported text color, background color, margin, and padding before adding CSS.
- Keep focus indicators visible and ensure text, links, controls, and muted text have sufficient contrast.
- The default style for highlighted matches uses the `<mark>` element inside result titles and excerpts. You can customize it with `.product-search mark`.
- Avoid styling internal `data-wp-*` attributes; they are used for live search behavior and may change independently of the CSS classes.
