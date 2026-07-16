import { Link } from "react-router-dom";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { FOOTER_TOOL_GROUPS } from "../../tools/toolNavigation.js";

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="marketing-footer-intro"><Link className="marketing-brand" to={ROUTE_PATHS.home}><span><FileText size={20} /></span><strong>RealPDF</strong></Link><p>Edit PDFs online. Completely free, with no watermark or forced signup for supported tools.</p><Link className="marketing-primary" to={ROUTE_PATHS.editPdf}>Choose a PDF</Link></div>
      <div className="marketing-footer-tools">{FOOTER_TOOL_GROUPS.map((group) => <section key={group.label}><small>{group.label}</small>{group.tools.map((tool) => <Link key={tool.id} to={tool.route}>{tool.name}</Link>)}</section>)}</div>
      <div className="marketing-footer-bottom"><span>© 2026 RealPDF</span><nav aria-label="Legal"><Link to={ROUTE_PATHS.privacy}>Privacy</Link><Link to={ROUTE_PATHS.terms}>Terms</Link><Link to={ROUTE_PATHS.help}>Help</Link></nav></div>
    </footer>
  );
}
