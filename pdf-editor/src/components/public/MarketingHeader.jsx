import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.mjs";
import Menu from "lucide-react/dist/esm/icons/menu.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { ToolIcon } from "../../tools/ToolIcon.jsx";
import { getToolMenuGroups } from "../../tools/toolNavigation.js";

const menuGroups = getToolMenuGroups(2);

export function MarketingHeader() {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setToolsOpen(false);
        setMobileOpen(false);
        setMobileToolsOpen(false);
      }
    };
    const closeOutside = (event) => {
      if (!headerRef.current?.contains(event.target)) setToolsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOutside);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOutside);
    };
  }, []);

  const closeMenus = () => {
    setToolsOpen(false);
    setMobileOpen(false);
    setMobileToolsOpen(false);
  };

  return (
    <header ref={headerRef} className="marketing-header">
      <div className="marketing-header-row">
        <Link className="marketing-brand" to={ROUTE_PATHS.home} onClick={closeMenus} aria-label="FixThatPDF home"><strong>FixThatPDF</strong></Link>
        <nav className="marketing-desktop-nav" aria-label="Public navigation">
          <button type="button" aria-expanded={toolsOpen} aria-controls="tools-mega-menu" onClick={() => setToolsOpen((value) => !value)}>Tools <ChevronDown size={15} /></button>
          <Link to={ROUTE_PATHS.features}>Features</Link>
          <Link to={ROUTE_PATHS.business}>Business</Link>
          <Link to={ROUTE_PATHS.security}>Security</Link>
        </nav>
        <div className="marketing-header-actions">
          <Link className="marketing-login" to={ROUTE_PATHS.login}>Log in</Link>
          <Link className="marketing-primary" to={ROUTE_PATHS.editPdf}>Edit a PDF</Link>
          <button className="marketing-menu-toggle" type="button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>

      {toolsOpen && (
        <div id="tools-mega-menu" className="tools-mega-menu">
          <div className="tools-mega-heading"><div><span>PDF toolkit</span><strong>Choose a clear starting point</strong></div><Link to={ROUTE_PATHS.tools} onClick={closeMenus}>View all 68 tools</Link></div>
          <div className="tools-mega-grid">
            {menuGroups.map((group) => <section key={group.id}><small>{group.menuLabel}</small>{group.tools.map((tool) => <Link key={tool.id} to={tool.route} onClick={closeMenus}><span style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={18} /></span><span><strong>{tool.name}</strong><em>{tool.availabilityLabel}</em></span></Link>)}</section>)}
          </div>
        </div>
      )}

      {mobileOpen && (
        <nav className="marketing-mobile-nav" aria-label="Mobile navigation">
          <button type="button" aria-expanded={mobileToolsOpen} onClick={() => setMobileToolsOpen((value) => !value)}>PDF tools <ChevronDown size={16} /></button>
          {mobileToolsOpen && <div className="marketing-mobile-tools">{menuGroups.map((group) => <section key={group.id}><small>{group.menuLabel}</small>{group.tools.map((tool) => <Link key={tool.id} to={tool.route} onClick={closeMenus}>{tool.name}<span>{tool.status === "coming-soon" ? "Soon" : "Open"}</span></Link>)}</section>)}<Link className="view-all" to={ROUTE_PATHS.tools} onClick={closeMenus}>View all PDF tools</Link></div>}
          <Link to={ROUTE_PATHS.features} onClick={closeMenus}>Features</Link>
          <Link to={ROUTE_PATHS.business} onClick={closeMenus}>Business</Link>
          <Link to={ROUTE_PATHS.security} onClick={closeMenus}>Security</Link>
          <Link to={ROUTE_PATHS.login} onClick={closeMenus}>Log in</Link>
        </nav>
      )}
    </header>
  );
}
