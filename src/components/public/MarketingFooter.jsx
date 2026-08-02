import { Link } from "react-router-dom";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { BrandWordmark } from "./BrandWordmark.jsx";
import { PUBLIC_FOOTER_NAVIGATION_GROUPS, PUBLIC_LEGAL_LINKS } from "./publicNavigation.js";

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="marketing-footer-intro"><Link className="marketing-brand" to={ROUTE_PATHS.home} aria-label="PDFEnrich home"><BrandWordmark logo /></Link><p>Free and simple PDF tools, all in one place. No subscriptions, paid plans, or PDFEnrich watermark.</p></div>
      <div className="marketing-footer-tools">{PUBLIC_FOOTER_NAVIGATION_GROUPS.map((group) => <section key={group.title}><small>{group.title}</small>{group.links.map(({ label, to }) => <Link key={label} to={to}>{label}</Link>)}</section>)}</div>
      <div className="marketing-footer-bottom"><span>© 2026 PDFEnrich. All rights reserved.</span><nav aria-label="Footer legal">{PUBLIC_LEGAL_LINKS.map(({ label, to }) => <Link key={label} to={to}>{label}</Link>)}</nav></div>
    </footer>
  );
}
