import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Menu from "lucide-react/dist/esm/icons/menu.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { BrandWordmark } from "./BrandWordmark.jsx";

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
        <Link className="marketing-brand" to={ROUTE_PATHS.home} onClick={closeMenus} aria-label="FixThatPDF home"><BrandWordmark /></Link>
        <nav className="marketing-desktop-nav" aria-label="Public navigation">
          <Link to={ROUTE_PATHS.features}>Features</Link>
          <Link to={ROUTE_PATHS.tools}>All tools</Link>
          <Link to={ROUTE_PATHS.editPdf}>Edit PDF</Link>
          <Link to="/organize-pdf">Organize PDF</Link>
          <Link to={ROUTE_PATHS.signPdf}>Sign PDF</Link>
          <Link to="/pdf-to-jpg">Convert PDF</Link>
          <Link to={ROUTE_PATHS.resources}>Resources</Link>
        </nav>
        <div className="marketing-header-actions">
          <Link className="marketing-login" to={ROUTE_PATHS.login}>Log in</Link>
          <Link className="marketing-primary" to={ROUTE_PATHS.editPdf}>Choose a PDF</Link>
          <button className="marketing-menu-toggle" type="button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="marketing-mobile-nav" aria-label="Mobile navigation">
          <Link to={ROUTE_PATHS.features} onClick={closeMenus}>Features</Link>
          <Link to={ROUTE_PATHS.tools} onClick={closeMenus}>All tools</Link>
          <Link to={ROUTE_PATHS.editPdf} onClick={closeMenus}>Edit PDF</Link>
          <Link to="/organize-pdf" onClick={closeMenus}>Organize PDF</Link>
          <Link to={ROUTE_PATHS.signPdf} onClick={closeMenus}>Sign PDF</Link>
          <Link to="/pdf-to-jpg" onClick={closeMenus}>Convert PDF</Link>
          <Link to={ROUTE_PATHS.resources} onClick={closeMenus}>Resources</Link>
          <Link to={ROUTE_PATHS.privacy} onClick={closeMenus}>Privacy</Link>
          <Link to={ROUTE_PATHS.login} onClick={closeMenus}>Log in</Link>
        </nav>
      )}
    </header>
  );
}
