import { useEffect, useState } from "react";
import {
  globalPrivacyControlEnabled,
  PRIVACY_CHOICE_EVENT,
  readPrivacyChoices,
  savePrivacyChoices,
} from "../../privacy/privacyChoices.js";

function usePrivacyChoice() {
  const [choice, setChoice] = useState(() => readPrivacyChoices());
  useEffect(() => {
    const update = (event) => setChoice(event.detail || readPrivacyChoices());
    window.addEventListener(PRIVACY_CHOICE_EVENT, update);
    return () => window.removeEventListener(PRIVACY_CHOICE_EVENT, update);
  }, []);
  const choose = (analytics) => setChoice(savePrivacyChoices({ analytics }));
  return { choice, choose };
}

function useActiveEditor() {
  const [active, setActive] = useState(() => typeof document !== "undefined" && Boolean(document.querySelector("main.editor-shell")));
  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return undefined;
    const update = () => setActive(Boolean(document.querySelector("main.editor-shell")));
    const observer = new MutationObserver(update);
    observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
    update();
    return () => observer.disconnect();
  }, []);
  return active;
}

export function PrivacyConsentBanner() {
  const { choice, choose } = usePrivacyChoice();
  const activeEditor = useActiveEditor();
  if (choice || activeEditor) return null;
  return (
    <aside className="privacy-consent" role="region" aria-labelledby="privacy-consent-title" aria-describedby="privacy-consent-copy">
      <div>
        <strong id="privacy-consent-title">Your privacy choices</strong>
        <p id="privacy-consent-copy">Essential storage runs PDFEnrich. Optional analytics never include document contents, file names, signatures, or form answers.</p>
        <a href="/privacy#choices">Read the Privacy Policy</a>
      </div>
      <div className="privacy-consent-actions">
        <button type="button" className="is-secondary" onClick={() => choose(false)}>Reject optional analytics</button>
        <button type="button" className="is-primary" onClick={() => choose(true)}>Allow analytics</button>
      </div>
    </aside>
  );
}

export function PrivacyChoicePanel() {
  const { choice, choose } = usePrivacyChoice();
  const gpcEnabled = globalPrivacyControlEnabled();
  const status = gpcEnabled
    ? "Off — Global Privacy Control detected"
    : choice?.analytics === true
      ? "On"
      : choice?.analytics === false
        ? "Off"
        : "Not selected";
  return (
    <section className="privacy-choice-panel" id="choices" aria-labelledby="privacy-choice-title">
      <div>
        <span>Optional analytics</span>
        <h2 id="privacy-choice-title">Choose what leaves this browser</h2>
        <p>Essential storage keeps documents, account sessions, and security controls working. Optional analytics record limited product events only after you allow them.</p>
      </div>
      <div className="privacy-choice-status" aria-live="polite">
        <small>Current setting</small>
        <strong>{status}</strong>
      </div>
      <div className="privacy-choice-actions">
        <button type="button" onClick={() => choose(false)}>Keep analytics off</button>
        <button type="button" className="is-primary" disabled={gpcEnabled} onClick={() => choose(true)}>Allow optional analytics</button>
      </div>
      {gpcEnabled && <p className="privacy-gpc-note">Your browser is sending Global Privacy Control, so PDFEnrich keeps optional analytics off.</p>}
    </section>
  );
}
