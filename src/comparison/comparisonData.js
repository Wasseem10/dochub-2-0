export const COMPARISON_REVIEWED_LABEL = "July 25, 2026";
export const COMPARISON_REVIEWED_ISO = "2026-07-25";

const sharedPdfEnrich = {
  account: "Start supported tools as a guest. An account is optional for saved workspace features.",
  processing: "Supported core workflows run in the browser, so the document does not need to be uploaded for those tasks.",
  editing: "Browser editor with text, signatures, drawing, highlights, images, links, notes, forms, and page tools.",
  signing: "Add your own visual signature in the editor. PDFEnrich is not yet a replacement for a mature enterprise signature-request platform.",
  platforms: "Responsive web app. No native desktop or mobile app is currently offered.",
  price: "PDFEnrich is completely free; no paid plans are offered or planned.",
};

export const COMPARISONS = [
  {
    slug: "dochub",
    company: "DocHub",
    mark: "DH",
    accent: "#ff6a52",
    title: "PDFEnrich vs DocHub",
    seoTitle: "PDFEnrich vs DocHub: PDF editor comparison (2026)",
    description: "Compare PDFEnrich and DocHub across PDF editing, e-signatures, browser processing, integrations, pricing, and account requirements.",
    summary: "Choose PDFEnrich for a lightweight, guest-friendly browser editor. Choose DocHub when signature requests, storage, and business integrations are central to the job.",
    bestForPdfEnrich: "Fast individual PDF work without an account wall",
    bestForCompetitor: "Repeat e-signature and document workflow operations",
    competitorFacts: {
      account: "A free plan is available; plan limits and account-based document workflows apply.",
      processing: "DocHub is a cloud document workspace with secure storage and connected-drive integrations.",
      editing: "PDF editing, annotation, fillable forms, and tracked e-signature workflows.",
      signing: "Signature requests, envelopes, bulk send, reminders, tracking, and team workflows are listed across paid plans.",
      platforms: "Web product with Google Drive, Gmail, Dropbox, OneDrive, and Google Classroom integrations.",
      price: "Free, Basic, Pro, and Site License tiers. DocHub lists a shared limit of three uses per month for core features on Free.",
    },
    rows: [
      ["Start without an account", sharedPdfEnrich.account, "Free plan available, with the fuller workflow centered on an account."],
      ["Document processing", sharedPdfEnrich.processing, "Cloud workspace with secure storage and connected integrations."],
      ["PDF editing", sharedPdfEnrich.editing, "Editing, annotations, forms, and collaborative document workflows."],
      ["E-signatures", sharedPdfEnrich.signing, "The stronger choice for tracked requests, envelopes, bulk send, and team signing."],
      ["Apps & integrations", sharedPdfEnrich.platforms, "Strong Google and cloud-storage integrations; no native desktop app is emphasized."],
      ["Current cost model", sharedPdfEnrich.price, "Free, Basic, Pro, and Site License plans with feature and usage differences."],
    ],
    pdfEnrichReasons: [
      "You want to open a PDF and begin editing without first creating an account.",
      "Keeping supported core processing on your device matters more than cloud storage.",
      "You need a straightforward individual editor without a paid plan.",
    ],
    competitorReasons: [
      "You send documents to other people for tracked signatures.",
      "Your workflow depends on envelopes, folders, bulk send, or other repeat document operations.",
      "Your team needs integrations or business controls such as SSO and a HIPAA BAA option.",
    ],
    sources: [
      ["DocHub pricing and plan comparison", "https://dochub.com/pricing"],
      ["DocHub product overview", "https://www.dochub.com/en/about-us"],
      ["DocHub editing and signing tools", "https://help.dochub.com/knowledge-base/document-editing/an-overview-of-dochubs-pdf-editing-annotation-signing-tools"],
    ],
  },
  {
    slug: "smallpdf",
    company: "Smallpdf",
    mark: "S",
    accent: "#e43d3d",
    title: "PDFEnrich vs Smallpdf",
    seoTitle: "PDFEnrich vs Smallpdf: PDF tool comparison (2026)",
    description: "Compare PDFEnrich and Smallpdf for editing, converting, compressing, signing, AI tools, privacy, apps, and free-use limits.",
    summary: "Choose PDFEnrich for a free, browser-local starting point with a direct editor. Choose Smallpdf for a mature multi-device tool suite, AI features, and a broader commercial ecosystem.",
    bestForPdfEnrich: "Private, account-optional browser PDF tasks",
    bestForCompetitor: "A polished cross-device PDF utility suite",
    competitorFacts: {
      account: "A free tier exists, but document downloads and advanced features are limited by plan.",
      processing: "Online tools process uploaded files; Smallpdf says most tool files are removed from its servers after one hour.",
      editing: "30+ PDF tools, including editing, conversion, compression, OCR, and signing.",
      signing: "Smallpdf bundles Sign.com capabilities with paid subscriptions.",
      platforms: "Web and mobile apps, with Google Drive, Dropbox, and other workflow integrations.",
      price: "Free, Pro, Team, and Business offerings. Exact pricing and plan presentation can vary by market.",
    },
    rows: [
      ["Start without an account", sharedPdfEnrich.account, "Free use is available, with download and feature limits."],
      ["Document processing", sharedPdfEnrich.processing, "Online tools upload files for processing; most are automatically removed after one hour."],
      ["Tool breadth", "A broad set of editing, page, conversion, scan, protection, and review tools.", "A mature suite of 30+ tools, including advanced compression, OCR, and AI features."],
      ["E-signatures", sharedPdfEnrich.signing, "Paid plans include the Sign.com signature product."],
      ["Apps & integrations", sharedPdfEnrich.platforms, "Web and mobile apps plus connected storage workflows."],
      ["Current cost model", sharedPdfEnrich.price, "Free tier with Pro, Team, and Business subscriptions for unlimited and advanced use."],
    ],
    pdfEnrichReasons: [
      "You prefer supported core tasks to run locally in the browser.",
      "You want to enter the editor without signing up or hitting a paid feature wall.",
      "You mainly need focused document work rather than a multi-product subscription.",
    ],
    competitorReasons: [
      "You need a mature mobile app and an established cross-device workflow.",
      "Advanced compression, OCR, AI, or Sign.com are part of your regular work.",
      "You need team administration or a commercial support plan.",
    ],
    sources: [
      ["Smallpdf plans and features", "https://smallpdf.com/pricing"],
      ["Smallpdf support and file security", "https://smallpdf.com/support"],
      ["Smallpdf signature and data handling", "https://smallpdf.com/blog/how-are-signatures-and-data-handled-by-smallpdf"],
    ],
  },
  {
    slug: "ilovepdf",
    company: "iLovePDF",
    mark: "iPDF",
    accent: "#e5322d",
    title: "PDFEnrich vs iLovePDF",
    seoTitle: "PDFEnrich vs iLovePDF: PDF tools compared (2026)",
    description: "Compare PDFEnrich and iLovePDF across browser privacy, PDF editing, batch tools, desktop and mobile apps, integrations, and pricing.",
    summary: "Choose PDFEnrich for account-optional browser work with local processing on supported tasks. Choose iLovePDF for native offline desktop processing, mobile apps, batch work, and business integrations.",
    bestForPdfEnrich: "Immediate browser-first PDF editing",
    bestForCompetitor: "Desktop, mobile, and batch PDF workflows",
    competitorFacts: {
      account: "Many web tools can be tried free; Premium removes processing limits and ads.",
      processing: "Web workflows upload files for processing. iLovePDF says server files are automatically eliminated within two hours; its desktop app processes offline.",
      editing: "Editing, conversion, page tools, OCR, signing, scanning, protection, and batch workflows.",
      signing: "Visual signing tools are available on web and mobile; business offerings add broader document workflows.",
      platforms: "Web, Windows, macOS, iOS, and Android, with Google Drive and Dropbox connections.",
      price: "Free, Premium, and Business plans; Premium spans web, mobile, and desktop.",
    },
    rows: [
      ["Start without an account", sharedPdfEnrich.account, "Free web tools are available, with processing limits and Premium upgrades."],
      ["Document processing", sharedPdfEnrich.processing, "Web files are uploaded and deleted within two hours; desktop processing can stay offline."],
      ["PDF editing", sharedPdfEnrich.editing, "Broad web, mobile, and desktop tool set with batch features."],
      ["E-signatures", sharedPdfEnrich.signing, "Visual signature workflows across web and mobile."],
      ["Apps & integrations", sharedPdfEnrich.platforms, "Native desktop and mobile apps plus Drive and Dropbox integrations."],
      ["Current cost model", sharedPdfEnrich.price, "Free, Premium, and Business plans."],
    ],
    pdfEnrichReasons: [
      "You want a direct browser editor with no account required to start.",
      "You prefer local browser processing for supported web tasks.",
      "You do not need a separate installed application or batch automation.",
    ],
    competitorReasons: [
      "You want a native desktop app that can process files offline.",
      "You regularly process batches or move between desktop and mobile.",
      "You need business integrations, an API, or team administration.",
    ],
    sources: [
      ["iLovePDF feature overview", "https://www.ilovepdf.com/features"],
      ["iLovePDF plans", "https://www.ilovepdf.com/pricing"],
      ["iLovePDF Desktop", "https://www.ilovepdf.com/desktop"],
      ["iLovePDF documentation", "https://www.ilovepdf.com/help/documentation"],
    ],
  },
  {
    slug: "adobe-acrobat",
    company: "Adobe Acrobat",
    mark: "A",
    accent: "#e11d2e",
    title: "PDFEnrich vs Adobe Acrobat",
    seoTitle: "PDFEnrich vs Adobe Acrobat: PDF editor comparison (2026)",
    description: "Compare PDFEnrich and Adobe Acrobat for browser editing, desktop depth, OCR, redaction, e-signatures, AI, integrations, and pricing.",
    summary: "Choose PDFEnrich for a lighter, free, guest-friendly browser workflow. Choose Acrobat for deep desktop editing, advanced OCR and redaction, enterprise signing, AI, and a mature document ecosystem.",
    bestForPdfEnrich: "Quick browser work without a subscription",
    bestForCompetitor: "Advanced professional and enterprise PDF work",
    competitorFacts: {
      account: "Reader is free; Acrobat online tools vary, and some actions require sign-in after upload or to save files.",
      processing: "Desktop features can work locally; online tools handle files through Adobe servers and cloud services.",
      editing: "Deep desktop, web, and mobile editing with OCR, redaction, comparison, conversion, forms, and accessibility tools.",
      signing: "Request-signature and enterprise e-signature workflows are part of the Adobe document ecosystem.",
      platforms: "Desktop, web, and mobile apps with Microsoft, Google, and enterprise integrations.",
      price: "Free Reader plus paid Acrobat Standard, Pro, team, and enterprise offerings.",
    },
    rows: [
      ["Start without an account", sharedPdfEnrich.account, "Reader is free; online and cloud workflows may request sign-in."],
      ["Document processing", sharedPdfEnrich.processing, "Desktop tools can process locally; online services handle files on Adobe servers."],
      ["PDF editing", sharedPdfEnrich.editing, "The deeper professional toolkit, including advanced OCR, redaction, comparison, and accessibility."],
      ["E-signatures", sharedPdfEnrich.signing, "Mature request-signature, tracking, and enterprise workflow options."],
      ["Apps & integrations", sharedPdfEnrich.platforms, "Desktop, web, and mobile ecosystem with extensive integrations."],
      ["Current cost model", sharedPdfEnrich.price, "Free Reader plus paid individual, team, and enterprise Acrobat plans."],
    ],
    pdfEnrichReasons: [
      "You need common PDF tasks without buying a subscription.",
      "You want a fast guest workflow with local processing where supported.",
      "A focused browser editor is enough for your document.",
    ],
    competitorReasons: [
      "You need advanced OCR, professional redaction, accessibility remediation, or prepress depth.",
      "Your organization already uses Adobe desktop, cloud, or enterprise signing products.",
      "You need mature administration, integrations, compliance controls, or vendor support.",
    ],
    sources: [
      ["Adobe Acrobat plan comparison", "https://www.adobe.com/acrobat/pricing/compare-versions.html"],
      ["Adobe Acrobat product overview", "https://www.adobe.com/acrobat.html"],
      ["Adobe online file handling example", "https://www.adobe.com/acrobat/online/delete-pdf-pages.html"],
      ["Adobe Acrobat FAQ", "https://helpx.adobe.com/ae_en/acrobat/faq.html"],
    ],
  },
  {
    slug: "sejda",
    company: "Sejda",
    mark: "SJ",
    accent: "#6b5bd2",
    title: "PDFEnrich vs Sejda",
    seoTitle: "PDFEnrich vs Sejda: online PDF editor comparison (2026)",
    description: "Compare PDFEnrich and Sejda for online PDF editing, local processing, desktop use, free limits, privacy, and page tools.",
    summary: "Both products make everyday PDF work approachable. PDFEnrich is stronger when you want an account-optional browser workspace with no current hourly task quota; Sejda is stronger when you want an established offline desktop companion.",
    bestForPdfEnrich: "Free browser editing with no current hourly quota",
    bestForCompetitor: "Online tools paired with an offline desktop app",
    competitorFacts: {
      account: "Online tools can be used without an account within published free limits.",
      processing: "Online files are uploaded and automatically deleted after two hours; Sejda Desktop processes locally and offline.",
      editing: "Existing-text editing, annotations, forms, links, signatures, whiteout, and page tools.",
      signing: "Add visual signatures in the editor; not positioned as a full enterprise signature-request suite.",
      platforms: "Web plus Sejda Desktop for macOS, Windows, and Linux.",
      price: "Free online use is limited to documents up to 200 pages or 50 MB and three tasks per hour; paid passes and plans are available.",
    },
    rows: [
      ["Start without an account", sharedPdfEnrich.account, "Guest use is available within published free limits."],
      ["Document processing", sharedPdfEnrich.processing, "Online files upload and auto-delete after two hours; Desktop keeps processing local."],
      ["PDF editing", sharedPdfEnrich.editing, "Strong existing-text editing plus annotations, forms, signatures, links, and whiteout."],
      ["E-signatures", sharedPdfEnrich.signing, "Visual signing in the editor rather than an enterprise request platform."],
      ["Apps & integrations", sharedPdfEnrich.platforms, "Native desktop app for macOS, Windows, and Linux."],
      ["Current cost model", sharedPdfEnrich.price, "Published free online limits plus paid weekly, monthly, and team options."],
    ],
    pdfEnrichReasons: [
      "You want supported browser tasks to stay on your device.",
      "You need more than three quick browser tasks in an hour.",
      "You want one browser workspace that can continue into broader review tools.",
    ],
    competitorReasons: [
      "You need an installed desktop app that works offline.",
      "Editing existing PDF text is your main task and Sejda's published limits fit.",
      "You prefer transparent per-hour and document-size limits before starting.",
    ],
    sources: [
      ["Sejda online PDF editor and free limits", "https://www.sejda.com/en/pdf-editor"],
      ["Sejda Desktop", "https://www.sejda.com/desktop"],
      ["Sejda organize PDF tool", "https://www.sejda.com/en/organize-pdf"],
    ],
  },
];

