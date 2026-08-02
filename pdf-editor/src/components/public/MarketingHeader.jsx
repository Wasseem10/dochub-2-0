import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Menu from "lucide-react/dist/esm/icons/menu.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { BrandWordmark } from "./BrandWordmark.jsx";
import { PUBLIC_PRIMARY_NAV_LINKS } from "./publicNavigation.js";

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    const closeOutside = (event) => {
      if (!headerRef.current?.contains(event.target)) setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOutside);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOutside);
    };
  }, []);

  const closeMenus = () => {
    setMobileOpen(false);
  };

  return (
    <header ref={headerRef} className="marketing-header">
      <div className="marketing-header-row">
        <Link className="marketing-brand" to={ROUTE_PATHS.home} onClick={closeMenus} aria-label="PDFEnrich home"><BrandWordmark logo /></Link>
        <nav className="marketing-desktop-nav" aria-label="Public navigation">{PUBLIC_PRIMARY_NAV_LINKS.map(({ label, to }) => <Link key={label} to={to}>{label}</Link>)}</nav>
        <div className="marketing-header-actions">
          <Link className="marketing-login" to={ROUTE_PATHS.login}>Log in</Link>
          <Link className="marketing-primary" to={ROUTE_PATHS.editPdf}>Use for free</Link>
          <button className="marketing-menu-toggle" type="button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="marketing-mobile-nav" aria-label="Mobile navigation">
          {PUBLIC_PRIMARY_NAV_LINKS.map(({ label, to }) => <Link key={label} to={to} onClick={closeMenus}>{label}</Link>)}
          <Link to={ROUTE_PATHS.login} onClick={closeMenus}>Log in</Link>
          <Link className="marketing-primary" to={ROUTE_PATHS.editPdf} onClick={closeMenus}>Use for free</Link>
        </nav>
      )}
    </header>
  );
}
