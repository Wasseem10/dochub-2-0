import {
  Clock3,
  Copy,
  Download,
  FileText,
  Grid2X2,
  Home,
  LayoutPanelTop,
  PenLine,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { BrandWordmark } from "../../components/public/BrandWordmark.jsx";

export function AuthLoadingScreen({ label = "Opening PDFEnrich" }) {
  return (
    <main className="auth-loading-shell" data-testid="auth-loading-screen">
      <div className="auth-loading-dashboard" aria-hidden="true">
        <aside className="auth-loading-rail">
          <BrandWordmark logo />
          <nav>
            <span className="is-active"><Home size={18} /> Home</span>
            <span><FileText size={18} /> Documents</span>
            <span><Clock3 size={18} /> Recent</span>
            <span><PenLine size={18} /> Signatures</span>
            <span><LayoutPanelTop size={18} /> Templates</span>
            <span><Grid2X2 size={18} /> All tools</span>
          </nav>
          <span className="auth-loading-trash"><Trash2 size={18} /> Trash</span>
        </aside>

        <div className="auth-loading-dashboard-main">
          <header>
            <span className="auth-loading-search"><Search size={18} /> Search files, tools or templates…</span>
            <span className="auth-loading-upload"><Upload size={17} /> Upload PDF</span>
            <span className="auth-loading-avatar">LW</span>
          </header>

          <section className="auth-loading-destination">
            <div className="auth-loading-destination-search"><Search size={15} /><span /></div>
            <div className="auth-loading-destination-tools">
              <span><i /><PenLine size={24} /><b /></span>
              <span><i /><Copy size={24} /><b /></span>
              <span><i /><LayoutPanelTop size={24} /><b /></span>
              <span><i /><Download size={24} /><b /></span>
            </div>
            <div className="auth-loading-destination-tabs"><i /><i /><i /></div>
            <div className="auth-loading-destination-row"><FileText size={20} /><span /><em>★</em></div>
            <div className="auth-loading-destination-row"><FileText size={20} /><span /><em>★</em></div>
            <div className="auth-loading-destination-row"><FileText size={20} /><span /><em>★</em></div>
          </section>
        </div>
      </div>

      <section className="auth-loading-card" role="status" aria-live="polite" aria-label={label}>
        <div className="auth-loading-journey" aria-hidden="true">
          <span className="auth-loading-source-document">
            <FileText size={58} strokeWidth={1.35} />
            <b>PDF</b>
          </span>
          <span className="auth-loading-motion-lines"><i /><i /><i /></span>
          <BrandWordmark logo className="auth-loading-brand" />
          <span className="auth-loading-route"><i /><i /><i /><i /><i /><b>›</b></span>
        </div>

        <div className="auth-loading-copy">
          <h1>Opening your workspace</h1>
          <p>Restoring your saved session and documents.</p>
        </div>

        <div className="auth-loading-progress" aria-hidden="true"><span /></div>

        <p className="auth-loading-status">
          <span aria-hidden="true" />
          Checking your saved sign-in
        </p>
      </section>
    </main>
  );
}
