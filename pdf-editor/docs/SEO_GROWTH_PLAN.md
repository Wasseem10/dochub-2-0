# Organic growth plan

This plan is designed to maximize qualified unpaid traffic and completed PDF tasks. No legitimate SEO work can guarantee the number-one result: search engines decide rankings per query, device, location, competition, and user intent. The goal is to earn durable rankings through a fast product, genuinely useful pages, original evidence, and trusted mentions.

## What is already implemented

- 88 canonical, indexable public URLs in `sitemap.xml`, covering released tools, category hubs, product pages, and company information.
- Readable HTML prerendered for 95 public routes so crawlers and no-JavaScript visitors can understand every page.
- Unique titles, descriptions, canonical URLs, one H1, crawlable internal links, Open Graph/Twitter metadata, and eligible WebPage, WebSite, Organization, Breadcrumb, HowTo, and selective FAQ structured data.
- No fake ratings or review markup. Ineligible SoftwareApplication markup was removed.
- A real no-index 404 page and no-index headers for account, app, sharing-token, and signing-token routes.
- A stable square favicon, web manifest, responsive WebP homepage images, immutable asset caching, and no homepage preload of PDF.js or Firebase.
- Privacy-safe first-touch acquisition analytics for page views, organic visits, landing pages, uploads, successful exports, sign-ups, logins, and PDF downloads.
- A build-blocking SEO audit: `npm run audit:seo`.

## Priority 0: complete after the final name and domain are chosen

1. Choose a short, pronounceable, distinctive brand that is legally usable. Do not put a long exact-match keyword phrase in the name.
2. Buy the primary `.com` if practical and redirect every alternate hostname to it with permanent 301 redirects.
3. Set `VITE_SITE_URL` and `SITE_URL` to the final HTTPS origin, rebuild, and verify every canonical, sitemap URL, social image, and structured-data URL uses it.
4. Keep the current Vercel URL redirected to the final hostname. Never serve identical indexable copies on two hosts.
5. Create Google Search Console and Bing Webmaster Tools domain properties, verify ownership, submit `/sitemap.xml`, and review indexing errors weekly.
6. Enable IndexNow for the final host so Bing and participating engines can discover added or updated pages sooner. It improves discovery speed, not guaranteed rankings.
7. Update Organization/WebSite markup, email addresses, social profiles, legal pages, and the favicon with the final brand.

## Priority 1: product quality is the SEO moat

Search traffic will not compound if users return to the results because a conversion is inaccurate. Work through the highest-intent tools in this order:

1. Edit PDF, merge, split, compress, PDF to Word, Word to PDF.
2. JPG/PNG to PDF and PDF to JPG/PNG.
3. OCR PDF, sign PDF, protect/unlock, compare PDF.
4. Excel/PowerPoint/HTML conversions and long-tail tools.

For each tool, maintain a test set with simple, complex, scanned, encrypted, malformed, large, and mobile cases. Track:

- successful output rate;
- median and 95th-percentile processing time;
- visual/text fidelity against the source;
- browser/device failure rate;
- upload-to-download conversion;
- repeat-use rate and task feedback.

Do not market a workflow as fully supported until its output passes the test set. Show an accurate file/page/language limitation near the uploader and give a useful recovery path.

## Priority 2: create pages worth citing, not keyword variants

Do not generate hundreds of near-duplicate “best/free/online” pages. Strengthen the existing URL for each search intent.

Each important tool page should eventually include:

- an immediately usable tool above the fold;
- a concise promise that matches what the tool can actually do;
- an original screenshot or short demonstration;
- three clear steps and a realistic example input/output;
- format support, limits, privacy behavior, and troubleshooting;
- a measured fidelity/performance result from the regression test set;
- related tools linked with descriptive anchor text;
- a visible last-tested date and responsible product/company identity;
- accessible image alt text and a 1200-pixel-wide share image.

Build original editorial assets that competitors cannot cheaply copy:

