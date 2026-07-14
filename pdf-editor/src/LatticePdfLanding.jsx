import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import FolderPlus from "lucide-react/dist/esm/icons/folder-plus.mjs";
import Grid2X2 from "lucide-react/dist/esm/icons/grid-2x2.mjs";
import Highlighter from "lucide-react/dist/esm/icons/highlighter.mjs";
import LinkIcon from "lucide-react/dist/esm/icons/link.mjs";
import List from "lucide-react/dist/esm/icons/list.mjs";
import Lock from "lucide-react/dist/esm/icons/lock.mjs";
import MessageSquare from "lucide-react/dist/esm/icons/message-square.mjs";
import Pause from "lucide-react/dist/esm/icons/pause.mjs";
import PenLine from "lucide-react/dist/esm/icons/pen-line.mjs";
import Play from "lucide-react/dist/esm/icons/play.mjs";
import Printer from "lucide-react/dist/esm/icons/printer.mjs";
import Save from "lucide-react/dist/esm/icons/save.mjs";
import ScanText from "lucide-react/dist/esm/icons/scan-text.mjs";
import Send from "lucide-react/dist/esm/icons/send.mjs";
import Share2 from "lucide-react/dist/esm/icons/share-2.mjs";
import Star from "lucide-react/dist/esm/icons/star.mjs";
import Type from "lucide-react/dist/esm/icons/type.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import Users from "lucide-react/dist/esm/icons/users.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";
import Zap from "lucide-react/dist/esm/icons/zap.mjs";
import { FOOTER_TOOL_GROUPS, getToolMenuGroups } from "./tools/toolNavigation.js";

const toolGroups = getToolMenuGroups(2).map((group) => ({
  title: group.menuLabel,
  links: group.tools.map((tool) => [tool.name, tool.shortDescription, tool.route]),
}));

