# PDFArrow SEO Research — July 26, 2026

## Implemented in this pass

1. Added accurate `lastmod` entries to every canonical sitemap URL. Google and Bing both use trustworthy freshness signals to schedule recrawling more effectively.
2. Added `dateModified` to the WebPage structured data emitted by both the interactive metadata layer and static prerender.
3. Removed HowTo rich-result markup because Google deprecated HowTo search results.
4. Removed FAQPage rich-result markup because Google limits that treatment to authoritative government and health sites. The useful on-page FAQ copy remains visible and crawlable.
5. Extended the automated SEO gate so future builds fail when sitemap freshness is missing or deprecated/restricted schema returns.

## Existing strengths verified

- Public routes are statically prerendered with unique titles, descriptions, canonicals, one visible H1, and indexable robots directives.
- The sitemap contains canonical public pages only and excludes private editor, authentication, share, and signing-token routes.
- Tool and comparison pages have crawlable inbound and outbound links.
- Public pages expose descriptive anchors rather than relying on button-only JavaScript navigation.
- Homepage and directory loading budgets remain below the current project threshold.

## Recommended next SEO work

1. Connect Google Search Console and Bing Webmaster Tools, submit the sitemap, and record baseline impressions, indexed-page count, and query groups.
2. Add an IndexNow deployment hook for Bing only after the production secret and deployment environment are available.
3. Use Search Console query data to improve titles and introductory copy on pages already receiving impressions; do not create speculative keyword pages.
4. Add route-level change dates when content begins updating on different schedules, keeping every sitemap `lastmod` verifiably accurate.
5. Monitor Core Web Vitals on real traffic and prioritize routes with impressions before making broad visual or JavaScript changes.

## Primary sources

- Google Search Central: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google Search Central — link best practices: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- Google Search Central — title links: https://developers.google.com/search/docs/appearance/title-link
- Google Search Central — JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google Search Central — HowTo and FAQ changes: https://developers.google.com/search/blog/2023/08/howto-faq-changes
- Bing Webmaster Guidelines: https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a