export const COMPARISON_PATHS = [
  "/compare",
  ...COMPARISONS.map(({ slug }) => `/compare/pdfenrich-vs-${slug}`),
];

/** @param {string} slug */
export function comparisonPath(slug) {
  return `/compare/pdfenrich-vs-${slug}`;
}

/** @param {string} [slug] */
export function getComparisonBySlug(slug = "") {
  const normalized = slug.replace(/^pdfenrich-vs-/, "");
  return COMPARISONS.find((comparison) => comparison.slug === normalized);
}

/** @param {(typeof COMPARISONS)[number]} comparison */
export function comparisonAdvantageCards(comparison) {
  return [
    { title: "Start immediately", body: comparison.pdfEnrichReasons[0] },
    { title: "Keep control of the file", body: comparison.pdfEnrichReasons[1] },
    { title: "Keep the workflow simple", body: comparison.pdfEnrichReasons[2] },
    {
      title: "Know the tradeoff",
      body: `PDFEnrich is not trying to replace ${comparison.company} for ${comparison.bestForCompetitor.toLowerCase()}. It is designed to make common individual PDF work faster to begin.`,
    },
  ];
}

/** @param {(typeof COMPARISONS)[number]} comparison */
export function comparisonPlanRows(comparison) {
  return [
    ["Free access", "PDFEnrich is completely free, with no watermark, subscription, or forced signup.", comparison.competitorFacts.price],
    ["Account requirement", sharedPdfEnrich.account, comparison.competitorFacts.account],
    ["Paid and team options", "PDFEnrich has no paid plans, and none are planned.", `${comparison.company} offers established paid options. Check its official pricing page for current regional prices and billing terms.`],
  ];
}