export function LatticePdfLanding({
  fileInputRef,
  onUpload,
  onSelectFiles,
  onDropFiles,
  onLogin,
  onSignup,
  onBlankPage,
  uploadError = "",
  uploadStage = { status: "idle", percent: 0, fileName: "" },
  documentCount = 0,
}) {
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState(null);
  const [uploadActive, setUploadActive] = useState(false);
  const [activeStory, setActiveStory] = useState(0);
  const [storyPaused, setStoryPaused] = useState(() => (
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ));
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const isUploading = Boolean(uploadStage?.status && !["idle", "complete", "error"].includes(uploadStage.status));

  const productGroups = [
    {
      title: "PDF workspace",
      links: [
        ["Explore the editor", "Open, edit, sign, and export in one place", "/edit-pdf"],
        ["Smart PDF tools", "Find text and fields without hunting", "/features"],
        ["Document dashboard", "Keep every PDF organized", "/app/dashboard"],
      ],
    },
    {
      title: "Core tools",
      links: [
        ["Edit text", "Change existing words and add new copy", "/edit-pdf"],
        ["Sign & fill", "Add signatures, initials, dates, and fields", "/sign-pdf"],
        ["Organize pages", "Merge, reorder, rotate, and delete pages", "/merge-pdf"],
      ],
    },
    {
      title: "Delivery",
      links: [
        ["Collaborate", "Comment and review with your team", "/business"],
        ["Export", "Download a clean, finished PDF", "/features"],
        ["Secure sharing", "Send the right version with confidence", "/security"],
      ],
    },
  ];

  const whyGroups = [
    {
      title: "The RealPDF advantage",
      links: [
        ["Why RealPDF", "A focused workspace built around the document", "/features"],
        ["Browser-first", "No desktop install or setup", "/security"],
        ["One workflow", "Edit through delivery without switching tools", "/business"],
      ],
    },
    {
      title: "For every team",
      links: [
        ["Operations", "Finish forms and approval packets", "/business"],
        ["Legal", "Review and sign contracts", "/business"],
        ["People teams", "Prepare offers and onboarding files", "/business"],
      ],
    },
  ];

  const resourceGroups = [
    {
      title: "Learn",
      links: [
        ["PDF editing guide", "Make precise changes with confidence", "/help"],
        ["eSignature guide", "Send signed files without extra steps", "/help"],
        ["Page organization", "Build clean, useful packets", "/help"],
      ],
    },
    {
      title: "Support",
      links: [
        ["Help center", "Quick answers for common document tasks", "/help"],
        ["Security", "How files and exports are handled", "/security"],
        ["Contact us", "Get help with a workflow", "/contact-sales"],
      ],
    },
  ];

  const platformCards = [
    ["Edit PDFs", "Change text, add content, highlight details, and clean up pages without leaving the file.", Type, "aqua", "editor", true],
    ["Sign & fill", "Place signatures, initials, dates, checkboxes, and reusable fields exactly where they belong.", PenLine, "pink", "sign", false],
    ["Organize pages", "Merge documents, reorder thumbnails, rotate pages, and remove anything that does not belong.", Grid2X2, "yellow", "pages", false],
    ["Review together", "Use comments, highlights, and clear share actions to move a document toward approval.", MessageSquare, "green", "review", false],
  ];

  const habitCards = [
    ["Edit", "Make the exact change directly on the page.", Type, "pink"],
    ["Annotate", "Highlight, draw, whiteout, and leave comments.", Highlighter, "yellow"],
    ["Sign", "Add a typed or drawn signature in seconds.", PenLine, "green"],
    ["Export", "Download, print, or share the finished file.", Download, "aqua"],
  ];

  const stories = [
    ["/cosmic-assets/review-men-52.jpg", "Marcus Lee", "Operations lead", "We can correct a contract, collect the signature, and send the final packet from one calm workspace.", "3x", "faster document turnaround", "aqua"],
    ["/cosmic-assets/review-women-68.jpg", "Sofia Alvarez", "People operations", "Offer letters and onboarding forms finally move without six different tools and endless version checks.", "42h", "saved each quarter", "pink"],
    ["/cosmic-assets/review-men-45.jpg", "Noah Williams", "Independent consultant", "Small PDF fixes no longer turn into a production project. I open the file, make the edit, and deliver.", "100%", "of client packets in one flow", "yellow"],
  ];

  const resourceCards = [
    ["Document library", "Practical guides for editing, signing, organizing, and delivering PDFs.", FileText, "aqua"],
    ["RealPDF academy", "Short walkthroughs that help your team build a faster document workflow.", ScanText, "pink"],
    ["Template center", "Start with useful contracts, forms, packets, and approval-ready documents.", FolderPlus, "green"],
    ["Live support", "Get a clear answer when a document or deadline needs extra attention.", MessageSquare, "purple"],
  ];

  const menuMap = { Tools: toolGroups, Product: productGroups, "Why RealPDF": whyGroups, Resources: resourceGroups };

  useEffect(() => {
    if (storyPaused) return undefined;
    const timer = window.setInterval(() => setActiveStory((value) => (value + 1) % stories.length), 5600);
    return () => window.clearInterval(timer);
  }, [stories.length, storyPaused]);

  useEffect(() => {
    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!motionQuery) return undefined;
    const pauseForReducedMotion = (event) => {
      if (event.matches) setStoryPaused(true);
    };
    motionQuery.addEventListener?.("change", pauseForReducedMotion);
    return () => motionQuery.removeEventListener?.("change", pauseForReducedMotion);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setActiveMenu(null);
      setMobileMenuOpen(false);
      setMobileSubmenu(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const uploadClick = () => {
    if (onSelectFiles) onSelectFiles();
    else fileInputRef.current?.click();
  };

  const closeMenus = () => {
    setActiveMenu(null);
    setMobileMenuOpen(false);
    setMobileSubmenu(null);
  };

  const scrollToPlatform = () => {
    closeMenus();
    document.querySelector("#platform")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitAssistant = (event) => {
    event.preventDefault();
    if (!assistantInput.trim()) return;
    setAssistantReply("This guide does not analyze documents yet. Open the PDF tools directory to choose a currently supported workflow.");
    setAssistantInput("");
  };

  const openAssistant = (message) => {
    setAssistantReply(message);
    setAssistantOpen(true);
  };

  return (
    <main className="lpdf-page">
      <input ref={fileInputRef} className="hidden-input" type="file" accept="application/pdf" onChange={(event) => { setUploadActive(false); onUpload(event); }} />

      {announcementVisible && (
        <div className="lpdf-announcement">
          <RouterLink to="/features"><span>New</span> Smart PDF text tools are here <b>See what’s new</b></RouterLink>
          <button type="button" aria-label="Close announcement" onClick={() => setAnnouncementVisible(false)}><X size={18} /></button>
        </div>
      )}

      <header className="lpdf-header">
        <RouterLink className="lpdf-brand" to="/" onClick={closeMenus} aria-label="RealPDF home"><span><FileText size={22} /></span><strong>RealPDF</strong></RouterLink>
        <nav className="lpdf-desktop-nav" aria-label="Primary navigation">
          {Object.keys(menuMap).map((label) => (
            <button key={label} type="button" className={activeMenu === label ? "is-active" : ""} aria-expanded={activeMenu === label} onClick={() => setActiveMenu(activeMenu === label ? null : label)}>{label}<ChevronDown size={14} /></button>
          ))}
          <RouterLink to="/business" onClick={() => setActiveMenu(null)}>Customers</RouterLink>
          <RouterLink to="/security" onClick={() => setActiveMenu(null)}>Security</RouterLink>
        </nav>
        <div className="lpdf-header-actions">
          <button className="lpdf-login" type="button" onClick={onLogin}>Log in</button>
          <button className="lpdf-primary lpdf-nav-cta" type="button" onClick={uploadClick}>Open a PDF</button>
          <button className="lpdf-menu-button" type="button" aria-label="Menu" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((value) => !value)}>{mobileMenuOpen ? <X size={22} /> : <List size={22} />}</button>
        </div>

        {activeMenu && (
          <div className="lpdf-mega-menu" role="navigation" aria-label={`${activeMenu} menu`}>
            <div className={`lpdf-mega-grid ${activeMenu === "Tools" ? "is-tools-menu" : ""}`}>
              {menuMap[activeMenu].map((group) => (
                <section key={group.title}><small>{group.title}</small>{group.links.map(([title, copy, href]) => <RouterLink key={title} to={href} onClick={() => setActiveMenu(null)}><strong>{title}</strong><span>{copy}</span></RouterLink>)}</section>
              ))}
              <aside><div className="lpdf-mega-preview"><img src="/cosmic-assets/3d-upload.png" alt="PDF upload workspace preview" /></div><strong>{activeMenu === "Tools" ? "All PDF tools" : "From file to finished PDF"}</strong><p>{activeMenu === "Tools" ? "Browse all 68 tool pages with clear availability labels." : "See how the full workspace stays centered on the document."}</p>{activeMenu === "Tools" ? <RouterLink className="lpdf-mega-all-tools" to="/tools" onClick={closeMenus}>View all PDF tools <ChevronDown size={14} /></RouterLink> : <button type="button" onClick={scrollToPlatform}>Take the tour <ChevronDown size={14} /></button>}</aside>
            </div>
          </div>
        )}

        {mobileMenuOpen && (
          <nav className="lpdf-mobile-nav" aria-label="Mobile navigation">
            {Object.keys(menuMap).map((label) => (
              <div key={label}>
                <button type="button" aria-expanded={mobileSubmenu === label} onClick={() => setMobileSubmenu(mobileSubmenu === label ? null : label)}>{label}<ChevronDown size={16} /></button>
                {mobileSubmenu === label && <section>{menuMap[label].flatMap((group) => group.links).map(([title, , href]) => <RouterLink key={title} to={href} onClick={closeMenus}>{title}<ChevronDown size={14} /></RouterLink>)}</section>}
              </div>
            ))}
            <RouterLink to="/business" onClick={closeMenus}>Customers</RouterLink><RouterLink to="/security" onClick={closeMenus}>Security</RouterLink><button type="button" className="lpdf-mobile-login" onClick={onLogin}>Log in</button>
          </nav>
        )}
      </header>

      <section id="top" className="lpdf-hero">
        <div className="lpdf-hero-copy">
          <h1>PDFs + AI:<br />Working better together</h1>
          <p>Join fast-moving teams using RealPDF to edit, sign, organize, and deliver every PDF from one trusted workspace.</p>
          <div className="lpdf-hero-actions"><button type="button" className="lpdf-primary" onClick={uploadClick}><Upload size={17} /> Upload a PDF</button><button type="button" className="lpdf-secondary" onClick={scrollToPlatform}>Take a tour</button></div>
        </div>
        <section
          className={`lpdf-hero-dropzone ${uploadActive ? "is-active" : ""}`}
          aria-label="Upload a PDF"
          onDragEnter={(event) => { event.preventDefault(); setUploadActive(true); }}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setUploadActive(false); }}
          onDrop={(event) => { event.preventDefault(); setUploadActive(false); const { files } = event.dataTransfer; if (onDropFiles) onDropFiles(files); else onUpload({ target: { files, value: "" } }); }}
        >
          <Upload className="lpdf-drop-icon" size={58} strokeWidth={1.8} aria-hidden="true" />
          <h2>{uploadActive ? "Drop your PDF to open it" : isUploading ? "Opening your PDF" : "Drop your PDF here to get started"}</h2>
          <button type="button" className="lpdf-drop-button" onClick={uploadClick} disabled={isUploading}><Zap size={25} strokeWidth={2.2} aria-hidden="true" /> {isUploading ? "Opening PDF…" : "Upload from your device"}</button>
          <div className={`lpdf-drop-feedback ${uploadError ? "is-error" : ""}`} aria-live="polite">
            <p role={uploadError ? "alert" : undefined}>{uploadError || (isUploading ? `${uploadStage.status}${uploadStage.fileName ? ` · ${uploadStage.fileName}` : ""}` : "PDF documents up to 8 MB")}</p>
            {isUploading && <div className="lpdf-drop-progress" role="progressbar" aria-label="PDF upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadStage.percent || 0}><span style={{ width: `${uploadStage.percent || 0}%` }} /></div>}
          </div>
        </section>
      </section>

      <div className="lpdf-trust-strip" aria-label="Popular PDF workflows">{["Contracts", "Offer letters", "Invoices", "Forms", "Resumes", "Approval packets"].map((item) => <span key={item}>{item}</span>)}</div>

      <section id="platform" className="lpdf-section lpdf-platform">
        <div className="lpdf-section-heading lpdf-split-heading"><div><RouterLink className="lpdf-pill" to="#platform">Platform overview <ChevronDown size={14} /></RouterLink><h2>High-performing documents are built here</h2></div><p>RealPDF is your team’s daily destination for PDFs, combining focused editing and smart tools to move every file from draft to done. <button type="button" onClick={scrollToPlatform}>Take a tour</button></p></div>
        <div className="lpdf-platform-grid">
          {platformCards.map(([title, copy, Icon, tone, visual, wide]) => (
            <article key={title} className={`lpdf-platform-card tone-${tone} ${wide ? "is-wide" : ""}`}>
              <header><span><Icon size={23} /></span><button type="button" onClick={uploadClick} aria-label={`Start with ${title}`}><ChevronDown size={18} /></button></header><h3>{title}</h3><p>{copy}</p>
              {visual === "editor" && <img src="/product-assets/dashboard-pass-3.png" alt="RealPDF editing dashboard" />}
              {visual === "sign" && <div className="lpdf-feature-panel"><PenLine size={36} /><strong>Signature ready</strong><span>Place and export</span></div>}
              {visual === "pages" && <div className="lpdf-page-stack"><FileText size={48} /><FileText size={48} /><FileText size={48} /></div>}
              {visual === "review" && <div className="lpdf-feature-panel"><MessageSquare size={36} /><strong>2 comments resolved</strong><span>Ready for approval</span></div>}
            </article>
          ))}
        </div>
      </section>

      <section id="smart-tools" className="lpdf-ai-section">
        <div className="lpdf-section-heading lpdf-centered-heading"><RouterLink className="lpdf-pill lpdf-purple-pill" to="/ai-pdf"><ScanText size={15} /> Planned document AI <ChevronDown size={14} /></RouterLink><h2>Document intelligence is on the roadmap</h2><p>RealPDF does not currently analyze your PDF or generate answers. The planned workflow will add cited answers only after secure processing is connected.</p></div>
        <div className="lpdf-ai-workspace"><header><ScanText size={21} /><strong>AI PDF</strong><span>Coming soon</span></header><div className="lpdf-ai-conversation"><p className="is-question">Planned: ask a question about a document.</p><p className="is-answer">Unavailable today — no document analysis is running and no sample answer is presented as a real result.</p></div><RouterLink to="/ai-pdf">See the planned workflow <ChevronDown size={15} /></RouterLink></div>
      </section>

      <section id="habits" className="lpdf-section lpdf-habits">
        <div className="lpdf-section-heading lpdf-split-heading"><div><RouterLink className="lpdf-pill" to="#habits">Everyday workflow <ChevronDown size={14} /></RouterLink><h2>Build better document habits into every deadline</h2></div><p>Turn everyday moments like edits, comments, signatures, and exports into a consistent flow your whole team understands.</p></div>
        <div className="lpdf-habit-track">{habitCards.map(([title, copy, Icon, tone]) => <button key={title} type="button" className={`tone-${tone}`} onClick={uploadClick}><span><Icon size={36} /></span><h3>{title}</h3><p>{copy}</p><ChevronDown className="lpdf-card-arrow" size={17} /></button>)}</div>
      </section>

      <section id="stories" className="lpdf-section lpdf-stories">
        <div className="lpdf-section-heading"><RouterLink className="lpdf-pill" to="/business">Customer stories <ChevronDown size={14} /></RouterLink><h2>Trusted by teams that need the file finished</h2></div>
        <div className="lpdf-story-carousel" aria-label="Customer testimonials">
          <article className={`tone-${stories[activeStory][6]}`}><div className="lpdf-story-person"><img src={stories[activeStory][0]} alt={stories[activeStory][1]} /><span><strong>{stories[activeStory][1]}</strong><small>{stories[activeStory][2]}</small></span></div><blockquote>“{stories[activeStory][3]}”</blockquote><div className="lpdf-story-stat"><strong>{stories[activeStory][4]}</strong><span>{stories[activeStory][5]}</span></div></article>
          <div className="lpdf-story-controls"><button type="button" aria-label="Previous story" onClick={() => setActiveStory((activeStory - 1 + stories.length) % stories.length)}><ChevronDown size={20} /></button><span>{activeStory + 1} / {stories.length}</span><button className="lpdf-story-toggle" type="button" aria-label={storyPaused ? "Play rotating stories" : "Pause rotating stories"} aria-pressed={storyPaused} onClick={() => setStoryPaused((value) => !value)}>{storyPaused ? <Play size={17} /> : <Pause size={17} />}</button><button type="button" aria-label="Next story" onClick={() => setActiveStory((activeStory + 1) % stories.length)}><ChevronDown size={20} /></button></div>
        </div>
      </section>

      <section id="integrations" className="lpdf-integrations">
        <RouterLink className="lpdf-pill lpdf-light-pill" to="/integrations">Integrations <ChevronDown size={14} /></RouterLink><h2>Connect everything. Keep every version aligned.</h2><p>Move PDFs between the storage, communication, and delivery tools your team already uses.</p>
        <div className="lpdf-integration-track">{[[FolderPlus, "Drive"], [LinkIcon, "Dropbox"], [Share2, "Share"], [Send, "Email"], [Users, "Teams"], [Save, "Cloud"], [Printer, "Print"]].map(([Icon, label]) => <button key={label} type="button" onClick={() => openAssistant(`${label} workflows connect at the export step. Upload a PDF, finish the document, then choose the matching delivery option.`)} title={`Ask about ${label}`}><Icon size={29} /><span>{label}</span></button>)}</div>
      </section>

      <section id="resources" className="lpdf-section lpdf-resources">
        <div className="lpdf-section-heading"><span className="lpdf-eyebrow">Resources</span><h2>Power your document workflow</h2></div>
        <div className="lpdf-resource-grid">{resourceCards.map(([title, copy, Icon, tone]) => <article key={title} className={`tone-${tone}`}><div><Icon size={56} /></div><h3>{title}</h3><p>{copy}</p><button type="button" onClick={() => openAssistant(`${title} can help with your next document. Tell me what kind of PDF you are working on and I’ll point you to the right workflow.`)} aria-label={`Learn about ${title}`}><ChevronDown size={17} /></button></article>)}</div>
      </section>

      <section id="security" className="lpdf-outro">
        <div className="lpdf-review-badges"><span><Lock size={19} /> Secure browser workspace</span><span><CheckCircle2 size={19} /> Export-ready PDFs</span><span><Star size={19} fill="currentColor" /> Built for focused work</span></div><h2>Your documents are your business</h2><p>Keep every edit, signature, and final version moving in one trusted workspace.</p><div><button type="button" className="lpdf-primary" onClick={uploadClick}>Upload a PDF</button><button type="button" className="lpdf-secondary" onClick={onBlankPage}>Start a blank document</button></div>
      </section>

      <footer className="lpdf-footer">
        <div className="lpdf-footer-grid">
          {FOOTER_TOOL_GROUPS.map((group) => <section key={group.label}><small>{group.label}</small>{group.tools.map((tool) => <RouterLink key={tool.id} to={tool.route}>{tool.name}</RouterLink>)}</section>)}
        </div>
        <div className="lpdf-footer-bottom"><RouterLink className="lpdf-brand" to="/"><span><FileText size={20} /></span><strong>RealPDF</strong></RouterLink><p><RouterLink to="/tools">View all 68 PDF tools</RouterLink>{documentCount ? ` · ${documentCount} document${documentCount === 1 ? "" : "s"} in your workspace` : " · Clear availability on every workflow."}</p><span>© 2026 RealPDF</span></div>
      </footer>

      <aside id="assistant" className={`lpdf-assistant ${assistantOpen ? "is-open" : ""}`}>
        {assistantOpen && <div id="lpdf-assistant-panel" className="lpdf-assistant-panel"><header><span><MessageSquare size={18} /></span><div><strong>RealPDF guide</strong><small>Static workflow help</small></div><button type="button" aria-label="Close guide" onClick={() => setAssistantOpen(false)}><X size={18} /></button></header><p>This guide can point you to a tool, but it does not read or analyze documents.</p>{assistantReply && <p className="is-reply">{assistantReply}</p>}<form onSubmit={submitAssistant}><input aria-label="Ask about a PDF workflow" value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} placeholder="Describe your PDF task" /><button type="submit" aria-label="Send question"><Send size={17} /></button></form></div>}
        <button type="button" className="lpdf-assistant-trigger" aria-expanded={assistantOpen} aria-controls="lpdf-assistant-panel" onClick={() => setAssistantOpen((value) => !value)}><span><MessageSquare size={18} /></span> PDF workflow guide</button>
      </aside>
    </main>
  );
}
