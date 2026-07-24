import { Link } from "react-router-dom";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import CalendarCheck from "lucide-react/dist/esm/icons/calendar-check.mjs";
import Gauge from "lucide-react/dist/esm/icons/gauge.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { getToolEvidence, PRODUCT_LAST_TESTED_ISO, PRODUCT_LAST_TESTED_LABEL, PRODUCT_RESPONSIBLE_PARTY } from "../../editorial/toolEvidence.js";

function formatType(type) {
  const labels = {
    "application/pdf": "PDF",
    "application/zip": "ZIP",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "text/html": "HTML",
    "text/plain": "TXT",
  };
  return labels[type] || String(type).split(/[./+-]/).pop().toUpperCase();
}

function formatList(types, fallback) {
  const labels = [...new Set((types || []).map(formatType))];
  return labels.length ? labels.join(", ") : fallback;
}

export function ToolEvidencePanel({ tool }) {
  const evidence = getToolEvidence(tool.id);
  if (!evidence) return null;

  return (
    <section className="tool-evidence" aria-labelledby={`${tool.id}-evidence-heading`}>
      <header className="tool-evidence-heading">
        <div>
          <span className="public-eyebrow">Original product demonstration</span>
          <h3 id={`${tool.id}-evidence-heading`}>See the task, output, and measured release check</h3>
        </div>
        <Link to={ROUTE_PATHS.pdfBenchmark}>Read the benchmark methodology <ArrowRight size={16} /></Link>
      </header>

      <div className="tool-evidence-layout">
        <figure className="tool-evidence-demo">
          <img src={`/editorial/demos/${tool.id}.png`} width="1200" height="675" loading="lazy" alt={evidence.demoAlt} />
          <figcaption>Original PDFArrow demonstration built from the regression scenario for {tool.name}.</figcaption>
        </figure>

        <div className="tool-evidence-details">
          <article className="tool-example-card">
            <span>Realistic example</span>
            <dl>
              <div><dt>Input</dt><dd>{evidence.input}</dd></div>
              <div><dt>Output</dt><dd>{evidence.output}</dd></div>
            </dl>
          </article>
          <article className="tool-measure-card">
            <span><Gauge size={18} /> Measured release result</span>
            <strong>{evidence.result}</strong>
            <p>{evidence.method}. Slow on-device operations are flagged after 30 seconds for owner review.</p>
          </article>
        </div>
      </div>

      <div className="tool-evidence-facts" aria-label={`${tool.name} publication details`}>
        <span><strong>Input</strong>{formatList(tool.supportedInputTypes, "No file input")}</span>
        <span><strong>Output</strong>{formatList(tool.supportedOutputTypes, "In-browser result")}</span>
        <span><ShieldCheck size={17} /><strong>Privacy</strong>Document content stays in this browser for the supported workflow</span>
        <span><CalendarCheck size={17} /><strong>Last tested</strong><time dateTime={PRODUCT_LAST_TESTED_ISO}>{PRODUCT_LAST_TESTED_LABEL}</time> by {PRODUCT_RESPONSIBLE_PARTY}</span>
      </div>
    </section>
  );
}
