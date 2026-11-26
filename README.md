# Spicy Food Point

A buildless HTML, CSS, and JavaScript website for Spicy Food Point in Dundiara, near Banikhet, Himachal Pradesh.

Live website: https://spicy-banikhet.netlify.app/

## Local preview

```sh
python3 -m http.server 8765
```

Open http://localhost:8765. No dependency installation or build step is required.

## Regression checks

Use Node.js 22 or later:

```sh
node --test tests/site.test.cjs
```

The checks cover animation progress and reversal, reduced-motion and data-saving fallbacks, short-screen fallback, preference changes, scroll scheduling, active menu visibility, and local links. See `docs/QA-2026-11-26.md` for the browser audit and its limits.

## Netlify publication

The site is published manually using the linked Netlify CLI. A GitHub push alone does not publish it. Publish only the site files, not this entire checkout:

```sh
publish_dir=$(mktemp -d)
git archive HEAD index.html our-thali.html styles.css script.js robots.txt sitemap.xml assets | tar -x -C "$publish_dir"
netlify deploy --prod --no-build --dir "$publish_dir"
```

Keep `.netlify/` out of version control. When the public domain changes, update the canonical URL, social metadata, robots.txt, sitemap.xml, and legacy redirect canonical together.

## Content sources

- Google Maps supplies the restaurant location, phone link, and attributed review excerpts.
- The owner confirmed opening hours of 7 AM–9 PM every day and supplied the storefront photo and printed menu.
- Dish images are AI-generated illustrations and are labelled on the website. Transparent hero cutouts are served as responsive WebP assets; the original source images are retained.
- Prices remain omitted at the owner's request.
