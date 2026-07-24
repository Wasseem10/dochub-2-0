import { Link } from "react-router-dom";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileUp from "lucide-react/dist/esm/icons/file-up.mjs";
import Lightbulb from "lucide-react/dist/esm/icons/lightbulb.mjs";
import MousePointer2 from "lucide-react/dist/esm/icons/mouse-pointer-2.mjs";
import { ToolIcon } from "../../tools/ToolIcon.jsx";
import { getRelatedTools, POPULAR_TOOLS } from "../../tools/toolRegistry.js";

const FAQ_TOPICS = Object.freeze({
  "edit-pdf": "editing PDFs",
  "annotate-pdf": "annotating PDFs",
  "pdf-reader": "reading PDFs online",
  "fill-pdf": "filling PDFs",
  "pdf-form-filler": "filling out PDF forms",
  "sign-pdf": "signing PDFs",
  "add-initials": "adding initials to PDFs",
  "add-date-fields": "adding dates to PDFs",
  "request-signatures": "requesting PDF signatures",
  "protect-pdf": "protecting PDFs",
  "review-pdf": "reviewing PDFs",
  "comment-on-pdf": "commenting on PDFs",
});

export function ToolGuideContent({ tool }) {
  const relatedTools = [...getRelatedTools(tool), ...POPULAR_TOOLS]
    .filter((related, index, all) => related.id !== tool.id && all.findIndex((candidate) => candidate.id === related.id) === index)
    .slice(0, 5);
  const actionName = tool.name.replace(/\bPDF\b/gi, "").trim().toLowerCase() || "work with your file";
  const faqTopic = FAQ_TOPICS[tool.id] || `using ${tool.name}`;
  const guideSteps = [
    tool.steps[0] || "Choose a PDF using the upload box above.",
    tool.steps[1] || `Use the ${tool.name} controls in the PDFArrow workspace.`,
    `Review the affected pages and adjust the ${actionName} settings as needed.`,
    "Move through every page to confirm the result is positioned correctly.",
    tool.verificationChecklist[1] || "Compare the result carefully with your source file.",
    tool.steps[2] || "Download your finished PDF when it is ready.",
  ];
  const faqEntries = [...tool.faqEntries, ...tool.troubleshooting]
    .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.question === entry.question) === index);

  return (
    <section className="tool-guide-content" aria-labelledby={`${tool.id}-guide-heading`}>
      <section className="tool-guide-simple-steps" aria-labelledby={`${tool.id}-steps-heading`}>
        <h2 id={`${tool.id}-steps-heading}`}>{tool.name} in three simple steps</h2>
        <div>
          {[
            { title: "Upload your PDF", copy: tool.steps[0], icon: FileUp },
            { title: tool.name, copy: tool.steps[1], icon: MousePointer2 },
            { title: "Download your PDF", copy: tool.steps[2], icon: Download },
          ].map(({ title, copy, icon: Icon }, index) => (
            <article key={title}>
              <span className="tool-guide-step-number">{index + 1}</span>
              <span className="tool-guide-step-icon"><Icon size={34} strokeWidth={1.55} /></span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="tool-guide-workflow" aria-labelledby={`${tool.id}-guide-heading`}>
        <h2 id={`${tool.id}-guide-heading}`}>How to use {tool.name}</h2>
        <div className="tool-guide-workflow-grid">
          <figure>
            <img src="/product-assets/pdfarrow-editor-workspace.png" alt="PDFArrow editor workspace showing a PDF and its editing toolbar" />
          </figure>
          <div className="tool-guide-workflow-copy">
            <ol>
              {guideSteps.map((step, index) => <li key={`${step}-${index}`}><span>{index + 1}</span><p>{step}</p></li>)}
            </ol>
            <aside><Lightbulb size={22} /><p><strong>Tip:</strong> Keep your original PDF until you have reviewed the downloaded result on every important page.</p></aside>
          </div>
        </div>
      </section>

      <section className="tool-guide-related">
        <h2>More tools to work with PDFs</h2>
        <div>{relatedTools.map((related) => <Link key={related.id} to={related.route}><span><ToolIcon name={related.icon} size={25} /></span><div><strong>{related.name}</strong><small>{related.shortDescription}</small></div><ArrowRight size={15} /></Link>)}</div>
      </section>

      <section className="tool-guide-faq" aria-labelledby={`${tool.id}-faq-heading`}>
        <div className="tool-guide-faq-intro">
          <h2 id={`${tool.id}-faq-heading`}>Got questions about {faqTopic}?</h2>
          <p>Find clear answers to the most common questions about this PDF workflow.</p>
          <Link to="/resources">View all help articles <ArrowRight size={15} /></Link>
        </div>
        <div className="tool-guide-faq-list">
          {faqEntries.map((entry, index) => (
            <details key={entry.question} open={index === 0}>
              <summary>{entry.question}<span aria-hidden="true" /></summary>
              <p>{entry.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}
