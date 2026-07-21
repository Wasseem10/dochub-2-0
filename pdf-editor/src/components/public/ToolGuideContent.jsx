import { Link } from "react-router-dom";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import CircleHelp from "lucide-react/dist/esm/icons/circle-help.mjs";
import Info from "lucide-react/dist/esm/icons/info.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import { ToolIcon } from "../../tools/ToolIcon.jsx";
import { getRelatedTools } from "../../tools/toolRegistry.js";
import { ToolEvidencePanel } from "./ToolEvidencePanel.jsx";

export function ToolGuideContent({ tool }) {
  const relatedTools = getRelatedTools(tool);

  return (
    <section className="tool-guide-content" aria-labelledby={`${tool.id}-guide-heading`}>
      <header className="tool-guide-intro">
        <span className="public-eyebrow">Complete guide</span>
        <h2 id={`${tool.id}-guide-heading`}>How to use {tool.name} safely</h2>
        <p>{tool.longDescription}</p>
      </header>

      <ToolEvidencePanel tool={tool} />

      <div className="tool-guide-grid">
        <article className="tool-guide-steps">
          <span className="public-eyebrow">Three steps</span>
          <h3>Use the working tool</h3>
          <ol>{tool.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
        </article>
        <article>
          <span className="public-eyebrow">Before sharing</span>
          <h3>Verify the downloaded result</h3>
          <ul>{tool.verificationChecklist.map((item) => <li key={item}><Check size={17} /><span>{item}</span></li>)}</ul>
        </article>
      </div>

      <div className="tool-guide-trust-grid">
        <article className="is-private"><ShieldCheck size={25} /><div><small>Privacy</small><h3>What happens to your file</h3><p>{tool.privacySummary}</p></div></article>
        <article className="is-limit"><Info size={25} /><div><small>File support</small><h3>Supported files and current limits</h3><p>{tool.currentLimitations}</p></div></article>
      </div>

      <section className="tool-guide-use-cases">
        <header><span className="public-eyebrow">Best used for</span><h3>Common {tool.name} tasks</h3></header>
        <div>{tool.useCases.map((useCase) => <article key={useCase}><span style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={20} /></span><strong>{useCase}</strong><p>{tool.shortDescription}</p></article>)}</div>
      </section>

      <div className="tool-guide-answers">
        <section>
          <header><CircleHelp size={23} /><div><small>Troubleshooting</small><h3>Fix common problems</h3></div></header>
          <div>{tool.troubleshooting.map((entry) => <details key={entry.question}><summary>{entry.question}</summary><p>{entry.answer}</p></details>)}</div>
        </section>
        <section>
          <header><CircleHelp size={23} /><div><small>Answers</small><h3>{tool.name} FAQ</h3></div></header>
          <div>{tool.faqEntries.map((entry) => <details key={entry.question}><summary>{entry.question}</summary><p>{entry.answer}</p></details>)}</div>
        </section>
      </div>

      <section className="tool-guide-related">
        <header><span className="public-eyebrow">Continue working</span><h3>Related PDF tools</h3></header>
        <div>{relatedTools.map((related) => <Link key={related.id} to={related.route}><span style={{ background: related.accentColor }}><ToolIcon name={related.icon} size={21} /></span><div><strong>{related.name}</strong><small>{related.shortDescription}</small></div></Link>)}</div>
      </section>
    </section>
  );
}