/** @param {(typeof COMPARISONS)[number]} comparison */
export function comparisonFaqEntries(comparison) {
  return [
    {
      question: `Is PDFEnrich better than ${comparison.company}?`,
      answer: `It depends on the workflow. PDFEnrich is the simpler choice for ${comparison.bestForPdfEnrich.toLowerCase()}. ${comparison.company} is the stronger choice for ${comparison.bestForCompetitor.toLowerCase()}.`,
    },
    {
      question: `Does PDFEnrich support the same platforms as ${comparison.company}?`,
      answer: `PDFEnrich is a responsive web app and does not currently offer native desktop or mobile apps. ${comparison.competitorFacts.platforms}`,
    },
    {
      question: `How does PDFEnrich pricing compare with ${comparison.company}?`,
      answer: `PDFEnrich is completely free, with no subscriptions or paid plans planned. ${comparison.competitorFacts.price} Verify the vendor's official pricing page for current prices, taxes, limits, and regional differences.`,
    },
    {
      question: `Can I switch from ${comparison.company} to PDFEnrich?`,
      answer: "Yes for ordinary PDF files: download or keep the document, then open it directly in PDFEnrich. Account history, signature-request audit trails, and proprietary cloud-workspace data are not automatically imported.",
    },
    {
      question: "Can I use PDFEnrich without an account?",
      answer: "Yes. Supported PDFEnrich tools can be started as a guest. An account is optional for saved workspace features.",
    },
    {
      question: "How current is this comparison?",
      answer: `This page was reviewed on ${COMPARISON_REVIEWED_LABEL} using the official vendor sources listed below. Plans and features can change, so verify time-sensitive details with the vendor.`,
    },
  ];
}