- a quarterly browser PDF conversion/fidelity benchmark with methodology and downloadable sample files;
- an illustrated guide to safely redacting PDFs, with proof that hidden text is removed;
- a scanned-PDF/OCR quality guide by scan quality and document type;
- free, genuinely editable templates with practical completion guidance;
- migration and workflow guides for educators, recruiters, legal operations, real estate, and small businesses;
- transparent privacy, security, architecture, uptime, and incident-history pages.

## Priority 3: earn authority and links

Links must be earned from usefulness, not bought or exchanged at scale.

1. Launch the finished product and original benchmark where PDF users already gather: relevant Product Hunt, Hacker News, Reddit, educator, small-business, developer, and accessibility communities. Participate honestly and follow each community’s promotion rules.
2. Offer the benchmark data, redaction research, templates, or browser-processing engineering write-ups to journalists, newsletters, university resources, and industry bloggers.
3. Create integration/workflow pages only when there is a real integration or demonstrable workflow.
4. Ask users who already recommend the product to link to the most relevant tool page, not always the homepage.
5. Publish reusable sample documents, test fixtures, or an open-source utility when it is genuinely useful and can earn developer citations.
6. Avoid link purchases, automated directory blasts, expired-domain schemes, scraped content, doorway pages, and fake reviews.

## Priority 4: maximize search-result click-through

Once Search Console has enough impressions:

1. Review query and page performance weekly.
2. Prioritize URLs with high impressions, positions 3–15, and below-site-average click-through rate.
3. Rewrite titles/descriptions to state the exact job, differentiator, and constraint without clickbait.
4. Keep titles concise and unique. Do not repeat the brand or “free online” unnaturally.
5. Make the page’s visible H1 and opening promise match the search snippet.
6. Request recrawling for materially improved pages; do not repeatedly submit unchanged URLs.

## Priority 5: improve conversion without hurting trust

The primary funnel is: organic landing → choose file → valid file → task succeeds → download → related/repeat task → optional account.

Run one controlled experiment at a time on high-traffic pages:

- uploader-first versus explanation-first layout;
- “Choose a PDF” versus job-specific CTA copy;
- trust/processing statement directly under the uploader;
- one relevant example file for users who do not have a document ready;
- output preview before download;
- helpful recovery options after validation or conversion failures;
- one contextual next tool after a successful download;
- optional account prompt only after value is delivered.

Guardrails: output success, error rate, processing time, privacy complaints, and search engagement must not worsen. Do not use forced signup, fake urgency, misleading limits, or obstructive popups.

## Measurement scorecard

Review weekly by landing page and traffic source:

| Area | Metrics | Decision use |
| --- | --- | --- |
| Discovery | indexed URLs, valid pages, impressions, non-brand queries | Find crawl/index gaps and new demand |
| Rankings | median position, queries in top 3/10/20 | Prioritize pages close to page one |
| Snippets | CTR by query/page/device | Improve title and description alignment |
| Experience | LCP, INP, CLS at the 75th percentile | Fix real-user speed and stability issues |
| Activation | landing-to-upload and valid-upload rate | Improve intent and file validation |
| Value | upload-to-successful-download rate | Find broken or low-fidelity tools |
| Retention | repeat visitors and second completed task | Measure real product usefulness |
| Authority | earned referring domains to relevant pages | Measure reputation, not raw link count |

Use Search Console as the source for Google query, impression, position, CTR, indexing, and Core Web Vitals data. Use the owner analytics page for privacy-safe product behavior. Never store document names, content, full referrer URLs, or search terms in product analytics.

## Official guidance used

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [How Google Search works](https://developers.google.com/search/docs/fundamentals/how-search-works)
- [Technical requirements and getting started](https://developers.google.com/search/docs/fundamentals/get-started)
- [Sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Core Web Vitals](https://web.dev/articles/vitals)
- [Software app structured-data requirements](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Google AI-search content guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Bing IndexNow](https://www.bing.com/indexnow/getstarted)
